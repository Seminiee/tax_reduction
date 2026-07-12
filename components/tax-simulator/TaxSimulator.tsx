"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import taxRules from "@/config/tax-rules.json";
import { simulateGeneralAccount } from "@/lib/tax/general-account";
import { simulateIsaAccount } from "@/lib/tax/isa-account";
import { findIsaThresholdPrincipal } from "@/lib/tax/threshold";
import { useChatContext } from "@/components/chat/ChatContext";
import { Header } from "./Header";
import { ConditionInputCard, type TwoWayIsaType } from "./ConditionInputCard";
import { AmountSliderCard } from "./AmountSliderCard";
import { ResultComparisonCard } from "./ResultComparisonCard";
import { NaturalLanguageInputCard } from "./NaturalLanguageInputCard";
import { AiExplanationPanel } from "./AiExplanationPanel";
import { Disclaimer } from "./Disclaimer";
import { krwToManwon, manwonToKrw } from "./format";
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

  const handleApplyNaturalLanguage = useCallback(async (text: string) => {
    const res = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message ?? "지금은 AI로 조건을 채울 수 없어요. 직접 입력해 주세요.");
    }

    setAnnualReturnRatePercent(Math.round(data.annualReturnRate * 1000) / 10);
    setHoldingYears(data.holdingYears);
    setPrincipalManwon(
      Math.min(
        PRINCIPAL_MAX_MANWON,
        Math.max(PRINCIPAL_MIN_MANWON, Math.round(krwToManwon(data.principalKrw)))
      )
    );
    // Stage 3 UI는 2단 토글(일반형/서민형)만 지원하므로 farmer는 general로 대체한다.
    setIsaType(data.isaType === "low_income" ? "low_income" : "general");
  }, []);

  const handleExplain = useCallback(async () => {
    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "hold",
        input: { principalKrw, annualReturnRate, holdingYears, isaType },
        generalAccount: {
          finalAfterTaxValue: generalResult.finalAfterTaxValue,
          totalTax: generalResult.totalTax,
          capitalGainsTax: generalResult.capitalGainsTax,
          totalDividendTax: generalResult.totalDividendTax,
        },
        isaAccount: {
          finalAfterTaxValue: isaResult.finalAfterTaxValue,
          tax: isaResult.tax,
          isEarlyWithdrawal: isaResult.isEarlyWithdrawal,
          taxableExcess: isaResult.taxableExcess,
          taxFreeLimitKrw: isaResult.taxFreeLimitKrw,
        },
        verificationStatus: taxRules.verification_status,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        data.message ?? "지금은 AI 설명을 불러올 수 없어요, 계산 결과는 위에서 확인하세요."
      );
    }
    return data.explanation as string;
  }, [principalKrw, annualReturnRate, holdingYears, isaType, generalResult, isaResult]);

  const { setCurrentSimulation } = useChatContext();

  const currentSimulation = useMemo(
    () => ({
      kind: "hold" as const,
      request: {
        principalKrw,
        annualReturnRate,
        annualDividendYieldRate: ANNUAL_DIVIDEND_YIELD_RATE,
        holdingYears,
        isaType,
        annualFinancialIncomeKrw: 0,
      },
      response: {
        generalAccount: {
          finalAfterTaxValue: generalResult.finalAfterTaxValue,
          totalTax: generalResult.totalTax,
        },
        isaAccount: {
          finalAfterTaxValue: isaResult.finalAfterTaxValue,
          tax: isaResult.tax,
          isEarlyWithdrawal: isaResult.isEarlyWithdrawal,
          taxableExcess: isaResult.taxableExcess,
          taxFreeLimitKrw: isaResult.taxFreeLimitKrw,
        },
        verificationStatus: taxRules.verification_status,
      },
    }),
    [principalKrw, annualReturnRate, holdingYears, isaType, generalResult, isaResult]
  );

  // Stage 7: 챗봇이 layout 레벨 공유 컴포넌트로 이동했으므로, 이 페이지의 최신 시뮬레이션
  // 조건을 공유 컨텍스트에 계속 밀어 넣어야 챗봇이 "방금 계산한 조건"을 참조할 수 있다.
  // 이 페이지를 벗어나면(언마운트) 다른 도구의 컨텍스트와 섞이지 않도록 비워준다.
  useEffect(() => {
    setCurrentSimulation(currentSimulation);
    return () => setCurrentSimulation(null);
  }, [currentSimulation, setCurrentSimulation]);

  return (
    <div className={styles.page}>
      <div className={styles.wrap}>
        <Header />
        <NaturalLanguageInputCard onApply={handleApplyNaturalLanguage} />
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
        <AiExplanationPanel onExplain={handleExplain} />
        <Disclaimer />
      </div>
    </div>
  );
}
