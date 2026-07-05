"use client";

import { useMemo, useState } from "react";
import taxRules from "@/config/tax-rules.json";
import { simulateGeneralAccount } from "@/lib/tax/general-account";
import { simulateIsaAccount } from "@/lib/tax/isa-account";
import { findIsaThresholdPrincipal } from "@/lib/tax/threshold";
import { Header } from "./Header";
import { ConditionInputCard, type TwoWayIsaType } from "./ConditionInputCard";
import { AmountSliderCard } from "./AmountSliderCard";
import { ResultComparisonCard } from "./ResultComparisonCard";
import { Disclaimer } from "./Disclaimer";
import { manwonToKrw } from "./format";
import styles from "./TaxSimulator.module.css";

// design/ui-mockup.html과 동일한 슬라이더 범위(100만원 ~ 10,000만원, 50만원 단위).
const PRINCIPAL_MIN_MANWON = 100;
const PRINCIPAL_MAX_MANWON = 10_000;
const PRINCIPAL_STEP_MANWON = 50;

// Stage 3 UI는 UI_SPEC.md 2절 입력 필드(ISA유형/수익률/보유기간/투자금액)만 다루므로
// 배당수익률·종합과세 관련 입력은 받지 않고 성장주(배당 0)로만 계산한다.
const ANNUAL_DIVIDEND_YIELD_RATE = 0;
const MARGINAL_TAX_RATE_FOR_COMPREHENSIVE_INCOME = 0;

export function TaxSimulator() {
  const [isaType, setIsaType] = useState<TwoWayIsaType>("general");
  const [annualReturnRatePercent, setAnnualReturnRatePercent] = useState(8);
  const [holdingYears, setHoldingYears] = useState(3);
  const [principalManwon, setPrincipalManwon] = useState(3_000);

  const annualReturnRate = annualReturnRatePercent / 100;
  const principalKrw = manwonToKrw(principalManwon);
  const minHoldingYears = taxRules.isa_account.min_holding_years;
  const taxFreeLimitKrw = taxRules.isa_account.types[isaType].tax_free_limit_krw;
  const isEarlyWithdrawal = holdingYears < minHoldingYears;

  const generalResult = useMemo(
    () =>
      simulateGeneralAccount({
        principalKrw,
        annualReturnRate,
        annualDividendYieldRate: ANNUAL_DIVIDEND_YIELD_RATE,
        holdingYears,
        marginalTaxRateForComprehensiveIncome: MARGINAL_TAX_RATE_FOR_COMPREHENSIVE_INCOME,
      }),
    [principalKrw, annualReturnRate, holdingYears]
  );

  const isaResult = useMemo(
    () =>
      simulateIsaAccount({
        principalKrw,
        annualReturnRate,
        annualDividendYieldRate: ANNUAL_DIVIDEND_YIELD_RATE,
        holdingYears,
        isaType,
      }),
    [principalKrw, annualReturnRate, holdingYears, isaType]
  );

  const thresholdResult = useMemo(
    () => findIsaThresholdPrincipal({ annualReturnRate, holdingYears, taxFreeLimitKrw }),
    [annualReturnRate, holdingYears, taxFreeLimitKrw]
  );

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <Header />
        <ConditionInputCard
          isaType={isaType}
          onIsaTypeChange={setIsaType}
          annualReturnRatePercent={annualReturnRatePercent}
          onAnnualReturnRatePercentChange={setAnnualReturnRatePercent}
          holdingYears={holdingYears}
          onHoldingYearsChange={setHoldingYears}
        />
        <AmountSliderCard
          principalManwon={principalManwon}
          onPrincipalManwonChange={setPrincipalManwon}
          min={PRINCIPAL_MIN_MANWON}
          max={PRINCIPAL_MAX_MANWON}
          step={PRINCIPAL_STEP_MANWON}
          thresholdResult={thresholdResult}
          taxFreeLimitKrw={taxFreeLimitKrw}
          isEarlyWithdrawal={isEarlyWithdrawal}
          minHoldingYears={minHoldingYears}
          separateTaxRate={taxRules.isa_account.separate_tax_rate_over_limit}
        />
        <ResultComparisonCard
          generalResult={generalResult}
          isaResult={isaResult}
          minHoldingYears={minHoldingYears}
        />
        <Disclaimer />
      </div>
    </div>
  );
}
