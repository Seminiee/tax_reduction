import taxRules from "@/config/tax-rules.json";

const {
  capital_gains_tax_rate: CAPITAL_GAINS_TAX_RATE,
  annual_basic_deduction_krw: ANNUAL_BASIC_DEDUCTION_KRW,
  domestic_dividend_withholding_rate: DOMESTIC_DIVIDEND_WITHHOLDING_RATE,
  foreign_withholding_rate_us: FOREIGN_WITHHOLDING_RATE_US,
  comprehensive_taxation_threshold_krw: COMPREHENSIVE_TAXATION_THRESHOLD_KRW,
} = taxRules.general_account;

export interface GeneralAccountSimulationInput {
  /** 투자 원금 (KRW) */
  principalKrw: number;
  /** 연간 총 기대수익률 (예: 0.08 = 8%). 시세차익 + 배당을 합한 총수익률. */
  annualReturnRate: number;
  /** 연간 배당/분배금 수익률 (예: 0.02 = 2%). annualReturnRate 중 현금으로 지급되는 부분. 성장주만 시뮬레이션할 경우 0. */
  annualDividendYieldRate: number;
  /** 보유기간 (년) */
  holdingYears: number;
  /**
   * 사용자의 종합소득세 한계세율 (예: 0.42). 연간 배당소득이
   * config의 comprehensive_taxation_threshold_krw(금융소득종합과세 기준)를 초과하는 해에만
   * 초과분에 적용된다고 가정한다. 해당 연도가 없다면 이 값은 결과에 영향을 주지 않는다.
   */
  marginalTaxRateForComprehensiveIncome: number;
}

export interface GeneralAccountYearBreakdown {
  year: number;
  startBalance: number;
  dividendIncome: number;
  capitalGrowth: number;
  foreignWithholdingTax: number;
  domesticDividendTax: number;
  isComprehensiveTaxationTriggered: boolean;
  afterTaxDividend: number;
  endBalance: number;
  costBasis: number;
}

export interface GeneralAccountResult {
  finalBalanceBeforeTax: number;
  costBasisAtSale: number;
  realizedCapitalGain: number;
  taxableCapitalGain: number;
  capitalGainsTax: number;
  totalDividendTax: number;
  totalTax: number;
  finalAfterTaxValue: number;
  yearlyBreakdown: GeneralAccountYearBreakdown[];
}

/**
 * 일반 해외주식 계좌(직접투자) 세후수익 시뮬레이션.
 * skills.md 1절 A, 3절 가정 반영: 배당은 매년 원천징수 후 세후 금액으로 즉시 재투자하고,
 * 매매차익은 보유기간 종료 시점 단일 매도로 실현한다고 가정한다(손익통산은 이 단일 실현 시점에 자연스럽게 반영됨).
 */
export function simulateGeneralAccount(
  input: GeneralAccountSimulationInput
): GeneralAccountResult {
  const {
    principalKrw,
    annualReturnRate,
    annualDividendYieldRate,
    holdingYears,
    marginalTaxRateForComprehensiveIncome,
  } = input;

  let balance = principalKrw;
  let costBasis = principalKrw;
  let totalDividendTax = 0;
  const yearlyBreakdown: GeneralAccountYearBreakdown[] = [];

  for (let year = 1; year <= holdingYears; year++) {
    const startBalance = balance;
    const dividendIncome = startBalance * annualDividendYieldRate;
    const capitalGrowth = startBalance * (annualReturnRate - annualDividendYieldRate);

    const foreignWithholdingTax = dividendIncome * FOREIGN_WITHHOLDING_RATE_US;

    const isComprehensiveTaxationTriggered =
      dividendIncome > COMPREHENSIVE_TAXATION_THRESHOLD_KRW;
    const thresholdPortion = isComprehensiveTaxationTriggered
      ? COMPREHENSIVE_TAXATION_THRESHOLD_KRW
      : dividendIncome;
    const excessPortion = isComprehensiveTaxationTriggered
      ? dividendIncome - COMPREHENSIVE_TAXATION_THRESHOLD_KRW
      : 0;

    // 기준 이내: 현지 원천세로 종결(분리과세), 국내 세율까지만 차액 추가 과세.
    const domesticTaxOnThresholdPortion =
      thresholdPortion *
      Math.max(0, DOMESTIC_DIVIDEND_WITHHOLDING_RATE - FOREIGN_WITHHOLDING_RATE_US);
    // 기준 초과분: 종합과세로 전환되어 한계세율 적용, 이미 낸 현지세는 세액공제로 차감.
    const domesticTaxOnExcessPortion =
      excessPortion *
      Math.max(0, marginalTaxRateForComprehensiveIncome - FOREIGN_WITHHOLDING_RATE_US);
    const domesticDividendTax = domesticTaxOnThresholdPortion + domesticTaxOnExcessPortion;

    const afterTaxDividend = dividendIncome - foreignWithholdingTax - domesticDividendTax;
    const endBalance = startBalance + capitalGrowth + afterTaxDividend;

    costBasis += afterTaxDividend;
    totalDividendTax += foreignWithholdingTax + domesticDividendTax;

    yearlyBreakdown.push({
      year,
      startBalance,
      dividendIncome,
      capitalGrowth,
      foreignWithholdingTax,
      domesticDividendTax,
      isComprehensiveTaxationTriggered,
      afterTaxDividend,
      endBalance,
      costBasis,
    });

    balance = endBalance;
  }

  const finalBalanceBeforeTax = balance;
  const realizedCapitalGain = finalBalanceBeforeTax - costBasis;
  const taxableCapitalGain = Math.max(0, realizedCapitalGain - ANNUAL_BASIC_DEDUCTION_KRW);
  const capitalGainsTax = taxableCapitalGain * CAPITAL_GAINS_TAX_RATE;
  const totalTax = totalDividendTax + capitalGainsTax;
  const finalAfterTaxValue = finalBalanceBeforeTax - capitalGainsTax;

  return {
    finalBalanceBeforeTax,
    costBasisAtSale: costBasis,
    realizedCapitalGain,
    taxableCapitalGain,
    capitalGainsTax,
    totalDividendTax,
    totalTax,
    finalAfterTaxValue,
    yearlyBreakdown,
  };
}
