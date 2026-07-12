"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { calculateDividend, resolveDividendQuantity } from "@/lib/tax/dividend-calculator";
import { useChatContext } from "@/components/chat/ChatContext";
import { IsaTypeToggle, type TwoWayIsaType } from "./IsaTypeToggle";
import { ScenarioForm, type QuantityInputMode } from "./ScenarioForm";
import { ResultPanel } from "./ResultPanel";
import { NaturalLanguageInputCard } from "./NaturalLanguageInputCard";
import { Disclaimer } from "./Disclaimer";

export function DividendCalculator() {
  // Stage 25: 개별 해외주식(코카콜라 등) 대신 실제 존재하는 국내상장 배당형 ETF로 예시를 교체.
  const [stockName, setStockName] = useState("TIGER 미국배당다우존스");
  const [dividendPerShareKrw, setDividendPerShareKrw] = useState(500);
  const [currentPriceKrw, setCurrentPriceKrw] = useState(12_000);
  const [inputMode, setInputMode] = useState<QuantityInputMode>("quantity");
  const [quantity, setQuantity] = useState(100);
  const [totalPurchaseAmountKrw, setTotalPurchaseAmountKrw] = useState(10_000_000);
  const [isaType, setIsaType] = useState<TwoWayIsaType>("general");
  // Stage 18: "다른 금융소득" 입력 UI를 제거하면서 항상 0으로 고정해 전달한다.
  // calculateDividend의 시그니처와 계산 로직 자체는 건드리지 않는다(lib/tax 테스트 그대로 유지).
  const otherFinancialIncomeKrw = 0;

  const quantityResolution = useMemo(
    () =>
      resolveDividendQuantity(
        inputMode === "quantity"
          ? { mode: "quantity", quantity, currentPriceKrw }
          : { mode: "amount", totalPurchaseAmountKrw, currentPriceKrw }
      ),
    [inputMode, quantity, totalPurchaseAmountKrw, currentPriceKrw]
  );
  const resolvedQuantity = quantityResolution.quantity;

  const result = useMemo(
    () =>
      calculateDividend({
        stockName,
        quantity: resolvedQuantity,
        dividendPerShareKrw,
        isaType,
        otherFinancialIncomeKrw,
      }),
    [stockName, resolvedQuantity, dividendPerShareKrw, isaType, otherFinancialIncomeKrw]
  );

  const handleApplyNaturalLanguage = useCallback(async (text: string) => {
    const res = await fetch("/api/parse-dividend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message ?? "지금은 AI로 조건을 채울 수 없어요. 직접 입력해 주세요.");
    }

    setStockName(data.stockName);
    setDividendPerShareKrw(data.dividendPerShareKrw);
    if (data.currentPriceKrw > 0) {
      setCurrentPriceKrw(data.currentPriceKrw);
    }
    // AI는 사용자가 말한 쪽(수량 또는 총매수금액) 하나만 채우므로, 채워진 쪽으로 입력모드를 맞춘다.
    if (data.totalPurchaseAmountKrw > 0) {
      setInputMode("amount");
      setTotalPurchaseAmountKrw(data.totalPurchaseAmountKrw);
    } else if (data.quantity > 0) {
      setInputMode("quantity");
      setQuantity(Math.max(1, Math.round(data.quantity)));
    }
  }, []);

  const { setCurrentSimulation } = useChatContext();

  const currentSimulation = useMemo(
    () => ({
      kind: "dividend" as const,
      request: {
        stockName,
        quantity: resolvedQuantity,
        dividendPerShareKrw,
        currentPriceKrw,
        inputMode,
        actualInvestedAmountKrw: quantityResolution.actualInvestedAmountKrw,
        isaType,
      },
      response: {
        totalDividendKrw: result.totalDividendKrw,
        taxFreeLimitKrw: result.taxFreeLimitKrw,
        isComprehensiveTaxationTriggered: result.isComprehensiveTaxationTriggered,
        marginalTaxRateApplied: result.marginalTaxRateApplied,
        generalDividendTaxKrw: result.generalDividendTaxKrw,
        generalNetReceivedKrw: result.generalNetReceivedKrw,
        isaDividendTaxKrw: result.isaDividendTaxKrw,
        isaNetReceivedKrw: result.isaNetReceivedKrw,
        taxSavingKrw: result.taxSavingKrw,
      },
    }),
    [
      stockName,
      resolvedQuantity,
      dividendPerShareKrw,
      currentPriceKrw,
      inputMode,
      quantityResolution.actualInvestedAmountKrw,
      isaType,
      result,
    ]
  );

  // Stage 7의 공유 챗봇 컨텍스트에 이 도구의 최신 조건을 계속 밀어 넣는다.
  // 페이지를 벗어나면 다른 도구의 컨텍스트와 섞이지 않도록 비워준다(다른 두 도구와 동일 패턴).
  useEffect(() => {
    setCurrentSimulation(currentSimulation);
    return () => setCurrentSimulation(null);
  }, [currentSimulation, setCurrentSimulation]);

  return (
    <div className="bg-slate-50 min-h-full">
      <div className="p-5 max-w-5xl mx-auto flex flex-col gap-6 py-10">
        <header className="flex justify-center items-center py-4 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">배당금 계산기</h1>
        </header>

        <NaturalLanguageInputCard onApply={handleApplyNaturalLanguage} />

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="flex flex-col gap-6">
            <IsaTypeToggle isaType={isaType} onChange={setIsaType} />
            <ScenarioForm
              stockName={stockName}
              onStockNameChange={setStockName}
              dividendPerShareKrw={dividendPerShareKrw}
              onDividendPerShareKrwChange={setDividendPerShareKrw}
              currentPriceKrw={currentPriceKrw}
              onCurrentPriceKrwChange={setCurrentPriceKrw}
              inputMode={inputMode}
              onInputModeChange={setInputMode}
              quantity={quantity}
              onQuantityChange={setQuantity}
              totalPurchaseAmountKrw={totalPurchaseAmountKrw}
              onTotalPurchaseAmountKrwChange={setTotalPurchaseAmountKrw}
              resolvedQuantity={quantityResolution.quantity}
              actualInvestedAmountKrw={quantityResolution.actualInvestedAmountKrw}
              requestedAmountKrw={quantityResolution.requestedAmountKrw}
            />
          </div>

          <ResultPanel
            quantity={resolvedQuantity}
            actualInvestedAmountKrw={quantityResolution.actualInvestedAmountKrw}
            result={result}
          />
        </main>

        <Disclaimer />
      </div>
    </div>
  );
}
