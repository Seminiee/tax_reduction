import { describe, expect, it } from "vitest";
import { calculateDividend } from "./dividend-calculator";

describe("비과세 한도 이내 케이스", () => {
  it("ISA는 세금이 없고, 일반계좌는 15.4% 고정으로 과세된다", () => {
    const result = calculateDividend({
      stockName: "코카콜라",
      quantity: 10,
      dividendPerShareKrw: 100_000,
      isaType: "general",
    });

    expect(result.totalDividendKrw).toBe(1_000_000);
    expect(result.isaDividendTaxKrw).toBe(0);
    expect(result.generalDividendTaxKrw).toBeCloseTo(154_000, 2);
    expect(result.taxSavingKrw).toBeCloseTo(154_000, 2);
  });
});

describe("비과세 한도 초과 케이스 (otherFinancialIncomeKrw 없음)", () => {
  it("ISA는 초과분에만 9.9%, 일반계좌는 전액 15.4% 고정으로 과세된다", () => {
    const result = calculateDividend({
      stockName: "AT&T",
      quantity: 100,
      dividendPerShareKrw: 50_000,
      isaType: "general",
    });

    expect(result.totalDividendKrw).toBe(5_000_000);
    expect(result.isComprehensiveTaxationTriggered).toBe(false);
    expect(result.isaDividendTaxKrw).toBeCloseTo(297_000, 2);
    expect(result.generalDividendTaxKrw).toBeCloseTo(770_000, 2);
    expect(result.taxSavingKrw).toBeCloseTo(473_000, 2);
  });
});

describe("otherFinancialIncomeKrw로 종합과세 대상이 되는 케이스", () => {
  it("총 금융소득이 기준을 넘으면 브래킷 한계세율이 초과분에 적용된다", () => {
    const result = calculateDividend({
      stockName: "리얼티인컴",
      quantity: 250,
      dividendPerShareKrw: 100_000,
      isaType: "general",
      otherFinancialIncomeKrw: 1_000_000,
    });

    expect(result.totalDividendKrw).toBe(25_000_000);
    expect(result.isComprehensiveTaxationTriggered).toBe(true);
    expect(result.marginalTaxRateApplied).toBeCloseTo(0.15, 6);
    expect(result.generalDividendTaxKrw).toBeCloseTo(3_830_000, 2);
    expect(result.isaDividendTaxKrw).toBeCloseTo(2_277_000, 2);
    expect(result.taxSavingKrw).toBeCloseTo(1_553_000, 2);
  });
});

describe("일반계좌가 더 유리한 케이스가 존재하는지 검증", () => {
  it("한계세율이 최고 구간(45%)까지 올라가도 일반계좌 세금이 ISA보다 낮아지지 않는다", () => {
    // 일반계좌의 최저 실효세율(현지 원천징수 15%)이 ISA의 초과분 분리과세율(9.9%)보다
    // 항상 높고 ISA는 추가로 비과세 한도까지 있어, 배당금 단독 비교에서는 일반계좌가
    // 더 유리해지는 세율 조합이 존재하지 않는다(수학적으로 증명 가능 — PROGRESS.md 참고).
    const result = calculateDividend({
      stockName: "고배당 ETF",
      quantity: 1_000,
      dividendPerShareKrw: 100_000,
      isaType: "general",
      otherFinancialIncomeKrw: 2_000_000_000,
    });

    expect(result.marginalTaxRateApplied).toBeCloseTo(0.45, 6);
    expect(result.taxSavingKrw).toBeGreaterThanOrEqual(0);
  });
});

describe("경계값: quantity가 0이면 배당금도 0", () => {
  it("양쪽 계좌 모두 세금과 실수령액이 0으로 동일하다", () => {
    const result = calculateDividend({
      stockName: "무배당 성장주",
      quantity: 0,
      dividendPerShareKrw: 100_000,
      isaType: "general",
    });

    expect(result.totalDividendKrw).toBe(0);
    expect(result.generalDividendTaxKrw).toBe(0);
    expect(result.isaDividendTaxKrw).toBe(0);
    expect(result.taxSavingKrw).toBe(0);
    expect(result.generalNetReceivedKrw).toBe(0);
    expect(result.isaNetReceivedKrw).toBe(0);
  });
});
