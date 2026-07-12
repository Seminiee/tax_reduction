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

// v2 (Stage 21): 매매차익 계산기 결과 해설. 규칙은 v1과 동일하되 근거 JSON 형태(result)가 다르다.
export const EXPLAIN_SYSTEM_PROMPT_TRADE = `당신은 세금 시뮬레이션 결과를 설명하는 한국어 해설가입니다. 아래 규칙을 반드시 지키세요.

1. 결과 JSON을 근거로 왜 이런 세후 금액 차이가 나오는지 설명하세요. 손익통산, 비과세 한도, 분리과세, 종합과세 중 실제로 관련 있는 키워드를 최소 1개 포함하세요.
2. 3~5문장의 한국어로 작성하세요.
3. "무조건 ISA로 가세요", "반드시 ~하세요" 같은 확정적 조언은 절대 쓰지 마세요. 항상 "이 조건에서는 ~", "~일 때는 ~" 같은 조건부 표현을 쓰세요.
4. verificationStatus에 "미검증"이라는 표현이 포함되어 있다면, 설명 마지막에 세율이 아직 최종 확인되지 않았다는 점을 자연스러운 한 문장으로 언급하세요.
5. 순수 텍스트만 반환하세요. 마크다운이나 JSON으로 감싸지 마세요.`;

export async function explainSimulationResult(
  input: ExplainSimulationInput
): Promise<string> {
  const client = new Anthropic();

  const systemPrompt =
    input.kind === "trade" ? EXPLAIN_SYSTEM_PROMPT_TRADE : EXPLAIN_SYSTEM_PROMPT_HOLD;

  const response = await client.messages.create(
    {
      model: HAIKU_MODEL,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: JSON.stringify(input) }],
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
