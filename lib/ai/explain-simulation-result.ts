import Anthropic from "@anthropic-ai/sdk";
import { HAIKU_MODEL } from "./model";

export { HAIKU_MODEL };

// Stage 4: 거치식(/였던 지금의 dead-code TaxSimulator) 결과 해설 입력.
export interface HoldExplainInput {
  kind: "hold";
  input: {
    principalKrw: number;
    annualReturnRate: number;
    holdingYears: number;
    isaType: string;
  };
  generalAccount: {
    finalAfterTaxValue: number;
    totalTax: number;
    capitalGainsTax: number;
    totalDividendTax: number;
  };
  isaAccount: {
    finalAfterTaxValue: number;
    tax: number;
    isEarlyWithdrawal: boolean;
    taxableExcess: number;
    taxFreeLimitKrw: number;
  };
  verificationStatus: string;
}

// Stage 21: `/`로 통합된 매매차익 계산기(trade-calculator.ts) 결과 해설 입력.
export interface TradeExplainInput {
  kind: "trade";
  input: {
    stockName: string;
    currentPriceKrw: number;
    expectedProfitPerShareKrw: number;
    expectedLossPerShareKrw: number;
    quantity: number;
    isaType: string;
  };
  result: {
    totalInvestKrw: number;
    /** Stage 23: 이전까지 payload에서 아예 누락되어 있었다(taxFreeLimitKrw 혼동의 근본 원인). */
    annualContributionLimitKrw: number;
    isExceedingContributionLimit: boolean;
    isaQuantity: number;
    generalQuantity: number;
    taxFreeLimitKrw: number;
    netGainForIsaKrw: number;
    isaTaxKrw: number;
    generalForcedTaxKrw: number;
    generalOnlyTaxKrw: number;
    totalTaxKrw: number;
    savedAmountKrw: number;
  };
  verificationStatus: string;
}

// ChatCurrentSimulation(lib/ai/chat-with-tax-assistant.ts)과 동일한 kind 판별 유니언 패턴.
export type ExplainSimulationInput = HoldExplainInput | TradeExplainInput;

// v1 (Stage 4): 거치식 결과 해설. kind 필드가 없던 시절의 원문은 PROMPTS.md에 이력으로 보존.
// 실사용 원문은 PROMPTS.md에도 동일하게 기록되어 있다 (지원서 제출용, 수정 시 함께 갱신할 것).
export const EXPLAIN_SYSTEM_PROMPT_HOLD = `당신은 세금 시뮬레이션 결과를 설명하는 한국어 해설가입니다. 아래 규칙을 반드시 지키세요.

1. 결과 JSON을 근거로 왜 이런 세후 금액 차이가 나오는지 설명하세요. 손익통산, 비과세 한도, 분리과세, 종합과세 중 실제로 관련 있는 키워드를 최소 1개 포함하세요.
2. 3~5문장의 한국어로 작성하세요.
3. "무조건 ISA로 가세요", "반드시 ~하세요" 같은 확정적 조언은 절대 쓰지 마세요. 항상 "이 조건에서는 ~", "~일 때는 ~" 같은 조건부 표현을 쓰세요.
4. verificationStatus에 "미검증"이라는 표현이 포함되어 있다면, 설명 마지막에 세율이 아직 최종 확인되지 않았다는 점을 자연스러운 한 문장으로 언급하세요.
5. 순수 텍스트만 반환하세요. 마크다운이나 JSON으로 감싸지 마세요.`;

// v4 (Stage 23): taxFreeLimitKrw(ISA 비과세 한도, "수익" 기준, 200/400만원)와
// annualContributionLimitKrw(ISA 연간 납입한도, "투자 원금" 기준, 2,000만원)를 AI가 서술 중
// 혼동하는 문제가 Stage 22 실제 응답에서 발견되어(PROMPTS.md 2절 v3 응답 예시 참고), 두 필드를
// 명확히 구분하라는 규칙 7을 추가했다. 근본 원인은 annualContributionLimitKrw 자체가 payload에
// 아예 누락되어 있어 AI가 실제 숫자 없이 시스템 프롬프트의 "2,000만원" 텍스트만으로 유추해야
// 했던 것 — payload에 이 필드를 추가하는 것으로 함께 고쳤다(아래 TRADE_RESULT_FIELD_DESCRIPTIONS).
// v1(Stage 4)/v2(Stage 21)/v3(Stage 22) 원문은 PROMPTS.md에 이력으로 보존.
export const EXPLAIN_SYSTEM_PROMPT_TRADE = `당신은 세금 시뮬레이션 결과를 설명하는 한국어 해설가입니다. 아래 규칙을 반드시 지키세요.

1. 결과 JSON을 근거로 왜 이런 세후 금액 차이가 나오는지 설명하세요. 손익통산, 비과세 한도, 분리과세, 종합과세 중 실제로 관련 있는 키워드를 최소 1개 포함하세요.
2. 3~5문장의 한국어로 작성하세요.
3. "무조건 ISA로 가세요", "반드시 ~하세요" 같은 확정적 조언은 절대 쓰지 마세요. 항상 "이 조건에서는 ~", "~일 때는 ~" 같은 조건부 표현을 쓰세요.
4. verificationStatus에 "미검증"이라는 표현이 포함되어 있다면, 설명 마지막에 세율이 아직 최종 확인되지 않았다는 점을 자연스러운 한 문장으로 언급하세요.
5. 순수 텍스트만 반환하세요. 마크다운이나 JSON으로 감싸지 마세요.
6. generalOnlyTaxKrw는 오직 "전량 일반계좌였다면"이라는 가상의 비교 문장에서만 언급하고, ISA 계좌의 실제 세금을 설명할 때는 절대 이 숫자를 쓰지 마세요. 한도초과로 일부 수량이 일반계좌로 강제 전환된 경우, 그 부분에 실제로 부과되는 세금은 generalForcedTaxKrw입니다. 각 필드의 정확한 의미는 함께 전달되는 fieldDescriptions를 참고하세요.
7. taxFreeLimitKrw(ISA 비과세 한도, 수익 기준, 일반형 200만원/서민형 400만원)와 annualContributionLimitKrw(ISA 연간 납입한도, 투자 원금 기준, 2,000만원)는 완전히 다른 개념이며 절대 같은 숫자로 혼동해 서술하지 마세요. "비과세 한도"를 언급할 때는 반드시 taxFreeLimitKrw 값을, "납입한도"를 언급할 때는 반드시 annualContributionLimitKrw 값을 정확히 참조하세요.`;

// Stage 22/23: trade 결과의 각 세금·한도 필드가 정확히 무엇을 의미하는지 AI에게 명시적으로
// 전달한다. generalOnlyTaxKrw/generalForcedTaxKrw(Stage 22)와 taxFreeLimitKrw/
// annualContributionLimitKrw(Stage 23) 두 쌍 모두 AI가 서술 중 실제로 혼동한 이력이 있어
// (PROMPTS.md 2절 v2/v3 응답 예시), 특히 명확하게 구분해서 설명한다.
const TRADE_RESULT_FIELD_DESCRIPTIONS: Record<keyof TradeExplainInput["result"], string> = {
  totalInvestKrw: "이번 매수에 투입되는 총 투자금액(원)",
  annualContributionLimitKrw:
    "ISA 계좌의 연간 납입한도. '투자 원금'을 기준으로 한 금액(2,000만원)이며, 비과세 한도(taxFreeLimitKrw)와는 전혀 다른 개념이다. 둘을 절대 혼동하지 마라.",
  isExceedingContributionLimit: "annualContributionLimitKrw(연간 납입한도)를 초과했는지 여부",
  isaQuantity:
    "ISA 계좌에 실제로 편입되는 수량(한도 초과 시 한도 이내로 축소됨). 사용자가 요청한 총 수량(quantity)이 isaQuantity와 generalQuantity로 나뉜 것이다.",
  generalQuantity:
    "ISA 연간 납입한도 초과로 일반계좌 규칙이 강제 적용되는 수량. 사용자가 요청한 총 수량(quantity)에서 isaQuantity를 뺀 나머지다.",
  taxFreeLimitKrw:
    "ISA 계좌의 비과세 한도. '수익'을 기준으로 한 금액이며(일반형 200만원, 서민형 400만원), 이 금액까지는 순이익에 세금이 없다. annualContributionLimitKrw(연간 납입한도, 투자 원금 기준)와는 전혀 다른 개념이므로 절대 혼동하지 말 것.",
  netGainForIsaKrw: "ISA 편입 수량(isaQuantity) 기준 손익통산 후 순이익(원)",
  isaTaxKrw:
    "ISA 편입 수량(isaQuantity)에 실제로 부과되는 세금 — 비과세 한도(taxFreeLimitKrw) 초과분에 9.9% 분리과세를 적용한 값",
  generalForcedTaxKrw:
    "ISA 연간 납입한도 초과로 강제 전환된 일부 수량(generalQuantity)에 실제로 부과되는 세금. 이 값은 totalTaxKrw(실제 총 세금)에 포함되어 있는 실제 세금이다 — generalOnlyTaxKrw와 절대 혼동하지 말 것.",
  generalOnlyTaxKrw:
    "전량을 일반계좌로 매수했다고 가정했을 때의 가상 세금. 헤드라인의 절세액(savedAmountKrw) 비교 계산에만 쓰이며, 실제로 발생하는 세금이 아니다 — ISA 계좌의 실제 세금을 설명할 때는 이 값을 쓰면 안 된다.",
  totalTaxKrw: "실제로 발생하는 총 세금 (isaTaxKrw + generalForcedTaxKrw)",
  savedAmountKrw: "전량 일반계좌 가정(generalOnlyTaxKrw) 대비 실제 절세액",
};

export function buildTradeExplainPayload(input: TradeExplainInput) {
  return {
    input: input.input,
    result: input.result,
    fieldDescriptions: TRADE_RESULT_FIELD_DESCRIPTIONS,
    verificationStatus: input.verificationStatus,
  };
}

export async function explainSimulationResult(
  input: ExplainSimulationInput
): Promise<string> {
  const client = new Anthropic();

  const systemPrompt =
    input.kind === "trade" ? EXPLAIN_SYSTEM_PROMPT_TRADE : EXPLAIN_SYSTEM_PROMPT_HOLD;
  const messageContent =
    input.kind === "trade" ? JSON.stringify(buildTradeExplainPayload(input)) : JSON.stringify(input);

  const response = await client.messages.create(
    {
      model: HAIKU_MODEL,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: messageContent }],
    },
    { timeout: 20_000 }
  );

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  if (!textBlock || !textBlock.text.trim()) {
    throw new Error("AI_EXPLAIN_EMPTY_OUTPUT");
  }

  return textBlock.text.trim();
}
