"use client";

import { useState } from "react";

interface NaturalLanguageInputCardProps {
  onApply: (text: string) => Promise<void>;
}

export function NaturalLanguageInputCard({ onApply }: NaturalLanguageInputCardProps) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleClick = async () => {
    if (!text.trim() || isLoading) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      await onApply(text);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "지금은 AI로 조건을 채울 수 없어요. 직접 입력해 주세요."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="text-sm font-semibold text-slate-600 mb-3">AI로 조건 입력 (선택)</div>
      <textarea
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors resize-none"
        rows={2}
        placeholder="예: 리얼티인컴 250주 보유, 주가 6만원, 주당 배당금 1,000원"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading || !text.trim()}
        className="mt-3 w-full py-2.5 text-sm font-bold rounded-xl bg-amber-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-600"
      >
        {isLoading ? "분석 중..." : "AI로 조건 채우기"}
      </button>
      {errorMessage && (
        <div className="mt-3 text-sm bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2">
          {errorMessage}
        </div>
      )}
    </section>
  );
}
