import taxRules from "@/config/tax-rules.json";
import { applyGeneralCapitalGainsTax, applyIsaSeparateTax } from "./rate-engine";
import type { IsaAccountType } from "./isa-account";

const { annual_contribution_limit_krw: ANNUAL_CONTRIBUTION_LIMIT_KRW, types: ISA_TYPES } =
  taxRules.isa_account;

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
 * 매매차익 모델 순수함수. design/ui_mockup_mk.html의 updateUI() 흐름(연간 납입한도 초과 시
 * 초과 수량을 일반계좌 규칙으로 강제 전환)을 그대로 따르되, 세액은 rate-engine.ts의
 * applyGeneralCapitalGainsTax/applyIsaSeparateTax(config 기반 22%+기본공제, 9.9% 분리과세)로 계산한다.
 * skills.md 6절: ISA 3년 의무유지 조건을 충족했다고 가정하며, 금융소득종합과세는 다루지 않는다.
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
  const generalForcedTaxKrw =
    generalQuantity > 0 ? applyGeneralCapitalGainsTax(netGainForGeneralForcedKrw, taxRules) : 0;

  const netGainAllGeneralKrw = netGain(expectedProfitPerShareKrw, expectedLossPerShareKrw, quantity);
  const generalOnlyTaxKrw = applyGeneralCapitalGainsTax(netGainAllGeneralKrw, taxRules);

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
    generalForcedTaxKrw,
    generalOnlyTaxKrw,
    totalTaxKrw,
    savedAmountKrw,
  };
}
