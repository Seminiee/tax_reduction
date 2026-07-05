export interface FindIsaThresholdPrincipalInput {
  /** 연간 총 기대수익률 (예: 0.08 = 8%) */
  annualReturnRate: number;
  /** 보유기간 (년) */
  holdingYears: number;
  /** ISA 비과세 한도 (KRW) — 호출부에서 isaType에 맞는 config 값을 조회해 전달한다. */
  taxFreeLimitKrw: number;
}

export type FindIsaThresholdPrincipalResult =
  | { kind: "found"; thresholdPrincipalKrw: number }
  /**
   * 연수익률이 0% 이하라 growthFactor가 0 또는 음수인 경우: 이 조건에서는 어떤 투자금액을
   * 넣어도 실현 수익이 0을 넘지 않으므로 비과세 한도를 초과하는 금액이 존재하지 않는다.
   * (UI_SPEC.md 4절 "슬라이더 전 구간이 안전" 상태와 동일하게 처리하면 된다.)
   */
  | { kind: "no-threshold-non-positive-growth" };

/**
 * "투자금액을 얼마 이상 넣으면 실현 수익이 ISA 비과세 한도를 넘는가"를 역산하는 순수함수.
 * UI_SPEC.md 3절 공식을 그대로 구현한다:
 *   growthFactor = (1 + 연수익률)^보유기간 - 1
 *   threshold_투자금액 = ISA_비과세한도 / growthFactor
 * Stage 3 슬라이더 UI가 마커 위치 계산에 그대로 사용하므로 별도 파일로 분리되어 있다.
 */
export function findIsaThresholdPrincipal(
  input: FindIsaThresholdPrincipalInput
): FindIsaThresholdPrincipalResult {
  const { annualReturnRate, holdingYears, taxFreeLimitKrw } = input;
  const growthFactor = Math.pow(1 + annualReturnRate, holdingYears) - 1;

  if (growthFactor <= 0) {
    return { kind: "no-threshold-non-positive-growth" };
  }

  return { kind: "found", thresholdPrincipalKrw: taxFreeLimitKrw / growthFactor };
}
