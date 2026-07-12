"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import taxRules from "@/config/tax-rules.json";
import { calculateTrade } from "@/lib/tax/trade-calculator";
import { useChatContext } from "@/components/chat/ChatContext";
import { Header } from "./Header";
import { IsaTypeToggle, type TwoWayIsaType } from "./IsaTypeToggle";
import { ScenarioForm, QUANTITY_MAX } from "./ScenarioForm";
import { ResultPanel } from "./ResultPanel";
import { NaturalLanguageInputCard } from "./NaturalLanguageInputCard";
import { AiExplanationPanel } from "./AiExplanationPanel";
import { Disclaimer } from "./Disclaimer";

export function TradeCalculator() {
  // Stage 25: 개별 해외주식/모호한 표현 대신 실제 존재하는 국내상장 ETF로 예시를 교체.
  // 수량×주가가 연간 납입한도(2,000만원)를 넘도록 유지해 기본 화면에서 한도초과 배너를 보여준다.
  // (2만원×1,500주=3,000만원, 주당 3,000원 이익 — 세금/절세액이 정확히 0원인 경계값을 피해
  // 실제 절세 효과를 보여주도록 선택함)
  const [stockName, setStockName] = useState("TIGER 미국S&P500");
  const [currentPriceKrw, setCurrentPriceKrw] = useState(20_000);
  const [expectedProfitPerShareKrw, setExpectedProfitPerShareKrw] = useState(3_000);
  const [expectedLossPerShareKrw, setExpectedLossPerShareKrw] = useState(0);
  const [quantity, setQuantity] = useState(1_500);
  const [isaType, setIsaType] = useState<TwoWayIsaType>("general");

  const result = useMemo(
    () =>
      calculateTrade({
        currentPriceKrw,
        expectedProfitPerShareKrw,
        expectedLossPerShareKrw,
        quantity,
        isaType,
      }),
    [currentPriceKrw, expectedProfitPerShareKrw, expectedLossPerShareKrw, quantity, isaType]
  );

  // 하단 세금 비교 막대의 100% 기준값: 슬라이더 최대 수량일 때의 일반계좌 세금(이론상 최댓값).
  const theoreticalMaxTaxKrw = useMemo(
    () =>
      calculateTrade({
        currentPriceKrw,
        expectedProfitPerShareKrw,
        expectedLossPerShareKrw,
        quantity: QUANTITY_MAX,
        isaType,
      }).generalOnlyTaxKrw,
    [currentPriceKrw, expectedProfitPerShareKrw, expectedLossPerShareKrw, isaType]
  );

  const handleApplyNaturalLanguage = useCallback(async (text: string) => {
    const res = await fetch("/api/parse-trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message ?? "지금은 AI로 조건을 채울 수 없어요. 직접 입력해 주세요.");
    }

    setStockName(data.stockName);
    setCurrentPriceKrw(data.currentPriceKrw);
    setExpectedProfitPerShareKrw(data.expectedProfitPerShareKrw);
    setExpectedLossPerShareKrw(data.expectedLossPerShareKrw);
    setQuantity(Math.min(QUANTITY_MAX, Math.max(1, Math.round(data.quantity))));
    // Stage 3 UI는 2단 토글(일반형/서민형)만 지원하므로 farmer는 general로 대체한다(거치식 도구와 동일 컨벤션).
    setIsaType(data.isaType === "low_income" ? "low_income" : "general");
  }, []);

  // Stage 21: `/`로 통합되며 신규 추가된 "AI 설명 보기" 섹션이 호출하는 explain(v2: trade).
  const handleExplain = useCallback(async () => {
    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "trade",
        input: {
          stockName,
          currentPriceKrw,
          expectedProfitPerShareKrw,
          expectedLossPerShareKrw,
          quantity,
          isaType,
        },
        result: {
          totalInvestKrw: result.totalInvestKrw,
          // Stage 23: 이전까지 이 필드가 빠져있어 AI가 taxFreeLimitKrw와 혼동하는 원인이 됐다.
          annualContributionLimitKrw: result.annualContributionLimitKrw,
          isExceedingContributionLimit: result.isExceedingContributionLimit,
          isaQuantity: result.isaQuantity,
          generalQuantity: result.generalQuantity,
          taxFreeLimitKrw: result.taxFreeLimitKrw,
          netGainForIsaKrw: result.netGainForIsaKrw,
          isaTaxKrw: result.isaTaxKrw,
          // Stage 27: 강제전환분에 15.4%/한계세율(금융소득종합과세) 구조가 적용되면서 추가됨.
          isComprehensiveTaxationTriggered: result.isComprehensiveTaxationTriggered,
          marginalTaxRateApplied: result.marginalTaxRateApplied,
          generalForcedTaxKrw: result.generalForcedTaxKrw,
          generalOnlyTaxKrw: result.generalOnlyTaxKrw,
          totalTaxKrw: result.totalTaxKrw,
          savedAmountKrw: result.savedAmountKrw,
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
  }, [
    stockName,
    currentPriceKrw,
    expectedProfitPerShareKrw,
    expectedLossPerShareKrw,
    quantity,
    isaType,
    result,
  ]);

  const { setCurrentSimulation } = useChatContext();

  const currentSimulation = useMemo(
    () => ({
      kind: "trade" as const,
      request: {
        stockName,
        currentPriceKrw,
        expectedProfitPerShareKrw,
        expectedLossPerShareKrw,
        quantity,
        isaType,
      },
      response: {
        totalInvestKrw: result.totalInvestKrw,
        isExceedingContributionLimit: result.isExceedingContributionLimit,
        isaQuantity: result.isaQuantity,
        generalQuantity: result.generalQuantity,
        taxFreeLimitKrw: result.taxFreeLimitKrw,
        isaTaxKrw: result.isaTaxKrw,
        isComprehensiveTaxationTriggered: result.isComprehensiveTaxationTriggered,
        marginalTaxRateApplied: result.marginalTaxRateApplied,
        generalForcedTaxKrw: result.generalForcedTaxKrw,
        generalOnlyTaxKrw: result.generalOnlyTaxKrw,
        totalTaxKrw: result.totalTaxKrw,
        savedAmountKrw: result.savedAmountKrw,
      },
    }),
    [stockName, currentPriceKrw, expectedProfitPerShareKrw, expectedLossPerShareKrw, quantity, isaType, result]
  );

  // Stage 7의 공유 챗봇 컨텍스트에 이 도구의 최신 조건을 계속 밀어 넣는다.
  // 페이지를 벗어나면 다른 도구의 컨텍스트와 섞이지 않도록 비워준다(TaxSimulator.tsx와 동일 패턴).
  useEffect(() => {
    setCurrentSimulation(currentSimulation);
    return () => setCurrentSimulation(null);
  }, [currentSimulation, setCurrentSimulation]);

  return (
    <div className="bg-slate-50 min-h-full">
      <div className="p-5 max-w-5xl mx-auto flex flex-col gap-6 py-10">
        <Header />

        <NaturalLanguageInputCard onApply={handleApplyNaturalLanguage} />

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="flex flex-col gap-6">
            <IsaTypeToggle isaType={isaType} onChange={setIsaType} />
            <ScenarioForm
              stockName={stockName}
              onStockNameChange={setStockName}
              currentPriceKrw={currentPriceKrw}
              onCurrentPriceKrwChange={setCurrentPriceKrw}
              expectedProfitPerShareKrw={expectedProfitPerShareKrw}
              onExpectedProfitPerShareKrwChange={setExpectedProfitPerShareKrw}
              expectedLossPerShareKrw={expectedLossPerShareKrw}
              onExpectedLossPerShareKrwChange={setExpectedLossPerShareKrw}
              quantity={quantity}
              onQuantityChange={setQuantity}
            />
          </div>

          <ResultPanel
            stockName={stockName}
            quantity={quantity}
            result={result}
            theoreticalMaxTaxKrw={theoreticalMaxTaxKrw}
          />
        </main>

        <AiExplanationPanel onExplain={handleExplain} />

        <Disclaimer />
      </div>
    </div>
  );
}
