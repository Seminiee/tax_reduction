"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { calculateDividend } from "@/lib/tax/dividend-calculator";
import { useChatContext } from "@/components/chat/ChatContext";
import { IsaTypeToggle, type TwoWayIsaType } from "./IsaTypeToggle";
import { ScenarioForm } from "./ScenarioForm";
import { ResultPanel } from "./ResultPanel";
import { NaturalLanguageInputCard } from "./NaturalLanguageInputCard";
import { Disclaimer } from "./Disclaimer";

export function DividendCalculator() {
  const [stockName, setStockName] = useState("코카콜라");
  const [dividendPerShareKrw, setDividendPerShareKrw] = useState(2_000);
  const [quantity, setQuantity] = useState(100);
  const [isaType, setIsaType] = useState<TwoWayIsaType>("general");
  const [otherFinancialIncomeKrw, setOtherFinancialIncomeKrw] = useState(0);

  const result = useMemo(
    () =>
      calculateDividend({
        stockName,
        quantity,
        dividendPerShareKrw,
        isaType,
        otherFinancialIncomeKrw,
      }),
    [stockName, quantity, dividendPerShareKrw, isaType, otherFinancialIncomeKrw]
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
    setQuantity(Math.max(1, Math.round(data.quantity)));
    setOtherFinancialIncomeKrw(data.otherFinancialIncomeKrw);
  }, []);

  const { setCurrentSimulation } = useChatContext();

  const currentSimulation = useMemo(
    () => ({
      kind: "dividend" as const,
      request: {
        stockName,
        quantity,
        dividendPerShareKrw,
        isaType,
        otherFinancialIncomeKrw,
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
    [stockName, quantity, dividendPerShareKrw, isaType, otherFinancialIncomeKrw, result]
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
              quantity={quantity}
              onQuantityChange={setQuantity}
              otherFinancialIncomeKrw={otherFinancialIncomeKrw}
              onOtherFinancialIncomeKrwChange={setOtherFinancialIncomeKrw}
            />
          </div>

          <ResultPanel quantity={quantity} result={result} />
        </main>

        <Disclaimer />
      </div>
    </div>
  );
}
