"use client";

import { useState } from "react";
import styles from "./TaxSimulator.module.css";

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
    <div className={`${styles.card} ${styles.sliderCard}`}>
      <div className={styles.sectionLabel}>AI로 조건 입력 (선택)</div>
      <textarea
        className={styles.textarea}
        placeholder="예: 애플에 1000만원, 5년, 연 8% 예상"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="button"
        className={styles.primaryButton}
        onClick={handleClick}
        disabled={isLoading || !text.trim()}
      >
        {isLoading ? "분석 중..." : "AI로 조건 채우기"}
      </button>
      {errorMessage && <div className={`${styles.note} ${styles.noteDanger}`}>{errorMessage}</div>}
    </div>
  );
}
