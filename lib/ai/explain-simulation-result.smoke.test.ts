import { describe, expect, it } from "vitest";
import { explainSimulationResult, type ExplainSimulationInput } from "./explain-simulation-result";

// 실제 Anthropic API를 호출하는 수동 스모크 테스트. 기본 `npm run test`에서는 항상 스킵된다.
// 수동 실행 방법은 README.md 참고.
const shouldRun = process.env.RUN_AI_SMOKE_TEST === "1" && !!process.env.ANTHROPIC_API_KEY;

const SAMPLE_INPUT: ExplainSimulationInput = {
  kind: "hold",
  input: { principalKrw: 10_000_000, annualReturnRate: 0.08, holdingYears: 5, isaType: "general" },
  generalAccount: {
    finalAfterTaxValue: 14_210_759,
    totalTax: 482_522,
    capitalGainsTax: 482_522,
    totalDividendTax: 0,
  },
  isaAccount: {
    finalAfterTaxValue: 14_426_646,
    tax: 266_635,
    isEarlyWithdrawal: false,
    taxableExcess: 2_693_281,
    taxFreeLimitKrw: 2_000_000,
  },
  verificationStatus: "미검증 초안 — 국세청/금융투자협회 최신 공지로 재확인 필요",
};

// Stage 21: `/`로 통합된 매매차익 계산기 결과 해설(v2) 스모크 입력.
const SAMPLE_TRADE_INPUT: ExplainSimulationInput = {
  kind: "trade",
  input: {
    stockName: "나스닥 100 ETF",
    currentPriceKrw: 115_000,
    expectedProfitPerShareKrw: 15_000,
    expectedLossPerShareKrw: 0,
    quantity: 200,
    isaType: "general",
  },
  result: {
    totalInvestKrw: 23_000_000,
    isExceedingContributionLimit: true,
    isaQuantity: 173,
    generalQuantity: 27,
    taxFreeLimitKrw: 2_000_000,
    netGainForIsaKrw: 2_595_000,
    isaTaxKrw: 58_905,
    generalForcedTaxKrw: 89_100,
    generalOnlyTaxKrw: 660_000,
    totalTaxKrw: 148_005,
    savedAmountKrw: 511_995,
  },
  verificationStatus: "미검증 초안 — 국세청/금융투자협회 최신 공지로 재확인 필요",
};

describe.skipIf(!shouldRun)("explainSimulationResult 스모크 테스트 (실제 API 호출)", () => {
  it("kind: hold — 조건부 표현이 포함된 한국어 해설을 생성한다", async () => {
    const result = await explainSimulationResult(SAMPLE_INPUT);

    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain("무조건");
  }, 30_000);

  it("kind: trade — 조건부 표현이 포함된 한국어 해설을 생성한다 (Stage 21 v2)", async () => {
    const result = await explainSimulationResult(SAMPLE_TRADE_INPUT);

    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain("무조건");
  }, 30_000);
});
