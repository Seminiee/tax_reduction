import Anthropic from "@anthropic-ai/sdk";
import taxRules from "@/config/tax-rules.json";
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
    /** Stage 27: 강제전환분에 15.4%/한계세율(금융소득종합과세) 구조가 적용되면서 추가됨. */
    isComprehensiveTaxationTriggered: boolean;
    marginalTaxRateApplied: number;
    generalForcedTaxKrw: number;
    generalOnlyTaxKrw: number;
    totalTaxKrw: number;
    savedAmountKrw: number;
  };
  verificationStatus: string;
}

// ChatCurrentSimulation(lib/ai/chat-with-tax-assistant.ts)과 동일한 kind 판별 유니언 패턴.
export type ExplainSimulationInput = HoldExplainInput | TradeExplainInput;

// v4 (Stage 29): Stage 28에서는 AI가 원 단위 숫자를 "만원"으로 직접 환산하다 자릿수를 틀리는
// 문제(XxxFormatted 문자열 인용 규칙)를 고쳤는데, 그 이후에도 AI가 숫자를 직접 옮겨 적다가
// 전혀 다른 종류의 오류를 내는 사례가 발견됐다(isaTaxKrw=99,000원을 "9,900원"으로 서술 —
// PROMPTS.md 2절 v7 3회 재현 테스트 1회차 응답 참고). 근본 원인은 "AI가 숫자를 텍스트로
// 타이핑하는 모든 지점"이 확률적 오기재 위험을 안고 있다는 것이었다. Stage 29는 이 문제를
// 구조적으로 없앤다 — AI는 더 이상 어떤 숫자도 직접 쓰지 않고, {{필드명}} 플레이스홀더만
// 쓰도록 강제한 뒤, 코드(substitutePlaceholders)가 그 토큰을 실제 값으로 치환한다. v1~v3
// 원문은 PROMPTS.md에 이력으로 보존.
export const EXPLAIN_SYSTEM_PROMPT_HOLD = `당신은 세금 시뮬레이션 결과를 설명하는 한국어 해설가입니다. 아래 규칙을 반드시 지키세요.

1. 결과 JSON을 근거로 왜 이런 세후 금액 차이가 나오는지 설명하세요. 손익통산, 비과세 한도, 분리과세, 종합과세 중 실제로 관련 있는 키워드를 최소 1개 포함하세요.
2. 3~5문장의 한국어로 작성하세요.
3. "무조건 ISA로 가세요", "반드시 ~하세요" 같은 확정적 조언은 절대 쓰지 마세요. 항상 "이 조건에서는 ~", "~일 때는 ~" 같은 조건부 표현을 쓰세요.
4. verificationStatus에 "확정되지 않았"과 같이 미확정 사항이 있다는 표현이 포함되어 있다면, 설명 마지막에 일부 세부 사항이 아직 최종 확인되지 않았다는 점을 자연스러운 한 문장으로 언급하세요.
5. 순수 텍스트만 반환하세요. 마크다운이나 JSON으로 감싸지 마세요.
6. 금액, 기간, 세율 등 숫자로 나타나는 모든 값은 절대 아라비아 숫자로 직접 쓰지 말고, 반드시 아래 "사용 가능한 플레이스홀더" 목록에 있는 {{필드명}} 토큰으로만 표현하세요(예: "ISA 초과분인 {{isaTaxableExcessKrw}}원에 {{isaSeparateTaxRatePercent}}가 적용되어 세금이 {{isaTaxKrw}}원이 됩니다."). 코드가 이 응답을 화면에 보여주기 전에 각 토큰을 정확한 값으로 자동 치환합니다. 목록에 없는 필드명을 만들어내거나 숫자를 직접 계산해서 쓰지 마세요.
7. 이름이 "Krw"로 끝나는 플레이스홀더(금액)와 {{holdingYears}}(기간)는 단위가 포함되어 있지 않은 순수 숫자이므로, 문장에서 자연스럽게 "원"/"년" 등 알맞은 단위를 플레이스홀더 바로 뒤에 직접 붙이세요. 반대로 이름이 "Percent"로 끝나는 플레이스홀더(세율)와 "Formatted"로 끝나는 플레이스홀더(예: {{isaTaxableExcessFormatted}})는 이미 단위(%, 만원)가 포함되어 있으므로 뒤에 단위를 또 붙이면 "9.9%%"나 "100만원만원"처럼 중복됩니다 — 절대 단위를 추가로 붙이지 마세요.

사용 가능한 플레이스홀더: {{principalKrw}}, {{annualReturnRate}}, {{holdingYears}}, {{generalFinalAfterTaxValueKrw}}, {{generalTotalTaxKrw}}, {{generalCapitalGainsTaxKrw}}, {{generalTotalDividendTaxKrw}}, {{generalCapitalGainsTaxRatePercent}}, {{isaFinalAfterTaxValueKrw}}, {{isaTaxKrw}}, {{isaTaxableExcessKrw}}, {{isaTaxableExcessFormatted}}, {{isaTaxFreeLimitKrw}}, {{isaSeparateTaxRatePercent}}`;

// v8 (Stage 29): 위 hold와 동일한 이유로, trade도 자유 서술 숫자 대신 플레이스홀더 방식으로
// 전환한다. 기존 규칙 6~8(generalOnlyTaxKrw/generalForcedTaxKrw 구분, taxFreeLimitKrw/
// annualContributionLimitKrw 구분, 15.4%/22% 구분)은 "AI가 어떤 개념을 서술해야 하는지"를
// 다루는 의미론적 규칙이라 플레이스홀더 도입과 무관하게 그대로 유지한다 — 플레이스홀더는
// 숫자를 "정확히 옮겨 적는" 문제만 해결할 뿐, "올바른 필드를 참조하는지"는 여전히 이 규칙들이
// 담당한다. Stage 28의 규칙 9("XxxFormatted 문자열을 그대로 인용")는 플레이스홀더 방식이
// 완전히 대체하므로 제거했다. v1(Stage 4)~v7(Stage 28) 원문은 PROMPTS.md에 이력으로 보존.
export const EXPLAIN_SYSTEM_PROMPT_TRADE = `당신은 세금 시뮬레이션 결과를 설명하는 한국어 해설가입니다. 아래 규칙을 반드시 지키세요.

1. 결과 JSON을 근거로 왜 이런 세후 금액 차이가 나오는지 설명하세요. 손익통산, 비과세 한도, 분리과세, 종합과세 중 실제로 관련 있는 키워드를 최소 1개 포함하세요.
2. 3~5문장의 한국어로 작성하세요.
3. "무조건 ISA로 가세요", "반드시 ~하세요" 같은 확정적 조언은 절대 쓰지 마세요. 항상 "이 조건에서는 ~", "~일 때는 ~" 같은 조건부 표현을 쓰세요.
4. verificationStatus에 "확정되지 않았"과 같이 미확정 사항이 있다는 표현이 포함되어 있다면, 설명 마지막에 일부 세부 사항이 아직 최종 확인되지 않았다는 점을 자연스러운 한 문장으로 언급하세요.
5. 순수 텍스트만 반환하세요. 마크다운이나 JSON으로 감싸지 마세요.
6. generalOnlyTaxKrw는 오직 "전량 일반계좌였다면"이라는 가상의 비교 문장에서만 언급하고, ISA 계좌의 실제 세금을 설명할 때는 절대 이 값을 쓰지 마세요. 한도초과로 일부 수량이 일반계좌로 강제 전환된 경우, 그 부분에 실제로 부과되는 세금은 generalForcedTaxKrw입니다. 각 필드의 정확한 의미는 함께 전달되는 fieldDescriptions를 참고하세요.
7. taxFreeLimitKrw(ISA 비과세 한도, 수익 기준, 일반형 200만원/서민형 400만원)와 annualContributionLimitKrw(ISA 연간 납입한도, 투자 원금 기준, 2,000만원)는 완전히 다른 개념이며 절대 같은 값으로 혼동해 서술하지 마세요. "비과세 한도"를 언급할 때는 반드시 taxFreeLimitKrw 자리의 플레이스홀더를, "납입한도"를 언급할 때는 반드시 annualContributionLimitKrw 자리의 플레이스홀더를 정확히 참조하세요.
8. 이 서비스가 다루는 대상은 국내상장 해외ETF이므로 일반계좌 세율은 15.4% 배당소득세({{domesticDividendWithholdingRatePercent}} 플레이스홀더로 표현)이며, generalForcedTaxKrw/generalOnlyTaxKrw는 이 순이익이 금융소득종합과세 기준(2,000만원)을 넘으면 초과분에 marginalTaxRateApplied(한계세율, {{marginalTaxRateApplied}} 플레이스홀더로 표현)가 적용된 결과입니다. 22% 양도소득세는 해외 거래소에 직접 상장된 종목을 직접 매수했을 때만 적용되는 세율이며 이 서비스의 계산 대상이 아니므로 언급하지 마세요.
9. 금액, 수량, 세율 등 숫자로 나타나는 모든 값은 절대 아라비아 숫자로 직접 쓰지 말고, 반드시 아래 "사용 가능한 플레이스홀더" 목록에 있는 {{필드명}} 토큰으로만 표현하세요(예: "ISA 초과분인 {{isaTaxableExcessKrw}}원에 {{isaSeparateTaxRatePercent}}가 적용되어 세금이 {{isaTaxKrw}}원이 됩니다."). 코드가 이 응답을 화면에 보여주기 전에 각 토큰을 정확한 값으로 자동 치환합니다. 목록에 없는 필드명을 만들어내거나 숫자를 직접 계산해서 쓰지 마세요.
10. 이름이 "Krw"로 끝나는 플레이스홀더(금액)는 단위가 포함되어 있지 않은 순수 숫자이므로 뒤에 "원"을 직접 붙이고, {{quantity}}/{{isaQuantity}}/{{generalQuantity}}(수량)는 뒤에 "주"를 직접 붙이세요. 반대로 이름이 "Percent"로 끝나는 플레이스홀더(세율)와 "Formatted"로 끝나는 플레이스홀더(예: {{isaTaxableExcessKrwFormatted}})는 이미 단위(%, 만원)가 포함되어 있으므로 뒤에 단위를 또 붙이면 "9.9%%"나 "100만원만원"처럼 중복됩니다 — 절대 단위를 추가로 붙이지 마세요.

사용 가능한 플레이스홀더: {{stockName}}, {{currentPriceKrw}}, {{expectedProfitPerShareKrw}}, {{expectedLossPerShareKrw}}, {{quantity}}, {{totalInvestKrw}}, {{annualContributionLimitKrw}}, {{isaQuantity}}, {{generalQuantity}}, {{taxFreeLimitKrw}}, {{netGainForIsaKrw}}, {{isaTaxKrw}}, {{isaSeparateTaxRatePercent}}, {{marginalTaxRateApplied}}, {{domesticDividendWithholdingRatePercent}}, {{generalForcedTaxKrw}}, {{generalOnlyTaxKrw}}, {{totalTaxKrw}}, {{savedAmountKrw}}, {{isaTaxableExcessKrw}}, {{isaTaxableExcessKrwFormatted}}`;

// Stage 22/23/27: trade 결과의 각 세금·한도 필드가 정확히 무엇을 의미하는지 AI에게 명시적으로
// 전달한다. generalOnlyTaxKrw/generalForcedTaxKrw(Stage 22)와 taxFreeLimitKrw/
// annualContributionLimitKrw(Stage 23) 두 쌍 모두 AI가 서술 중 실제로 혼동한 이력이 있어
// (PROMPTS.md 2절 v2/v3 응답 예시), 특히 명확하게 구분해서 설명한다. Stage 29부터는 이 설명이
// "어떤 개념을 말해야 하는지"만 판단하는 데 쓰이고, 실제 서술은 같은 이름의 플레이스홀더
// 토큰으로 한다(buildTradePlaceholderMap 참고).
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
  isComprehensiveTaxationTriggered:
    "강제전환분(generalQuantity)의 순이익이 금융소득종합과세 기준(2,000만원)을 넘는지 여부. 이 서비스가 다루는 국내상장 해외ETF는 일반계좌에서 15.4% 배당소득세로 과세되며, 이 기준을 넘으면 초과분에 marginalTaxRateApplied(한계세율)가 적용된다.",
  marginalTaxRateApplied:
    "강제전환분(generalForcedTaxKrw)에 실제로 적용된 세율. 금융소득종합과세 기준을 넘지 않았다면 15.4%(국내 배당소득세율)와 같고, 넘었다면 초과분에 적용되는 한계세율이다.",
  generalForcedTaxKrw:
    "ISA 연간 납입한도 초과로 강제 전환된 일부 수량(generalQuantity)에 실제로 부과되는 세금(15.4% 배당소득세 기준, marginalTaxRateApplied 참고). 이 값은 totalTaxKrw(실제 총 세금)에 포함되어 있는 실제 세금이다 — generalOnlyTaxKrw와 절대 혼동하지 말 것.",
  generalOnlyTaxKrw:
    "전량을 일반계좌로 매수했다고 가정했을 때의 가상 세금(15.4% 배당소득세 기준). 헤드라인의 절세액(savedAmountKrw) 비교 계산에만 쓰이며, 실제로 발생하는 세금이 아니다 — ISA 계좌의 실제 세금을 설명할 때는 이 값을 쓰면 안 된다.",
  totalTaxKrw: "실제로 발생하는 총 세금 (isaTaxKrw + generalForcedTaxKrw)",
  savedAmountKrw: "전량 일반계좌 가정(generalOnlyTaxKrw) 대비 실제 절세액",
};

// Stage 28: 원 단위 숫자를 AI가 직접 "만원" 단위로 나눠 서술하게 하면 자릿수를 틀리는 경우가
// 실제로 있었다(예: 100만원을 1,000만원으로 서술). 그런 값은 여기서 미리 계산해 문자열로
// 만들어 payload에 함께 넘긴다. Stage 29부터는 이 문자열도 다른 필드와 마찬가지로
// 플레이스홀더({{isaTaxableExcessKrwFormatted}} 등)로만 인용되므로 AI가 옮겨 적다가
// 틀릴 위험 자체가 없어졌다.
function formatManwon(amountKrw: number): string {
  const manwon = Math.round(amountKrw / 10_000);
  return `${manwon.toLocaleString("ko-KR")}만원`;
}

// Stage 29 재현 테스트에서 실제로 관찰된 문제: 금액/수량 플레이스홀더에 단위(원/주)를 미리
// 넣어두면, AI가 자기 문장 습관대로 플레이스홀더 뒤에 "원"/"주"를 또 붙여 "1,500주주",
// "330,000원원" 같은 중복이 실제로 발생했다(모델은 치환 후 값을 보지 못하고 토큰만 보고
// 쓰기 때문에, 토큰 자체에 단위가 있는지 여부와 무관하게 습관적으로 단위를 붙인다). 반면 세율
// 플레이스홀더("%")와 이미 "만원" 단위로 환산해둔 XxxFormatted 필드는 같은 재현 테스트에서
// 중복이 관찰되지 않았다. 그래서 금액/수량/기간은 단위 없이 순수 숫자만 주고 AI가 단위를 직접
// 붙이게 하고(중복될 여지 자체가 없음), 세율/XxxFormatted는 기존처럼 단위를 미리 포함한다.
function formatKrw(amountKrw: number): string {
  return Math.round(amountKrw).toLocaleString("ko-KR");
}

function formatQuantity(quantity: number): string {
  return quantity.toLocaleString("ko-KR");
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%`;
}

function formatYears(years: number): string {
  return `${years}`;
}

// Stage 29: 시나리오마다 바뀌지 않는 config 고정 세율도 플레이스홀더로 노출한다 — AI가 "9.9%",
// "15.4%" 같은 세율 숫자를 직접 타이핑하다 틀리는 것도 막기 위함이다(CLAUDE.md 규칙 1: 세율은
// config/tax-rules.json에서만 관리). AI에게 전달되는 JSON payload 자체에는 없는 필드지만,
// 시스템 프롬프트가 나열하는 "사용 가능한 플레이스홀더" 목록에는 포함되어 있고, 아래 플레이스홀더
// 맵에서 실제 값으로 치환된다.
const ISA_SEPARATE_TAX_RATE_PERCENT = formatPercent(taxRules.isa_account.separate_tax_rate_over_limit);
const DOMESTIC_DIVIDEND_WITHHOLDING_RATE_PERCENT = formatPercent(
  taxRules.general_account.domestic_dividend_withholding_rate
);
const GENERAL_CAPITAL_GAINS_TAX_RATE_PERCENT = formatPercent(
  taxRules.general_account.capital_gains_tax_rate
);

const TRADE_DERIVED_FIELD_DESCRIPTIONS = {
  isaTaxableExcessKrw:
    "ISA 편입분의 순이익(netGainForIsaKrw)에서 비과세 한도(taxFreeLimitKrw)를 뺀 금액(원 단위) — ISA 분리과세 9.9%가 실제로 적용되는 초과분이다.",
  isaTaxableExcessKrwFormatted:
    "isaTaxableExcessKrw를 미리 '만원' 단위로 환산해둔 문자열(예: '100만원'). 이 초과분을 만원/억원 단위로 언급할 때 쓴다.",
} as const;

export function buildTradeExplainPayload(input: TradeExplainInput) {
  const isaTaxableExcessKrw = Math.max(
    0,
    input.result.netGainForIsaKrw - input.result.taxFreeLimitKrw
  );

  return {
    input: input.input,
    result: {
      ...input.result,
      isaTaxableExcessKrw,
      isaTaxableExcessKrwFormatted: formatManwon(isaTaxableExcessKrw),
    },
    fieldDescriptions: {
      ...TRADE_RESULT_FIELD_DESCRIPTIONS,
      ...TRADE_DERIVED_FIELD_DESCRIPTIONS,
    },
    verificationStatus: input.verificationStatus,
  };
}

// Stage 28: hold(v3)의 isaAccount.taxableExcess도 trade의 isaTaxableExcessKrw와 같은 성격의
// 원 단위 raw 필드라 같은 위험(AI가 직접 만원 단위로 환산하다 자릿수를 틀림)이 구조적으로 있다.
export function buildHoldExplainPayload(input: HoldExplainInput) {
  return {
    input: input.input,
    generalAccount: input.generalAccount,
    isaAccount: {
      ...input.isaAccount,
      taxableExcessFormatted: formatManwon(input.isaAccount.taxableExcess),
    },
    verificationStatus: input.verificationStatus,
  };
}

// Stage 29: trade 시스템 프롬프트가 나열하는 "사용 가능한 플레이스홀더" 목록과 1:1로 대응하는
// 실제 표시용 값 맵. buildTradeExplainPayload가 만든 payload(AI에게 보내는 JSON)를 그대로
// 재사용해 값을 뽑아내되, 사람이 읽기 좋은 단위(원/주/%)를 여기서 입힌다.
function buildTradePlaceholderMap(
  payload: ReturnType<typeof buildTradeExplainPayload>
): Record<string, string> {
  const { input, result } = payload;
  return {
    stockName: input.stockName,
    currentPriceKrw: formatKrw(input.currentPriceKrw),
    expectedProfitPerShareKrw: formatKrw(input.expectedProfitPerShareKrw),
    expectedLossPerShareKrw: formatKrw(input.expectedLossPerShareKrw),
    quantity: formatQuantity(input.quantity),
    totalInvestKrw: formatKrw(result.totalInvestKrw),
    annualContributionLimitKrw: formatKrw(result.annualContributionLimitKrw),
    isaQuantity: formatQuantity(result.isaQuantity),
    generalQuantity: formatQuantity(result.generalQuantity),
    taxFreeLimitKrw: formatKrw(result.taxFreeLimitKrw),
    netGainForIsaKrw: formatKrw(result.netGainForIsaKrw),
    isaTaxKrw: formatKrw(result.isaTaxKrw),
    isaSeparateTaxRatePercent: ISA_SEPARATE_TAX_RATE_PERCENT,
    marginalTaxRateApplied: formatPercent(result.marginalTaxRateApplied),
    domesticDividendWithholdingRatePercent: DOMESTIC_DIVIDEND_WITHHOLDING_RATE_PERCENT,
    generalForcedTaxKrw: formatKrw(result.generalForcedTaxKrw),
    generalOnlyTaxKrw: formatKrw(result.generalOnlyTaxKrw),
    totalTaxKrw: formatKrw(result.totalTaxKrw),
    savedAmountKrw: formatKrw(result.savedAmountKrw),
    isaTaxableExcessKrw: formatKrw(result.isaTaxableExcessKrw),
    isaTaxableExcessKrwFormatted: result.isaTaxableExcessKrwFormatted,
  };
}

function buildHoldPlaceholderMap(
  payload: ReturnType<typeof buildHoldExplainPayload>
): Record<string, string> {
  const { input, generalAccount, isaAccount } = payload;
  return {
    principalKrw: formatKrw(input.principalKrw),
    annualReturnRate: formatPercent(input.annualReturnRate),
    holdingYears: formatYears(input.holdingYears),
    generalFinalAfterTaxValueKrw: formatKrw(generalAccount.finalAfterTaxValue),
    generalTotalTaxKrw: formatKrw(generalAccount.totalTax),
    generalCapitalGainsTaxKrw: formatKrw(generalAccount.capitalGainsTax),
    generalTotalDividendTaxKrw: formatKrw(generalAccount.totalDividendTax),
    generalCapitalGainsTaxRatePercent: GENERAL_CAPITAL_GAINS_TAX_RATE_PERCENT,
    isaFinalAfterTaxValueKrw: formatKrw(isaAccount.finalAfterTaxValue),
    isaTaxKrw: formatKrw(isaAccount.tax),
    isaTaxableExcessKrw: formatKrw(isaAccount.taxableExcess),
    isaTaxableExcessFormatted: isaAccount.taxableExcessFormatted,
    isaTaxFreeLimitKrw: formatKrw(isaAccount.taxFreeLimitKrw),
    isaSeparateTaxRatePercent: ISA_SEPARATE_TAX_RATE_PERCENT,
  };
}

const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;
const UNRESOLVED_PLACEHOLDER_TEXT = "(값 확인 필요)";

// Stage 29: AI 응답에 남아있는 {{필드명}} 토큰을 실제 값으로 치환한다. 목록에 없는(=AI가
// 지어낸) 필드명이 나오면 앱이 죽지 않도록 안전 문구로 대체하고 콘솔에 경고만 남긴다.
export function substitutePlaceholders(
  text: string,
  placeholderMap: Record<string, string>
): string {
  return text.replace(PLACEHOLDER_PATTERN, (match, fieldName: string) => {
    if (Object.prototype.hasOwnProperty.call(placeholderMap, fieldName)) {
      return placeholderMap[fieldName];
    }
    console.warn(`[explain] 알 수 없는 플레이스홀더 "${match}"를 안전 문구로 대체합니다.`);
    return UNRESOLVED_PLACEHOLDER_TEXT;
  });
}

// Stage 29: AI가 플레이스홀더를 쓰지 않고 숫자를 직접 서술하면(예: 과거 "9,900원"/"1,000만원"
// 오기재) 치환 단계에서는 걸러지지 않는다 — {{...}} 토큰을 모두 걷어낸 나머지 원문(치환 전
// 응답)에 "숫자+원/만원/억원" 패턴이 남아있는지 검사해 모니터링용 경고 로그를 남긴다. 사용자에게
// 보여줄 텍스트 자체를 막지는 않는다(응답을 아예 안 보여주면 데모가 죽어버리므로, 계산 결과
// 자체는 화면 위쪽에 항상 정확히 표시된다는 안전망 문구로 대응한다 — AiExplanationPanel 참고).
const LEAKED_AMOUNT_PATTERN = /\d[\d,]*\s*(원|만원|억원)/;

export function detectUnsubstitutedNumbers(rawText: string): boolean {
  const textWithoutPlaceholders = rawText.replace(PLACEHOLDER_PATTERN, "");
  const hasLeak = LEAKED_AMOUNT_PATTERN.test(textWithoutPlaceholders);
  if (hasLeak) {
    console.warn(
      `[explain] AI가 플레이스홀더 없이 금액을 직접 서술한 것으로 보입니다(원본 응답): ${rawText}`
    );
  }
  return hasLeak;
}

function resolveTradeContext(input: TradeExplainInput) {
  const payload = buildTradeExplainPayload(input);
  return {
    systemPrompt: EXPLAIN_SYSTEM_PROMPT_TRADE,
    payload,
    placeholderMap: buildTradePlaceholderMap(payload),
  };
}

function resolveHoldContext(input: HoldExplainInput) {
  const payload = buildHoldExplainPayload(input);
  return {
    systemPrompt: EXPLAIN_SYSTEM_PROMPT_HOLD,
    payload,
    placeholderMap: buildHoldPlaceholderMap(payload),
  };
}

export async function explainSimulationResult(
  input: ExplainSimulationInput
): Promise<string> {
  const client = new Anthropic();

  const { systemPrompt, payload, placeholderMap } =
    input.kind === "trade" ? resolveTradeContext(input) : resolveHoldContext(input);

  const response = await client.messages.create(
    {
      model: HAIKU_MODEL,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: JSON.stringify(payload) }],
    },
    { timeout: 20_000 }
  );

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  if (!textBlock || !textBlock.text.trim()) {
    throw new Error("AI_EXPLAIN_EMPTY_OUTPUT");
  }

  const rawText = textBlock.text.trim();
  // Stage 29: 화면에 보여주기 전, 치환되지 않은 채 남아있는 숫자를 모니터링용으로 감지만 하고
  // (사용자 노출 텍스트는 막지 않음), 실제로는 아래 substitutePlaceholders가 {{필드명}} 토큰을
  // 전부 정확한 값으로 바꿔서 반환한다.
  detectUnsubstitutedNumbers(rawText);

  return substitutePlaceholders(rawText, placeholderMap);
}
