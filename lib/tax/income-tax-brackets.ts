import taxRules from "@/config/tax-rules.json";

const { brackets: BRACKETS } = taxRules.national_income_tax_brackets;

/**
 * 종합소득세 누진세율표(config: national_income_tax_brackets)에서 과세표준에 해당하는
 * 한계세율(marginal rate)을 찾는다. 각 구간은 up_to_krw(해당 구간의 상한, 최고 구간은 null)로
 * 정의되며, 누진공제를 반영한 전체 세액은 계산하지 않고 한계세율만 반환한다
 * (general-account.ts가 금융소득종합과세 초과분에 적용할 세율로 사용).
 */
export function resolveMarginalIncomeTaxRate(taxableIncomeKrw: number): number {
  for (const bracket of BRACKETS) {
    if (bracket.up_to_krw === null || taxableIncomeKrw <= bracket.up_to_krw) {
      return bracket.rate;
    }
  }
  return BRACKETS[BRACKETS.length - 1].rate;
}
