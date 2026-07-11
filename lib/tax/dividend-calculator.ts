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
 * otherFinancialIncomeKrw가 0(기본값)이면 이 배당금 단독으로 종합과세 여부를 판단하지 않고
 * 국내 배당소득세율(15.4%)을 그대로 한계세율 자리에 대입한다 — applyGeneralDividendTax의
 * 임계값 분리 계산식은 대입한 세율이 국내세율과 같을 때 대수적으로 정확히
 * totalDividendKrw * 15.4%로 귀결되므로, 로직을 중복 구현하지 않고도 "고정 15.4%"를 만족한다.
 */
export function calculateDividend(input: DividendCalculatorInput): DividendCalculatorResult {
  const { stockName, quantity, dividendPerShareKrw, isaType, otherFinancialIncomeKrw = 0 } = input;

  const totalDividendKrw = quantity * dividendPerShareKrw;
  const taxFreeLimitKrw = ISA_TYPES[isaType].tax_free_limit_krw;

  const totalFinancialIncomeKrw = totalDividendKrw + otherFinancialIncomeKrw;
  const isComprehensiveTaxationTriggered =
    otherFinancialIncomeKrw > 0 && totalFinancialIncomeKrw > COMPREHENSIVE_TAXATION_THRESHOLD_KRW;
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
