"use client";

import { useState } from "react";

interface AiExplanationPanelProps {
  onExplain: () => Promise<string>;
}

const DEFAULT_ERROR_MESSAGE = "지금은 AI 설명을 불러올 수 없어요, 계산 결과는 위에서 확인하세요.";

// Stage 21: `/`가 매매차익 UI로 통합되며 신규 추가된 "AI 설명 보기" 섹션.
// Stage 4의 기존 AiExplanationPanel(components/tax-simulator/)과 동일한 접기/펼치기 UX
// 패턴을 재사용하되, design/merged-hold-trade-mockup.html의 에메랄드 카드 스타일로 구현한다.
export function AiExplanationPanel({ onExplain }: AiExplanationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleClick = async () => {
    setIsOpen((v) => !v);
    if (explanation || isLoading) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      const text = await onExplain();
      setExplanation(text);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <button
        type="button"
        onClick={handleClick}
        className="w-full flex items-center justify-between text-sm font-bold text-slate-700"
      >
        <span>AI 설명 보기</span>
        <span className="text-slate-400 text-xs">{isOpen ? "접기 ▲" : "펼치기 ▼"}</span>
      </button>
      {isOpen && (
        <div className="pt-4 mt-4 border-t border-slate-100">
          {isLoading && <p className="text-sm text-slate-400">설명 생성 중...</p>}
          {explanation && (
            <>
              <p className="text-sm text-slate-600 leading-relaxed">{explanation}</p>
              <p className="text-xs text-slate-400 mt-2">
                이 설명은 AI가 생성했으며 위 계산 결과가 항상 정확한 기준입니다.
              </p>
            </>
          )}
          {errorMessage && (
            <p className="text-sm bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3 py-2">
              {errorMessage}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
