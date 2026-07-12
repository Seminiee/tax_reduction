import taxRules from "@/config/tax-rules.json";
import { applyGeneralDividendTax, applyIsaSeparateTax } from "./rate-engine";
import { resolveMarginalIncomeTaxRate } from "./income-tax-brackets";
import type { IsaAccountType } from "./isa-account";

const { annual_contribution_limit_krw: ANNUAL_CONTRIBUTION_LIMIT_KRW, types: ISA_TYPES } =
  taxRules.isa_account;
const {
  comprehensive_taxation_threshold_krw: COMPREHENSIVE_TAXATION_THRESHOLD_KRW,
  domestic_dividend_withholding_rate: DOMESTIC_DIVIDEND_WITHHOLDING_RATE,
} = taxRules.general_account;

export interface TradeCalculatorInput {
  /** 종목 현재 주가 (KRW) */
  currentPriceKrw: number;
  /** 주당 예상 이익 (KRW, 0 이상) */
  expectedProfitPerShareKrw: number;
  /** 주당 예상 손실 (KRW, 0 이상인 크기값 — 부호 없이 손실 폭만 입력) */
  expectedLossPerShareKrw: number;
  /** 매수 수량 */
  quantity: number;
  /** ISA 유형: 일반형/서민형/농어민형 (config의 isa_account.types 키) */
  isaType: IsaAccountType;
}

export interface TradeCalculatorResult {
  totalInvestKrw: number;
  annualContributionLimitKrw: number;
  /** 연간 납입한도(annual_contribution_limit_krw) 초과 여부 */
  isExceedingContributionLimit: boolean;
  /** ISA 계좌로 편입 가능한 수량 (한도 초과 시 한도 이내로 축소됨) */
  isaQuantity: number;
  /** 한도 초과로 일반계좌 규칙이 강제 적용되는 수량 */
  generalQuantity: number;
  taxFreeLimitKrw: number;
  /** ISA 편입 수량 기준 손익통산 후 순이익 (손실 있으면 상계, 0 미만은 0) */
  netGainForIsaKrw: number;
  isaTaxKrw: number;
  /** 강제전환분(generalQuantity)의 순이익이 금융소득종합과세 기준(2,000만원)을 넘는지 */
  isComprehensiveTaxationTriggered: boolean;
  /** 강제전환분에 실제로 적용된 한계세율 (종합과세 미대상이면 국내 배당소득세율 15.4%와 동일) */
  marginalTaxRateApplied: number;
  /** 한도 초과분(generalQuantity)에 일반계좌 규칙을 적용했을 때의 세금 */
  generalForcedTaxKrw: number;
  /** 비교용: 전량을 일반계좌로만 매매했다고 가정했을 때의 세금 */
  generalOnlyTaxKrw: number;
  /** 실제로 발생하는 총 세금 (isaTaxKrw + generalForcedTaxKrw) */
  totalTaxKrw: number;
  /** 일반계좌 대비 절세액 (max(0, generalOnlyTaxKrw - totalTaxKrw)) */
  savedAmountKrw: number;
}

function netGain(profitPerShareKrw: number, lossPerShareKrw: number, quantity: number): number {
  return Math.max(0, (profitPerShareKrw - lossPerShareKrw) * quantity);
}

/**
 * 순이익 금액에 일반계좌 세금을 적용한다. 이 서비스가 다루는 대상은 국내상장 해외ETF이므로
 * (skills.md 1절 C) 매매차익도 분배금과 동일하게 배당소득세 15.4% + 금융소득종합과세
 * 한계세율 구조로 과세된다 — dividend-calculator.ts의 calculateDividend와 완전히 같은 방식으로
 * comprehensive_taxation_threshold_krw(2,000만원) 초과 여부를 판단하고 rate-engine.ts의
 * applyGeneralDividendTax를 재사용한다. otherFinancialIncomeKrw 같은 추가 입력 없이 이 순이익
 * 금액 자체만으로 임계값을 판단한다(Stage 19의 배당금 계산기와 동일한 단순화 원칙).
 */
function applyGeneralTax(netGainKrw: number): {
  taxKrw: number;
  isComprehensiveTaxationTriggered: boolean;
  marginalTaxRateApplied: number;
} {
  const isComprehensiveTaxationTriggered = netGainKrw > COMPREHENSIVE_TAXATION_THRESHOLD_KRW;
  const marginalTaxRateApplied = isComprehensiveTaxationTriggered
    ? resolveMarginalIncomeTaxRate(netGainKrw)
    : DOMESTIC_DIVIDEND_WITHHOLDING_RATE;
  const taxKrw = applyGeneralDividendTax(netGainKrw, taxRules, marginalTaxRateApplied);
  return { taxKrw, isComprehensiveTaxationTriggered, marginalTaxRateApplied };
}

/**
 * 매매차익 모델 순수함수. design/ui_mockup_mk.html의 updateUI() 흐름(연간 납입한도 초과 시
 * 초과 수량을 일반계좌 규칙으로 강제 전환)을 그대로 따르되, 세액은 rate-engine.ts의
 * applyGeneralDividendTax/applyIsaSeparateTax(config 기반 15.4%+한계세율, 9.9% 분리과세)로
 * 계산한다. skills.md 1절: ISA 3년 의무유지 조건을 충족했다고 가정한다.
 *
 * Stage 27: 이전에는 일반계좌 쪽에 applyGeneralCapitalGainsTax(22%+250만원 기본공제, 해외
 * 거래소 직접상장 종목 매수 시나리오의 세율)를 잘못 적용하고 있었다. 이 서비스가 실제로 다루는
 * 대상은 국내상장 해외ETF이므로 배당소득세 15.4%(금융소득종합과세 대상)가 맞다 — 22%+기본공제
 * 모델은 lib/tax/general-account.ts(거치식 도구, 여전히 해외 직접상장 가정이 유효해 변경하지
 * 않음)에만 남아있다.
 */
export function calculateTrade(input: TradeCalculatorInput): TradeCalculatorResult {
  const { currentPriceKrw, expectedProfitPerShareKrw, expectedLossPerShareKrw, quantity, isaType } =
    input;

  const annualContributionLimitKrw = ANNUAL_CONTRIBUTION_LIMIT_KRW;
  const taxFreeLimitKrw = ISA_TYPES[isaType].tax_free_limit_krw;

  const totalInvestKrw = currentPriceKrw * quantity;
  const isExceedingContributionLimit = totalInvestKrw > annualContributionLimitKrw;

  const isaQuantity = isExceedingContributionLimit
    ? Math.floor(annualContributionLimitKrw / currentPriceKrw)
    : quantity;
  const generalQuantity = quantity - isaQuantity;

  const netGainForIsaKrw = netGain(expectedProfitPerShareKrw, expectedLossPerShareKrw, isaQuantity);
  const isaTaxKrw = applyIsaSeparateTax(netGainForIsaKrw, taxFreeLimitKrw, taxRules);

  const netGainForGeneralForcedKrw = netGain(
    expectedProfitPerShareKrw,
    expectedLossPerShareKrw,
    generalQuantity
  );
  const forcedTax = applyGeneralTax(netGainForGeneralForcedKrw);
  const generalForcedTaxKrw = generalQuantity > 0 ? forcedTax.taxKrw : 0;

  const netGainAllGeneralKrw = netGain(expectedProfitPerShareKrw, expectedLossPerShareKrw, quantity);
  const generalOnlyTaxKrw = applyGeneralTax(netGainAllGeneralKrw).taxKrw;

  const totalTaxKrw = isaTaxKrw + generalForcedTaxKrw;
  const savedAmountKrw = Math.max(0, generalOnlyTaxKrw - totalTaxKrw);

  return {
    totalInvestKrw,
    annualContributionLimitKrw,
    isExceedingContributionLimit,
    isaQuantity,
    generalQuantity,
    taxFreeLimitKrw,
    netGainForIsaKrw,
    isaTaxKrw,
    isComprehensiveTaxationTriggered: forcedTax.isComprehensiveTaxationTriggered,
    marginalTaxRateApplied: forcedTax.marginalTaxRateApplied,
    generalForcedTaxKrw,
    generalOnlyTaxKrw,
    totalTaxKrw,
    savedAmountKrw,
  };
}
