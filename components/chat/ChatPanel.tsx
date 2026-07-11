"use client";

import { useState } from "react";
import { useChatContext } from "./ChatContext";
import styles from "./ChatPanel.module.css";

const MAX_MESSAGE_LENGTH = 1000;
const FALLBACK_MESSAGE = "지금은 챗봇을 쓸 수 없어요. 잠시 후 다시 시도해 주세요.";

/**
 * Stage 14: 우하단 원형 버튼+슬라이드업 패널 구조를 없애고, 화면 하단에 항상 고정된
 * 가로 바 형태로 재설계했다. 기본(collapsed) 상태는 얇은 입력 바만 보이고, 입력창에
 * 포커스하거나 메시지를 보내면 위로 대화 히스토리 영역이 펼쳐진다(최대 50vh, 스크롤 가능).
 * 접어도 대화 자체는 ChatContext에 그대로 남는다 — Stage 7의 페이지 이동 시 히스토리
 * 유지 메커니즘은 이 재설계와 무관하게 그대로다. 색상은 Stage 7에서 정한 세 도구(블루/
 * 그린/앰버) 색과 무관한 슬레이트/네이비 중립색을 그대로 유지한다.
 */
export function ChatPanel() {
  const { messages, setMessages, currentSimulation } = useChatContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    if (text.length > MAX_MESSAGE_LENGTH) {
      setErrorMessage(`메시지는 ${MAX_MESSAGE_LENGTH}자 이내로 입력해 주세요.`);
      return;
    }

    setIsExpanded(true);
    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          ...(currentSimulation ? { currentSimulation } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? FALLBACK_MESSAGE);
      }
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : FALLBACK_MESSAGE);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.root}>
      {isExpanded && (
        <div className={styles.historyPanel}>
          <div className={styles.header}>
            <span>세금 Q&amp;A 챗봇</span>
            <button
              type="button"
              className={styles.collapseButton}
              onClick={() => setIsExpanded(false)}
              aria-label="챗봇 접기"
            >
              접기 ▾
            </button>
          </div>
          <div className={styles.disclaimer}>
            AI 답변은 참고용이며 개별 세무 상담을 대체하지 않습니다.
          </div>
          <div className={styles.messages}>
            {messages.length === 0 && (
              <div className={styles.emptyHint}>
                예: &quot;ISA 비과세 한도가 얼마예요?&quot;, &quot;배당소득세는 어떻게 계산돼요?&quot;
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={message.role === "user" ? styles.bubbleUser : styles.bubbleAssistant}
              >
                {message.content}
              </div>
            ))}
            {isLoading && <div className={styles.bubbleAssistant}>답변 작성 중...</div>}
          </div>
          {errorMessage && <div className={styles.errorNote}>{errorMessage}</div>}
        </div>
      )}
      <div className={styles.inputBar}>
        <span className={styles.icon} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 4h16v12H7l-3 3V4z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <input
          type="text"
          className={styles.input}
          value={input}
          onFocus={() => setIsExpanded(true)}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder="세금 관련 질문을 입력하세요"
          maxLength={MAX_MESSAGE_LENGTH}
        />
        <button
          type="button"
          className={styles.sendButton}
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
        >
          전송
        </button>
      </div>
    </div>
  );
}
