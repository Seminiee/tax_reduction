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
