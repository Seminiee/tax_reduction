import Anthropic from "@anthropic-ai/sdk";
import { HAIKU_MODEL } from "./model";

export { HAIKU_MODEL };

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_HISTORY_MESSAGES = 10;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Stage 7: 도구가 "거치식(hold)" 하나에서 "거치식+매매차익(trade)" 다중 도구로 확장되어
// discriminated union으로 일반화한다. 챗봇은 어느 도구 페이지에서 왔는지에 따라 kind로 분기한다.
export interface HoldSimulationContext {
  kind: "hold";
  request: {
    principalKrw: number;
    annualReturnRate: number;
    annualDividendYieldRate: number;
    holdingYears: number;
    isaType: string;
    annualFinancialIncomeKrw: number;
  };
  response: {
    generalAccount: { finalAfterTaxValue: number; totalTax: number };
    isaAccount: {
      finalAfterTaxValue: number;
      tax: number;
      isEarlyWithdrawal: boolean;
      taxableExcess: number;
      taxFreeLimitKrw: number;
    };
    verificationStatus: string;
  };
}

// Stage 8: 매매차익 계산기(/trade)의 실제 시뮬레이션 조건/결과. hold와 마찬가지로
// request(사용자가 입력한 조건)/response(trade-calculator.ts 계산 결과) 구조를 따른다.
export interface TradeSimulationContext {
  kind: "trade";
  request: {
    stockName: string;
    currentPriceKrw: number;
    expectedProfitPerShareKrw: number;
    expectedLossPerShareKrw: number;
    quantity: number;
    isaType: string;
  };
  response: {
    totalInvestKrw: number;
    isExceedingContributionLimit: boolean;
    isaQuantity: number;
    generalQuantity: number;
    taxFreeLimitKrw: number;
    isaTaxKrw: number;
    generalForcedTaxKrw: number;
    generalOnlyTaxKrw: number;
    totalTaxKrw: number;
    savedAmountKrw: number;
  };
}

// Stage 10: 배당금 계산기(/dividend)의 실제 시뮬레이션 조건/결과. hold/trade와 마찬가지로
// request(사용자가 입력한 조건)/response(dividend-calculator.ts 계산 결과) 구조를 따른다.
export interface DividendSimulationContext {
  kind: "dividend";
  request: {
    stockName: string;
    quantity: number;
    dividendPerShareKrw: number;
    /** Stage 12: 수량 도출에 쓰인 현재 주가(원) */
    currentPriceKrw: number;
    /** Stage 12: 사용자가 수량을 직접 입력했는지("quantity"), 총매수금액으로 입력했는지("amount") */
    inputMode: "quantity" | "amount";
    /** Stage 12: 위 두 입력방식 중 무엇을 골랐든 실제로 투입된 금액(나머지 내림 반영) */
    actualInvestedAmountKrw: number;
    isaType: string;
    otherFinancialIncomeKrw: number;
  };
  response: {
    totalDividendKrw: number;
    taxFreeLimitKrw: number;
    isComprehensiveTaxationTriggered: boolean;
    marginalTaxRateApplied: number;
    generalDividendTaxKrw: number;
    generalNetReceivedKrw: number;
    isaDividendTaxKrw: number;
    isaNetReceivedKrw: number;
    taxSavingKrw: number;
  };
}

export type ChatCurrentSimulation =
  | HoldSimulationContext
  | TradeSimulationContext
  | DividendSimulationContext;

// Stage 14: v2로 갱신 (ISA 비과세 한도 사실관계 수정). v1 원문은 PROMPTS.md에 이력으로 보존.
// 실사용 원문은 PROMPTS.md에도 동일하게 기록되어 있다 (지원서 제출용, 수정 시 함께 갱신할 것).
export const CHAT_SYSTEM_PROMPT = `당신은 "해외ETF 세후수익 시뮬레이터" 서비스에 내장된 ISA/해외주식 세금 Q&A 도우미입니다. 아래 규칙을 반드시 지키세요.

[역할과 범위]
1. 답변 범위는 이 서비스가 다루는 주제로 한정합니다: 일반 해외주식 계좌 직접투자와 ISA(개인종합자산관리계좌) 국내상장 해외ETF의 세금 구조 비교, 양도소득세, 배당소득세, 금융소득종합과세, 비과세 한도, 분리과세 등.
2. 이 범위와 무관한 질문(일상 대화, 다른 나라 세법, 코딩, 날씨 등)에는 "죄송하지만 이 챗봇은 해외주식/ISA 세금 관련 질문만 답변할 수 있어요."라고 정중히 안내하고 답변하지 않습니다.

[답변 근거]
3. 답변은 아래 계산 로직을 근거로 하세요.
- 일반 해외주식 계좌: 매매차익은 연간 실현손익을 종목 간 손익통산 후 기본공제(연 250만원)를 차감하고 22%(지방세 포함) 양도소득세를 부과합니다. 배당은 현지에서 원천징수(통상 15%) 후, 국내에서 배당소득세 15.4% 기준으로 정산하되 이미 낸 현지세를 공제합니다(현지세율이 국내 기준보다 낮으면 차액만 추가 과세). 손익통산은 실현된 손익에만 적용되고 평가손익에는 적용되지 않습니다.
- ISA 계좌 + 국내상장 해외ETF: 계좌 내 모든 상품의 손익(매매차익+분배금)을 통산하고, 순이익 중 비과세 한도까지는 세금이 없으며 초과분은 9.9%(지방세 포함) 분리과세로 과세가 종결됩니다(종합과세 대상에서 제외). 의무가입기간 3년 미만 중도해지 시 이 혜택이 전부 취소되고 일반과세(15.4% + 종합과세 가능성)가 적용됩니다. ISA 계좌 내에서는 해외거래소 직상장 종목을 매수할 수 없고 반드시 국내상장 ETF를 통해야 하며, 연 2,000만원 납입한도·총 누적 1억원 한도가 있습니다.
- ISA 비과세 한도는 일반형 200만원, 서민형/농어민형 400만원이 현재 확정 시행 기준입니다. 500만원/1,000만원 확대는 국회 통과 전인 추진안입니다. 이 두 가지를 명확히 구분해서 답하세요.

[조건부 표현 원칙]
4. "무조건 ISA로 가세요", "지금 사세요/파세요" 같은 확정적 투자 조언은 절대 하지 마세요. 항상 "이 조건에서는 ~", "~인 경우에는 ~" 같은 조건부 표현을 사용하세요.

[확인 필요 항목]
5. 아래 항목에 대한 질문을 받으면 확정적인 수치나 답을 제시하지 말고, "이 부분은 자료마다 수치가 달라 국세청/금융투자협회 최신 공지로 확인이 필요합니다."라고 답하세요.
- 외국납부세액 선환급 폐지가 최종 시행되었는지, 시행됐다면 구체적 정산 방식
- 배당소득 분리과세 세율 개편이 ISA 밖 일반계좌 고배당 종목 비교에 미치는 영향

[추진 중인 세법 개정안 질문 대응]
6. 사용자가 ISA 비과세 한도 확대(예: 500만원/1,000만원, 연 납입한도 4,000만원)처럼 아직 시행되지 않은 추진안 자체에 대해 물으면, 확정 시행 기준(200만원/400만원)과 혼동하지 말고 "해당 확대안은 아직 국회를 통과하지 않았으며, 시행 여부와 구체적 시점은 확정되지 않았다"고 답하세요. 매년 7월 말경 발표되는 세법개정안에서 재논의될 가능성이 있다는 맥락 정도는 언급할 수 있지만, 확정된 시행 여부나 시점을 단정하지 마세요.

[시뮬레이션 맥락]
7. 사용자가 방금 돌린 시뮬레이션 조건과 결과가 함께 주어지면, "당신이 방금 계산한 조건(예: 투자금액/수익률/보유기간) 기준으로는 ~"처럼 그 결과를 참조해서 답하세요. 주어지지 않으면 일반적인 설명으로 답하세요.

[기타]
8. 답변은 한국어로, 2~4문장 정도로 간결하게 작성하세요.
9. 마크다운 서식(별표, #, 목록 기호 등)을 쓰지 말고 일반 텍스트로만 작성하세요.`;

export function buildCurrentSimulationContext(sim: ChatCurrentSimulation): string {
  if (sim.kind === "trade") {
    const { request, response } = sim;
    return `[현재 시뮬레이션 조건 — 매매차익 계산기]
사용자가 방금 아래 조건으로 매매차익 계산기를 실행했습니다. 관련 질문이면 이 조건과 결과를 참조해서 답하세요. 이 도구는 ISA 3년 의무유지 조건을 충족했다고 가정하며 금융소득종합과세는 계산하지 않습니다.
- 종목: ${request.stockName}, 현재가: ${request.currentPriceKrw.toLocaleString("ko-KR")}원, 수량: ${request.quantity.toLocaleString("ko-KR")}주, 주당 예상 이익: ${request.expectedProfitPerShareKrw.toLocaleString("ko-KR")}원, 주당 예상 손실: ${request.expectedLossPerShareKrw.toLocaleString("ko-KR")}원, ISA 유형: ${request.isaType}
- 연간 납입한도(2,000만원) 초과 여부: ${response.isExceedingContributionLimit ? "예" : "아니오"} (ISA 편입 ${response.isaQuantity.toLocaleString("ko-KR")}주 / 일반계좌 강제전환 ${response.generalQuantity.toLocaleString("ko-KR")}주)
- 실제 발생 세금: ${response.totalTaxKrw.toLocaleString("ko-KR")}원 (ISA 분리과세 ${response.isaTaxKrw.toLocaleString("ko-KR")}원 + 강제전환분 양도소득세 ${response.generalForcedTaxKrw.toLocaleString("ko-KR")}원), 전량 일반계좌였다면 ${response.generalOnlyTaxKrw.toLocaleString("ko-KR")}원, 절세액: ${response.savedAmountKrw.toLocaleString("ko-KR")}원`;
  }

  if (sim.kind === "dividend") {
    const { request, response } = sim;
    return `[현재 시뮬레이션 조건 — 배당금 계산기]
사용자가 방금 아래 조건으로 배당금 계산기를 실행했습니다. 관련 질문이면 이 조건과 결과를 참조해서 답하세요. 이 도구는 ISA 3년 의무유지 조건을 충족했다고 가정하며, 매수원가 정보가 없어 ISA 연간 납입한도 초과 로직은 다루지 않습니다.
- 종목: ${request.stockName}, 현재 주가: ${request.currentPriceKrw.toLocaleString("ko-KR")}원, 수량: ${request.quantity.toLocaleString("ko-KR")}주(${request.inputMode === "amount" ? "총매수금액으로 입력, 나머지는 매수 불가하여 내림 처리됨" : "수량 직접 입력"}), 실제 투입금액: ${request.actualInvestedAmountKrw.toLocaleString("ko-KR")}원, 주당 배당금: ${request.dividendPerShareKrw.toLocaleString("ko-KR")}원, ISA 유형: ${request.isaType}, 다른 금융소득: ${request.otherFinancialIncomeKrw.toLocaleString("ko-KR")}원
- 총 배당금: ${response.totalDividendKrw.toLocaleString("ko-KR")}원, 금융소득종합과세 대상 여부: ${response.isComprehensiveTaxationTriggered ? "예" : "아니오"}(적용 세율 ${(response.marginalTaxRateApplied * 100).toFixed(1)}%)
- 일반계좌 실수령액: ${response.generalNetReceivedKrw.toLocaleString("ko-KR")}원 (세금 ${response.generalDividendTaxKrw.toLocaleString("ko-KR")}원)
- ISA 실수령액: ${response.isaNetReceivedKrw.toLocaleString("ko-KR")}원 (세금 ${response.isaDividendTaxKrw.toLocaleString("ko-KR")}원), 세금 이득(일반-ISA): ${response.taxSavingKrw.toLocaleString("ko-KR")}원`;
  }

  const { request, response } = sim;
  return `[현재 시뮬레이션 조건]
사용자가 방금 아래 조건으로 시뮬레이션을 실행했습니다. 관련 질문이면 이 조건과 결과를 참조해서 답하세요.
- 투자금액: ${request.principalKrw.toLocaleString("ko-KR")}원, 연 수익률: ${(request.annualReturnRate * 100).toFixed(1)}%, 배당수익률: ${(request.annualDividendYieldRate * 100).toFixed(1)}%, 보유기간: ${request.holdingYears}년, ISA 유형: ${request.isaType}
- 일반계좌 세후: ${response.generalAccount.finalAfterTaxValue.toLocaleString("ko-KR")}원 (세금 ${response.generalAccount.totalTax.toLocaleString("ko-KR")}원)
- ISA 세후: ${response.isaAccount.finalAfterTaxValue.toLocaleString("ko-KR")}원 (세금 ${response.isaAccount.tax.toLocaleString("ko-KR")}원, 3년 미만 중도해지 여부: ${response.isaAccount.isEarlyWithdrawal ? "예" : "아니오"})`;
}

/** null이면 유효, 문자열이면 사용자에게 보여줄 에러 메시지 (라우트의 400 응답에 사용). */
export function validateChatMessages(messages: unknown): string | null {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "messages는 비어 있지 않은 배열이어야 합니다.";
  }

  for (const item of messages) {
    if (!item || typeof item !== "object") {
      return "messages의 각 항목은 객체여야 합니다.";
    }
    const message = item as Record<string, unknown>;
    if (message.role !== "user" && message.role !== "assistant") {
      return "messages의 role은 user 또는 assistant여야 합니다.";
    }
    if (typeof message.content !== "string" || message.content.trim().length === 0) {
      return "messages의 content는 비어 있지 않은 문자열이어야 합니다.";
    }
    if (message.content.length > MAX_MESSAGE_LENGTH) {
      return `메시지는 ${MAX_MESSAGE_LENGTH}자 이내로 입력해 주세요.`;
    }
  }

  const last = messages[messages.length - 1] as ChatMessage;
  if (last.role !== "user") {
    return "마지막 메시지는 사용자(user) 메시지여야 합니다.";
  }

  return null;
}

/**
 * 남용 방지: 최근 MAX_HISTORY_MESSAGES개만 남기고, Anthropic API 요구사항(첫 메시지는 user)에
 * 맞춰 앞부분이 assistant로 시작하면 user가 나올 때까지 잘라낸다.
 */
export function sliceRecentMessages(messages: ChatMessage[]): ChatMessage[] {
  let sliced = messages.slice(-MAX_HISTORY_MESSAGES);
  while (sliced.length > 0 && sliced[0].role !== "user") {
    sliced = sliced.slice(1);
  }
  return sliced;
}

export async function chatWithTaxAssistant(
  messages: ChatMessage[],
  currentSimulation?: ChatCurrentSimulation
): Promise<string> {
  const client = new Anthropic();

  const simulationContext = currentSimulation ? buildCurrentSimulationContext(currentSimulation) : "";
  const system = simulationContext ? `${CHAT_SYSTEM_PROMPT}\n\n${simulationContext}` : CHAT_SYSTEM_PROMPT;

  const response = await client.messages.create(
    {
      model: HAIKU_MODEL,
      max_tokens: 500,
      system,
      messages: sliceRecentMessages(messages),
    },
    { timeout: 20_000 }
  );

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  if (!textBlock || !textBlock.text.trim()) {
    throw new Error("AI_CHAT_EMPTY_OUTPUT");
  }

  return textBlock.text.trim();
}
