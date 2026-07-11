import taxRules from "@/config/tax-rules.json";

export interface GeneralCapitalGainsTaxConfig {
  general_account: {
    capital_gains_tax_rate: number;
    annual_basic_deduction_krw: number;
  };
}

export interface IsaSeparateTaxConfig {
  isa_account: {
    separate_tax_rate_over_limit: number;
  };
}

export interface GeneralDividendTaxConfig {
  general_account: {
    domestic_dividend_withholding_rate: number;
    foreign_withholding_rate_us: number;
    comprehensive_taxation_threshold_krw: number;
  };
}

export type RateEngineConfig = typeof taxRules;

/**
 * 일반 해외주식 계좌 양도소득세: 순이익에서 연 기본공제를 뺀 뒤 양도소득세율을 곱한다.
 * skills.md 1절 A / general-account.ts의 기존 인라인 계산식을 그대로 옮긴 것이다.
 */
export function applyGeneralCapitalGainsTax(
  netGainKrw: number,
  config: GeneralCapitalGainsTaxConfig
): number {
  const { capital_gains_tax_rate, annual_basic_deduction_krw } = config.general_account;
  return Math.max(0, netGainKrw - annual_basic_deduction_krw) * capital_gains_tax_rate;
}

/**
 * ISA 계좌 분리과세: 순이익에서 비과세 한도를 뺀 초과분에 분리과세율을 곱한다.
 * skills.md 1절 B / isa-account.ts의 기존 인라인 계산식(중도해지가 아닌 경우)을 그대로 옮긴 것이다.
 */
export function applyIsaSeparateTax(
  netGainKrw: number,
  taxFreeLimitKrw: number,
  config: IsaSeparateTaxConfig
): number {
  const { separate_tax_rate_over_limit } = config.isa_account;
  return Math.max(0, netGainKrw - taxFreeLimitKrw) * separate_tax_rate_over_limit;
}

/**
 * 일반 해외주식 계좌 배당소득세: 현지 원천징수(보통 15%) 후 국내 배당소득세 15.4% 기준으로
 * 정산하되, 금융소득종합과세 기준(comprehensive_taxation_threshold_krw) 초과분에는
 * marginalTaxRateForComprehensiveIncome(현지세율 차감)을 적용한다.
 * general-account.ts의 기존 인라인 계산식(연도별 배당세 로직)을 그대로 옮긴 것이다.
 */
export function applyGeneralDividendTax(
  totalDividendKrw: number,
  config: GeneralDividendTaxConfig,
  marginalTaxRateForComprehensiveIncome: number
): number {
  const {
    domestic_dividend_withholding_rate,
    foreign_withholding_rate_us,
    comprehensive_taxation_threshold_krw,
  } = config.general_account;

  const foreignWithholdingTax = totalDividendKrw * foreign_withholding_rate_us;

  const isComprehensiveTaxationTriggered = totalDividendKrw > comprehensive_taxation_threshold_krw;
  const thresholdPortion = isComprehensiveTaxationTriggered
    ? comprehensive_taxation_threshold_krw
    : totalDividendKrw;
  const excessPortion = isComprehensiveTaxationTriggered
    ? totalDividendKrw - comprehensive_taxation_threshold_krw
    : 0;

  const domesticTaxOnThresholdPortion =
    thresholdPortion * Math.max(0, domestic_dividend_withholding_rate - foreign_withholding_rate_us);
  const domesticTaxOnExcessPortion =
    excessPortion * Math.max(0, marginalTaxRateForComprehensiveIncome - foreign_withholding_rate_us);
  const domesticDividendTax = domesticTaxOnThresholdPortion + domesticTaxOnExcessPortion;

  return foreignWithholdingTax + domesticDividendTax;
}
