import taxRules from "@/config/tax-rules.json";
import { applyIsaSeparateTax } from "./rate-engine";

const {
  types: ISA_TYPES,
  min_holding_years: MIN_HOLDING_YEARS,
  foreign_dividend_pre_refund_abolished: FOREIGN_DIVIDEND_PRE_REFUND_ABOLISHED,
} = taxRules.isa_account;
const {
  foreign_withholding_rate_us: FOREIGN_WITHHOLDING_RATE_US,
  domestic_dividend_withholding_rate: DOMESTIC_DIVIDEND_WITHHOLDING_RATE,
} = taxRules.general_account;

export type IsaAccountType = keyof typeof ISA_TYPES;

export interface IsaAccountSimulationInput {
  /** 투자 원금 (KRW) */
  principalKrw: number;
  /** 연간 총 기대수익률 (예: 0.08 = 8%) */
  annualReturnRate: number;
  /** 연간 배당/분배금 수익률 (예: 0.02 = 2%). 성장주만 시뮬레이션할 경우 0. */
  annualDividendYieldRate: number;
  /** 보유기간 (년) */
  holdingYears: number;
  /** ISA 유형: 일반형/서민형/농어민형 (config의 isa_account.types 키) */
  isaType: IsaAccountType;
}

export interface IsaAccountYearBreakdown {
  year: number;
  startBalance: number;
  dividendIncome: number;
  capitalGrowth: number;
  foreignWithholdingTaxOnDividend: number;
  reinvestedDividend: number;
  endBalance: number;
}

export interface IsaAccountResult {
  finalBalanceBeforeTax: number;
  netGain: number;
  isEarlyWithdrawal: boolean;
  taxFreeLimitKrw: number;
  taxableExcess: number;
  tax: number;
  finalAfterTaxValue: number;
  yearlyBreakdown: IsaAccountYearBreakdown[];
}

/**
 * ISA 계좌(국내상장 해외ETF) 세후수익 시뮬레이션.
 * skills.md 1절 B, 3절 가정 반영: 계좌 내 매매차익+분배금은 보유기간 종료 시점에 통산하여
 * 과세하고(연도별 국내 과세 없음), 의무가입기간(3년) 미충족 시 혜택이 전부 취소된다.
 */
export function simulateIsaAccount(input: IsaAccountSimulationInput): IsaAccountResult {
  const { principalKrw, annualReturnRate, annualDividendYieldRate, holdingYears, isaType } =
    input;

  let balance = principalKrw;
  const yearlyBreakdown: IsaAccountYearBreakdown[] = [];

  for (let year = 1; year <= holdingYears; year++) {
    const startBalance = balance;
    const dividendIncome = startBalance * annualDividendYieldRate;
    const capitalGrowth = startBalance * (annualReturnRate - annualDividendYieldRate);

    // 2025년 이후 ISA 해외배당 원천세 선환급 폐지(config: foreign_dividend_pre_refund_abolished):
    // 폐지된 경우 현지 원천세를 뗀 순액만 재투자되어 과세이연 복리효과가 줄어든다.
    // 폐지되지 않았다면(과거 정책) 원천세를 즉시 환급받아 총액 그대로 재투자된다고 가정한다.
    const foreignWithholdingTaxOnDividend = FOREIGN_DIVIDEND_PRE_REFUND_ABOLISHED
      ? dividendIncome * FOREIGN_WITHHOLDING_RATE_US
      : 0;
    const reinvestedDividend = dividendIncome - foreignWithholdingTaxOnDividend;

    const endBalance = startBalance + capitalGrowth + reinvestedDividend;

    yearlyBreakdown.push({
      year,
      startBalance,
      dividendIncome,
      capitalGrowth,
      foreignWithholdingTaxOnDividend,
      reinvestedDividend,
      endBalance,
    });

    balance = endBalance;
  }

  const finalBalanceBeforeTax = balance;
  const netGain = finalBalanceBeforeTax - principalKrw;
  const isEarlyWithdrawal = holdingYears < MIN_HOLDING_YEARS;
  const taxFreeLimitKrw = ISA_TYPES[isaType].tax_free_limit_krw;

  let taxableExcess = 0;
  let tax: number;

  if (isEarlyWithdrawal) {
    // 의무가입기간 미충족: ISA 세제 혜택 전부 취소, 일반 금융소득 원천징수(15.4%)로 과세 종결.
    // 종합과세 해당 가능성은 skills.md 1절 B에 따라 본 시뮬레이터 범위 밖으로 별도 모델링하지 않는다.
    tax = Math.max(0, netGain) * DOMESTIC_DIVIDEND_WITHHOLDING_RATE;
  } else {
    taxableExcess = Math.max(0, netGain - taxFreeLimitKrw);
    tax = applyIsaSeparateTax(netGain, taxFreeLimitKrw, taxRules);
  }

  const finalAfterTaxValue = finalBalanceBeforeTax - tax;

  return {
    finalBalanceBeforeTax,
    netGain,
    isEarlyWithdrawal,
    taxFreeLimitKrw,
    taxableExcess,
    tax,
    finalAfterTaxValue,
    yearlyBreakdown,
  };
}
