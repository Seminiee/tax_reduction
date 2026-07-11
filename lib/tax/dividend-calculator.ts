import taxRules from "@/config/tax-rules.json";
import { applyGeneralDividendTax, applyIsaSeparateTax } from "./rate-engine";
import { resolveMarginalIncomeTaxRate } from "./income-tax-brackets";
import type { IsaAccountType } from "./isa-account";

const { types: ISA_TYPES } = taxRules.isa_account;
const {
  comprehensive_taxation_threshold_krw: COMPREHENSIVE_TAXATION_THRESHOLD_KRW,
  domestic_dividend_withholding_rate: DOMESTIC_DIVIDEND_WITHHOLDING_RATE,
} = taxRules.general_account;

export interface DividendCalculatorInput {
  stockName: string;
  quantity: number;
  dividendPerShareKrw: number;
  isaType: IsaAccountType;
  /** 이 배당 외 연간 다른 금융소득(원). 기본값 0 — 0이면 종합과세 판단 없이 국내 배당소득세율(15.4%) 고정 적용. */
  otherFinancialIncomeKrw?: number;
}

export interface DividendCalculatorResult {
  stockName: string;
  totalDividendKrw: number;
  taxFreeLimitKrw: number;
  /** otherFinancialIncomeKrw를 포함한 총 금융소득이 금융소득종합과세 기준을 초과하는지 */
  isComprehensiveTaxationTriggered: boolean;
  /** 초과분에 실제로 적용된 한계세율 (종합과세 미대상이면 국내 배당소득세율 15.4%와 동일) */
  marginalTaxRateApplied: number;
  generalDividendTaxKrw: number;
  generalNetReceivedKrw: number;
  isaDividendTaxKrw: number;
  isaNetReceivedKrw: number;
  /** 일반계좌 세금 - ISA 세금. 양수면 ISA가, 음수면 일반계좌가 이 조건에서 더 유리하다. */
  taxSavingKrw: number;
}

/**
 * 배당금 계산기 순수함수.
 * skills.md 7절 스코프: 매수원가/주가 정보를 받지 않으므로 ISA 연간 납입한도 초과 로직은
 * 다루지 않는다(trade-calculator.ts와 다른 스코프). ISA 3년 의무유지를 가정하며,
 * ISA 쪽은 손익통산 없이 배당금 자체를 순이익으로 취급해 applyIsaSeparateTax를 그대로 재사용한다.
 *
 * 종합과세 트리거 여부는 otherFinancialIncomeKrw 값과 무관하게 totalDividendKrw +
 * otherFinancialIncomeKrw가 comprehensive_taxation_threshold_krw(2,000만원)를 넘는지로만
 * 판단한다 — otherFinancialIncomeKrw가 0이어도 배당금 단독으로 기준을 초과하면 종합과세가
 * 정상적으로 트리거된다(Stage 19). 미트리거 시에는 국내 배당소득세율(15.4%)을 그대로 한계세율
 * 자리에 대입한다 — applyGeneralDividendTax의 임계값 분리 계산식은 대입한 세율이 국내세율과
 * 같을 때 대수적으로 정확히 totalDividendKrw * 15.4%로 귀결되므로, 로직을 중복 구현하지 않고도
 * "고정 15.4%"를 만족한다.
 */
export type DividendQuantityInput =
  | { mode: "quantity"; quantity: number; currentPriceKrw: number }
  | { mode: "amount"; totalPurchaseAmountKrw: number; currentPriceKrw: number };

export interface DividendQuantityResult {
  quantity: number;
  actualInvestedAmountKrw: number;
  /** "amount" 모드에서 사용자가 입력한 원래 금액. "quantity" 모드에서는 없음. */
  requestedAmountKrw?: number;
}

/**
 * 수량 직접입력 또는 총 매수금액 입력 중 하나로부터 배당 계산에 쓸 실제 수량을 결정하는
 * 순수함수. "amount" 모드는 currentPriceKrw로 나눈 몫만큼만 실제로 살 수 있으므로(나머지는
 * 투입되지 않음) Math.floor로 내림 처리하고, 그 결과 실제 투입 금액(actualInvestedAmountKrw)이
 * 사용자가 입력한 금액(requestedAmountKrw)보다 작아질 수 있다 — 이 함수는 그 차이를 그대로
 * 노출할 뿐 숨기지 않는다. calculateDividend의 세금 계산 로직은 건드리지 않고, 그 앞단에서
 * quantity를 결정해주는 역할만 한다.
 */
export function resolveDividendQuantity(input: DividendQuantityInput): DividendQuantityResult {
  const { currentPriceKrw } = input;

  if (input.mode === "quantity") {
    const quantity = Math.max(0, Math.floor(input.quantity));
    const actualInvestedAmountKrw = currentPriceKrw > 0 ? quantity * currentPriceKrw : 0;
    return { quantity, actualInvestedAmountKrw };
  }

  const { totalPurchaseAmountKrw } = input;
  const quantity =
    currentPriceKrw > 0 ? Math.max(0, Math.floor(totalPurchaseAmountKrw / currentPriceKrw)) : 0;
  const actualInvestedAmountKrw = quantity * currentPriceKrw;
  return { quantity, actualInvestedAmountKrw, requestedAmountKrw: totalPurchaseAmountKrw };
}

export function calculateDividend(input: DividendCalculatorInput): DividendCalculatorResult {
  const { stockName, quantity, dividendPerShareKrw, isaType, otherFinancialIncomeKrw = 0 } = input;

  const totalDividendKrw = quantity * dividendPerShareKrw;
  const taxFreeLimitKrw = ISA_TYPES[isaType].tax_free_limit_krw;

  const totalFinancialIncomeKrw = totalDividendKrw + otherFinancialIncomeKrw;
  const isComprehensiveTaxationTriggered =
    totalFinancialIncomeKrw > COMPREHENSIVE_TAXATION_THRESHOLD_KRW;
  const marginalTaxRateApplied = isComprehensiveTaxationTriggered
    ? resolveMarginalIncomeTaxRate(totalFinancialIncomeKrw)
    : DOMESTIC_DIVIDEND_WITHHOLDING_RATE;

  const generalDividendTaxKrw = applyGeneralDividendTax(
    totalDividendKrw,
    taxRules,
    marginalTaxRateApplied
  );
  const generalNetReceivedKrw = totalDividendKrw - generalDividendTaxKrw;

  const isaDividendTaxKrw = applyIsaSeparateTax(totalDividendKrw, taxFreeLimitKrw, taxRules);
  const isaNetReceivedKrw = totalDividendKrw - isaDividendTaxKrw;

  const taxSavingKrw = generalDividendTaxKrw - isaDividendTaxKrw;

  return {
    stockName,
    totalDividendKrw,
    taxFreeLimitKrw,
    isComprehensiveTaxationTriggered,
    marginalTaxRateApplied,
    generalDividendTaxKrw,
    generalNetReceivedKrw,
    isaDividendTaxKrw,
    isaNetReceivedKrw,
    taxSavingKrw,
  };
}
