import { describe, expect, it } from "vitest";
import { calculateTrade } from "./trade-calculator";

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
    expect(result.generalOnlyTaxKrw).toBeCloseTo(1_650_000, 2);
    expect(result.savedAmountKrw).toBeCloseTo(858_000, 2);
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
    expect(result.generalOnlyTaxKrw).toBeCloseTo(110_000, 2);
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
  it("한도를 넘는 수량은 일반계좌 규칙(22%+기본공제)으로 강제 전환된다", () => {
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
    expect(result.generalForcedTaxKrw).toBeCloseTo(330_000, 2);
    expect(result.totalTaxKrw).toBeCloseTo(924_000, 2);
    expect(result.generalOnlyTaxKrw).toBeCloseTo(2_090_000, 2);
    expect(result.savedAmountKrw).toBeCloseTo(1_166_000, 2);
  });
});
