"use client";

import { useState } from "react";
import styles from "./DividendCalculator.module.css";

export const QUANTITY_MIN = 1;
export const QUANTITY_MAX = 5_000;

interface ScenarioFormProps {
  stockName: string;
  onStockNameChange: (value: string) => void;
  dividendPerShareKrw: number;
  onDividendPerShareKrwChange: (value: number) => void;
  quantity: number;
  onQuantityChange: (value: number) => void;
  otherFinancialIncomeKrw: number;
  onOtherFinancialIncomeKrwChange: (value: number) => void;
}

export function ScenarioForm({
  stockName,
  onStockNameChange,
  dividendPerShareKrw,
  onDividendPerShareKrwChange,
  quantity,
  onQuantityChange,
  otherFinancialIncomeKrw,
  onOtherFinancialIncomeKrwChange,
}: ScenarioFormProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const sliderPercent = ((quantity - QUANTITY_MIN) / (QUANTITY_MAX - QUANTITY_MIN)) * 100;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-sm font-bold text-slate-700 mb-5">배당 시나리오 설정</h2>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs text-slate-500 font-medium mb-1.5">종목명</label>
          <input
            type="text"
            value={stockName}
            onChange={(e) => onStockNameChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-amber-600 font-medium mb-1.5">주당 배당금 (원)</label>
          <input
            type="number"
            value={dividendPerShareKrw}
            onChange={(e) => onDividendPerShareKrwChange(parseFloat(e.target.value) || 0)}
            className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-3 py-2.5 text-sm text-amber-700 font-mono focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
          />
        </div>
      </div>

      <div className="pt-5 border-t border-slate-100">
        <div className="flex justify-between items-center mb-5">
          <span className="text-sm font-bold text-slate-700">보유 수량 조절</span>
          <span className="text-xl font-black text-amber-600 font-mono">
            {quantity.toLocaleString("ko-KR")}주
          </span>
        </div>
        <input
          type="range"
          min={QUANTITY_MIN}
          max={QUANTITY_MAX}
          value={quantity}
          onChange={(e) => onQuantityChange(parseInt(e.target.value, 10) || QUANTITY_MIN)}
          className={styles.slider}
          style={{
            background: `linear-gradient(to right, #f59e0b ${sliderPercent}%, #e2e8f0 ${sliderPercent}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-slate-400 mt-3 font-mono">
          <span>{QUANTITY_MIN.toLocaleString("ko-KR")}주</span>
          <span>{QUANTITY_MAX.toLocaleString("ko-KR")}주</span>
        </div>
      </div>

      <div className="pt-5 mt-5 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen((v) => !v)}
          className="w-full flex justify-between items-center text-sm font-semibold text-slate-600"
        >
          <span>고급설정 — 다른 금융소득</span>
          <span className="text-xs text-slate-400">{isAdvancedOpen ? "접기 ▲" : "펼치기 ▼"}</span>
        </button>
        {isAdvancedOpen && (
          <div className="mt-3">
            <label className="block text-xs text-slate-500 font-medium mb-1.5">
              이 배당 외 연간 다른 금융소득 (원)
            </label>
            <input
              type="number"
              value={otherFinancialIncomeKrw}
              onChange={(e) => onOtherFinancialIncomeKrwChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
            />
            <p className="text-xs text-slate-400 mt-1.5">
              0(기본값)이면 이 배당금만으로는 종합과세를 판단하지 않고 15.4% 고정 세율을 적용합니다.
              값을 입력하면 이 배당금과 합산해 금융소득종합과세 대상 여부를 판단합니다.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
