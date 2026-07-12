import { describe, expect, it } from "vitest";
import { calculateTrade } from "./trade-calculator";
import { calculateDividend } from "./dividend-calculator";

describe("이익만 있는 케이스 (손실 없음)", () => {
  it("납입한도 이내이고 비과세한도를 초과하면 초과분에만 9.9%가 붙는다", () => {
    const result = calculateTrade({
      currentPriceKrw: 100_000,
      expectedProfitPerShareKrw: 50_000,
      expectedLossPerShareKrw: 0,
      quantity: 200,
      isaType: "general",
    });

    expect(result.totalInvestKrw).toBe(20_000_000);
    expect(result.isExceedingContributionLimit).toBe(false);
    expect(result.isaQuantity).toBe(200);
    expect(result.generalQuantity).toBe(0);
    expect(result.netGainForIsaKrw).toBe(10_000_000);
    expect(result.isaTaxKrw).toBeCloseTo(792_000, 2);
    expect(result.generalForcedTaxKrw).toBe(0);
    // Stage 27: 일반계좌 세율이 22%+250만원 공제에서 15.4% 배당소득세로 바뀌면서
    // 순이익 1,000만원(임계값 2,000만원 미만)에는 플랫 15.4%가 그대로 적용된다.
    expect(result.generalOnlyTaxKrw).toBeCloseTo(1_540_000, 2);
    expect(result.savedAmountKrw).toBeCloseTo(748_000, 2);
  });
});

describe("손익통산 케이스 (이익+손실 동시 발생)", () => {
  it("ISA 순이익은 이익-손실 상계 후 금액이며, 상계 전 이익 총액보다 훨씬 작다", () => {
    const result = calculateTrade({
      currentPriceKrw: 100_000,
      expectedProfitPerShareKrw: 45_000,
      expectedLossPerShareKrw: 30_000,
      quantity: 200,
      isaType: "general",
    });

    const grossProfitWithoutNetting = 45_000 * 200;
    expect(result.netGainForIsaKrw).toBe(3_000_000);
    expect(result.netGainForIsaKrw).toBeLessThan(grossProfitWithoutNetting);
    expect(result.isaTaxKrw).toBeCloseTo(99_000, 2);
    // Stage 27: 순이익 300만원 × 15.4% = 462,000원(임계값 미만, 플랫 세율).
    expect(result.generalOnlyTaxKrw).toBeCloseTo(462_000, 2);
  });

  it("손실이 이익보다 크면 순이익은 0이 되고 세금도 0이다", () => {
    const result = calculateTrade({
      currentPriceKrw: 50_000,
      expectedProfitPerShareKrw: 5_000,
      expectedLossPerShareKrw: 20_000,
      quantity: 100,
      isaType: "general",
    });

    expect(result.netGainForIsaKrw).toBe(0);
    expect(result.isaTaxKrw).toBe(0);
    expect(result.generalOnlyTaxKrw).toBe(0);
    expect(result.savedAmountKrw).toBe(0);
  });
});

describe("ISA 비과세한도 초과 케이스", () => {
  it("서민형(400만원 한도)도 순이익이 한도를 넘으면 초과분에 9.9%가 붙는다", () => {
    const result = calculateTrade({
      currentPriceKrw: 80_000,
      expectedProfitPerShareKrw: 100_000,
      expectedLossPerShareKrw: 0,
      quantity: 100,
      isaType: "low_income",
    });

    expect(result.taxFreeLimitKrw).toBe(4_000_000);
    expect(result.netGainForIsaKrw).toBe(10_000_000);
    expect(result.isaTaxKrw).toBeCloseTo(594_000, 2);
  });
});

describe("연간 납입한도 초과로 ISA/일반계좌 분할되는 케이스", () => {
  it("한도를 넘는 수량은 일반계좌 규칙(15.4% 배당소득세 + 한계세율)으로 강제 전환된다", () => {
    const result = calculateTrade({
      currentPriceKrw: 100_000,
      expectedProfitPerShareKrw: 40_000,
      expectedLossPerShareKrw: 0,
      quantity: 300,
      isaType: "general",
    });

    expect(result.totalInvestKrw).toBe(30_000_000);
    expect(result.isExceedingContributionLimit).toBe(true);
    expect(result.isaQuantity).toBe(200);
    expect(result.generalQuantity).toBe(100);
    expect(result.netGainForIsaKrw).toBe(8_000_000);
    expect(result.isaTaxKrw).toBeCloseTo(594_000, 2);
    // Stage 27: 강제전환분 순이익 400만원(임계값 미만) × 15.4% = 616,000원.
    expect(result.isComprehensiveTaxationTriggered).toBe(false);
    expect(result.marginalTaxRateApplied).toBeCloseTo(0.154, 6);
    expect(result.generalForcedTaxKrw).toBeCloseTo(616_000, 2);
    expect(result.totalTaxKrw).toBeCloseTo(1_210_000, 2);
    // 전량 일반계좌 가정 시 순이익 1,200만원(임계값 미만) × 15.4% = 1,848,000원.
    expect(result.generalOnlyTaxKrw).toBeCloseTo(1_848_000, 2);
    expect(result.savedAmountKrw).toBeCloseTo(638_000, 2);
  });
});

describe("금융소득종합과세 임계값(2,000만원) 초과로 한계세율이 적용되는 케이스 (Stage 27 신규)", () => {
  it("강제전환분 순이익이 2,000만원을 넘으면 한계세율이 적용된다", () => {
    // price=10,000, qty=3,000 -> totalInvest=30,000,000(한도초과), isaQuantity=2,000,
    // generalQuantity=1,000. 강제전환분 순이익 = profit(30,000)*1,000 = 30,000,000(임계값 초과).
    const result = calculateTrade({
      currentPriceKrw: 10_000,
      expectedProfitPerShareKrw: 30_000,
      expectedLossPerShareKrw: 0,
      quantity: 3_000,
      isaType: "general",
    });

    expect(result.isExceedingContributionLimit).toBe(true);
    expect(result.isaQuantity).toBe(2_000);
    expect(result.generalQuantity).toBe(1_000);
    expect(result.isComprehensiveTaxationTriggered).toBe(true);
    // resolveMarginalIncomeTaxRate(30,000,000) -> 14,000,001~50,000,000 구간 -> 15%
    expect(result.marginalTaxRateApplied).toBeCloseTo(0.15, 6);
  });
});

describe("invariant: 동일 순이익에 대해 dividend-calculator와 trade-calculator의 일반계좌 세금이 정확히 같다 (Stage 27)", () => {
  it("두 계산기 모두 applyGeneralDividendTax를 재사용하므로 같은 금액에는 같은 세금이 나온다", () => {
    // 임계값(2,000만원)을 넘겨 한계세율 분기까지 함께 검증한다.
    const netGainKrw = 25_000_000;

    const dividendResult = calculateDividend({
      stockName: "테스트",
      quantity: 1,
      dividendPerShareKrw: netGainKrw,
      isaType: "general",
    });

    // price=1, quantity=1로 두면 totalInvestKrw=1이라 연간 납입한도에 전혀 걸리지 않아
    // 전량이 isaQuantity로 잡힌다 — netGainAllGeneralKrw(전량 일반계좌 가정)가 곧 순이익 전체와 같다.
    const tradeResult = calculateTrade({
      currentPriceKrw: 1,
      expectedProfitPerShareKrw: netGainKrw,
      expectedLossPerShareKrw: 0,
      quantity: 1,
      isaType: "general",
    });

    expect(tradeResult.generalOnlyTaxKrw).toBeCloseTo(dividendResult.generalDividendTaxKrw, 2);
    expect(tradeResult.generalOnlyTaxKrw).toBeCloseTo(3_830_000, 2);
  });
});

describe("일반계좌가 더 유리한 케이스가 존재하는지 검증 (Stage 27)", () => {
  it("한계세율이 최고 구간(45%)까지 올라가도 일반계좌(강제전환분 포함) 세금이 ISA 조합보다 낮아지지 않는다", () => {
    // price=100,000, qty=100,000 -> 강제전환분 순이익 약 49.9억원(1억원 초과 구간, 45% 한계세율)
    const result = calculateTrade({
      currentPriceKrw: 100_000,
      expectedProfitPerShareKrw: 50_000,
      expectedLossPerShareKrw: 0,
      quantity: 100_000,
      isaType: "general",
    });

    expect(result.marginalTaxRateApplied).toBeCloseTo(0.45, 6);
    // savedAmountKrw는 Math.max(0, ...)로 클램프되어 있어 항상 0 이상이므로, 클램프 이전 값인
    // generalOnlyTaxKrw >= totalTaxKrw를 직접 비교해야 실제 역전 여부를 의미 있게 검증할 수 있다.
    expect(result.generalOnlyTaxKrw).toBeGreaterThanOrEqual(result.totalTaxKrw);
  });
});

