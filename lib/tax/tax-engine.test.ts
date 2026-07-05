import { describe, expect, it } from "vitest";
import { simulateGeneralAccount } from "./general-account";
import { simulateIsaAccount } from "./isa-account";
import { findIsaThresholdPrincipal } from "./threshold";

describe("시세차익만 있고 배당 없는 성장주 케이스 (직투 vs ISA)", () => {
  const input = {
    principalKrw: 10_000_000,
    annualReturnRate: 0.08,
    annualDividendYieldRate: 0,
    holdingYears: 5,
  };

  it("일반계좌: 배당세는 0이고, 매매차익에만 기본공제 후 22%가 과세된다", () => {
    const result = simulateGeneralAccount({
      ...input,
      marginalTaxRateForComprehensiveIncome: 0.4,
    });

    expect(result.totalDividendTax).toBe(0);
    expect(result.realizedCapitalGain).toBeCloseTo(4_693_280.768, 2);
    expect(result.capitalGainsTax).toBeCloseTo(482_521.769, 2);
    expect(result.finalAfterTaxValue).toBeCloseTo(
      result.finalBalanceBeforeTax - result.capitalGainsTax,
      6
    );
  });

  it("ISA계좌: 비과세 한도 이내 초과분에 9.9% 분리과세가 적용된다", () => {
    const result = simulateIsaAccount({ ...input, isaType: "general" });

    expect(result.isEarlyWithdrawal).toBe(false);
    expect(result.netGain).toBeCloseTo(4_693_280.768, 2);
    expect(result.taxableExcess).toBeCloseTo(2_693_280.768, 2);
    expect(result.tax).toBeCloseTo(266_634.796, 2);
  });
});

describe("손실이 발생한 케이스 (손익통산 효과 검증)", () => {
  const input = {
    principalKrw: 10_000_000,
    annualReturnRate: -0.05,
    annualDividendYieldRate: 0,
    holdingYears: 3,
  };

  it("일반계좌: 손실에는 세금이 부과되지 않는다 (음수 세액 없음)", () => {
    const result = simulateGeneralAccount({
      ...input,
      marginalTaxRateForComprehensiveIncome: 0.4,
    });

    expect(result.finalBalanceBeforeTax).toBeCloseTo(8_573_750, 2);
    expect(result.realizedCapitalGain).toBeLessThan(0);
    expect(result.taxableCapitalGain).toBe(0);
    expect(result.capitalGainsTax).toBe(0);
    expect(result.finalAfterTaxValue).toBeCloseTo(result.finalBalanceBeforeTax, 6);
  });

  it("ISA계좌: 손실에는 세금이 부과되지 않는다", () => {
    const result = simulateIsaAccount({ ...input, isaType: "general" });

    expect(result.netGain).toBeLessThan(0);
    expect(result.taxableExcess).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.finalAfterTaxValue).toBeCloseTo(result.finalBalanceBeforeTax, 6);
  });
});

describe("ISA 비과세 한도를 초과하는 고수익 케이스", () => {
  it("한도 초과분에만 9.9% 분리과세가 적용된다", () => {
    const result = simulateIsaAccount({
      principalKrw: 50_000_000,
      annualReturnRate: 0.15,
      annualDividendYieldRate: 0,
      holdingYears: 5,
      isaType: "general",
    });

    expect(result.netGain).toBeCloseTo(50_567_859.375, 1);
    expect(result.taxableExcess).toBeCloseTo(48_567_859.375, 1);
    expect(result.tax).toBeCloseTo(4_808_218.078, 1);
    expect(result.finalAfterTaxValue).toBeCloseTo(
      result.finalBalanceBeforeTax - result.tax,
      6
    );
  });
});

describe("3년 미만 중도해지 케이스 (ISA 혜택 취소)", () => {
  it("비과세 한도/분리과세 대신 15.4% 일반과세가 전액 적용된다", () => {
    const result = simulateIsaAccount({
      principalKrw: 10_000_000,
      annualReturnRate: 0.08,
      annualDividendYieldRate: 0,
      holdingYears: 2,
      isaType: "general",
    });

    expect(result.isEarlyWithdrawal).toBe(true);
    expect(result.taxableExcess).toBe(0);
    expect(result.netGain).toBeCloseTo(1_664_000, 2);
    expect(result.tax).toBeCloseTo(256_256, 2);
  });
});

describe("금융소득종합과세 대상자(연 금융소득 2천만원 초과) 케이스", () => {
  it("기준 초과분은 분리과세 대신 한계세율로 과세되고, 이하분은 그대로 분리과세된다", () => {
    const result = simulateGeneralAccount({
      principalKrw: 500_000_000,
      annualReturnRate: 0.08,
      annualDividendYieldRate: 0.06,
      holdingYears: 1,
      marginalTaxRateForComprehensiveIncome: 0.42,
    });

    const [year1] = result.yearlyBreakdown;
    expect(year1.dividendIncome).toBeCloseTo(30_000_000, 2);
    expect(year1.isComprehensiveTaxationTriggered).toBe(true);
    expect(year1.domesticDividendTax).toBeCloseTo(2_780_000, 2);
    expect(result.totalDividendTax).toBeCloseTo(7_280_000, 2);
    expect(result.capitalGainsTax).toBeCloseTo(1_650_000, 2);
  });

  it("기준 이하일 때는 종합과세가 트리거되지 않는다 (대조군)", () => {
    const result = simulateGeneralAccount({
      principalKrw: 100_000_000,
      annualReturnRate: 0.08,
      annualDividendYieldRate: 0.06,
      holdingYears: 1,
      marginalTaxRateForComprehensiveIncome: 0.42,
    });

    const [year1] = result.yearlyBreakdown;
    expect(year1.dividendIncome).toBeCloseTo(6_000_000, 2);
    expect(year1.isComprehensiveTaxationTriggered).toBe(false);
  });
});

describe("findIsaThresholdPrincipal 역산 정확성 + growthFactor 경계 케이스", () => {
  it("역산된 투자금액으로 시뮬레이션하면 실현 수익이 비과세 한도와 일치한다", () => {
    const taxFreeLimitKrw = 2_000_000;
    const annualReturnRate = 0.08;
    const holdingYears = 5;

    const result = findIsaThresholdPrincipal({
      annualReturnRate,
      holdingYears,
      taxFreeLimitKrw,
    });

    expect(result.kind).toBe("found");
    if (result.kind !== "found") return;

    expect(result.thresholdPrincipalKrw).toBeCloseTo(4_261_411.364, 2);

    const simulation = simulateIsaAccount({
      principalKrw: result.thresholdPrincipalKrw,
      annualReturnRate,
      annualDividendYieldRate: 0,
      holdingYears,
      isaType: "general",
    });

    expect(simulation.netGain).toBeCloseTo(taxFreeLimitKrw, 2);
  });

  it("연수익률이 0%면 growthFactor가 0이라 threshold가 존재하지 않는다", () => {
    const result = findIsaThresholdPrincipal({
      annualReturnRate: 0,
      holdingYears: 5,
      taxFreeLimitKrw: 2_000_000,
    });

    expect(result.kind).toBe("no-threshold-non-positive-growth");
  });

  it("연수익률이 음수면 growthFactor도 음수라 threshold가 존재하지 않는다", () => {
    const result = findIsaThresholdPrincipal({
      annualReturnRate: -0.05,
      holdingYears: 5,
      taxFreeLimitKrw: 2_000_000,
    });

    expect(result.kind).toBe("no-threshold-non-positive-growth");
  });
});
