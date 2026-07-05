"use client";

import { useState } from "react";
import styles from "./TaxSimulator.module.css";

interface AiExplanationPanelProps {
  onExplain: () => Promise<string>;
}

const DEFAULT_ERROR_MESSAGE =
  "지금은 AI 설명을 불러올 수 없어요, 계산 결과는 위에서 확인하세요.";

export function AiExplanationPanel({ onExplain }: AiExplanationPanelProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage("");
    try {
      const text = await onExplain();
      setExplanation(text);
    } catch (err) {
      setExplanation(null);
      setErrorMessage(err instanceof Error ? err.message : DEFAULT_ERROR_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.card} style={{ padding: "16px 20px 20px" }}>
      <button type="button" className={styles.secondaryButton} onClick={handleClick} disabled={isLoading}>
        {isLoading ? "설명 생성 중..." : "AI 설명 보기"}
      </button>
      {explanation && <div className={styles.explanationBox}>{explanation}</div>}
      {errorMessage && <div className={`${styles.note} ${styles.noteDanger}`}>{errorMessage}</div>}
    </div>
  );
}
