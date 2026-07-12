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
  verificationStatus:
    "일부 세부 사항은 아직 확정되지 않았으니 투자 결정 전 최신 공지를 확인하시기 바랍니다.",
};

// Stage 21/22: `/`로 통합된 매매차익 계산기 결과 해설(v2→v3) 스모크 입력.
// 한도초과 케이스 — Stage 21 v2에서 AI가 generalForcedTaxKrw(89,100원, 27주 실제 세금)를
// generalOnlyTaxKrw(660,000원, 전량 일반계좌 가정 시 가상 세금)와 혼동해 서술한 문제가
// 발견된 시나리오와 완전히 동일하다(PROMPTS.md 2절 v2/v3 원문 참고).
const SAMPLE_TRADE_INPUT_EXCEEDING_LIMIT: ExplainSimulationInput = {
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
    annualContributionLimitKrw: 20_000_000,
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
  verificationStatus:
    "일부 세부 사항은 아직 확정되지 않았으니 투자 결정 전 최신 공지를 확인하시기 바랍니다.",
};

// Stage 22: 한도 이내(연간 납입한도 2,000만원 미만) 일반 케이스 회귀 확인용 — 이 케이스는
// generalForcedTaxKrw/generalOnlyTaxKrw 혼동 위험이 애초에 없다(generalQuantity=0).
const SAMPLE_TRADE_INPUT_WITHIN_LIMIT: ExplainSimulationInput = {
  kind: "trade",
  input: {
    stockName: "나스닥 100 ETF",
    currentPriceKrw: 115_000,
    expectedProfitPerShareKrw: 15_000,
    expectedLossPerShareKrw: 0,
    quantity: 100,
    isaType: "general",
  },
  result: {
    totalInvestKrw: 11_500_000,
    annualContributionLimitKrw: 20_000_000,
    isExceedingContributionLimit: false,
    isaQuantity: 100,
    generalQuantity: 0,
    taxFreeLimitKrw: 2_000_000,
    netGainForIsaKrw: 1_500_000,
    isaTaxKrw: 0,
    generalForcedTaxKrw: 0,
    generalOnlyTaxKrw: 0,
    totalTaxKrw: 0,
    savedAmountKrw: 0,
  },
  verificationStatus:
    "일부 세부 사항은 아직 확정되지 않았으니 투자 결정 전 최신 공지를 확인하시기 바랍니다.",
};

describe.skipIf(!shouldRun)("explainSimulationResult 스모크 테스트 (실제 API 호출)", () => {
  it("kind: hold — 조건부 표현이 포함된 한국어 해설을 생성한다", async () => {
    const result = await explainSimulationResult(SAMPLE_INPUT);

    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain("무조건");
  }, 30_000);

  // Stage 22/23: generalOnlyTaxKrw/generalForcedTaxKrw 혼동, taxFreeLimitKrw/
  // annualContributionLimitKrw 혼동 여부는 모두 "숫자가 어느 문맥에서 어떤 크기로 등장하는지"
  // 같은 의미론적 판단이 필요해 자동 assertion만으로 완전히 검증하기 어렵다. 그래서 응답 원문을
  // 콘솔에 로그로 남기고, PROMPTS.md 2절 v3/v4에 사람이 문장 단위로 직접 읽고 (1) 두 세금
  // 필드가 혼동되지 않았는지, (2) "비과세 한도"가 언급된 모든 문장이 taxFreeLimitKrw(200만원 등)를
  // 정확히 참조하고 annualContributionLimitKrw(2,000만원)와 섞이지 않았는지를 확인한 기록을
  // 남겼다(이 테스트 실행 시점의 응답이 아니라 PROMPTS.md에 박제된 응답을 기준으로 확인했으므로,
  // 재실행 시 응답이 달라질 수 있다는 점에 유의 — 매 실행마다 사람이 다시 읽고 확인하는 것을 권장한다).
  it("kind: trade, 한도초과 케이스 — 응답을 로그로 남기고 사람이 직접 확인한다 (Stage 22/23)", async () => {
    const result = await explainSimulationResult(SAMPLE_TRADE_INPUT_EXCEEDING_LIMIT);

    console.log("[Stage 23 스모크 — 한도초과 케이스 실제 응답]\n" + result);

    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain("무조건");
  }, 30_000);

  it("kind: trade, 한도 이내 일반 케이스 — 여전히 정상 동작한다 (Stage 22 회귀 확인)", async () => {
    const result = await explainSimulationResult(SAMPLE_TRADE_INPUT_WITHIN_LIMIT);

    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain("무조건");
  }, 30_000);
});
