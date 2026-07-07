"use client";

import { useState } from "react";
import { useChatContext } from "./ChatContext";
import styles from "./ChatPanel.module.css";

const MAX_MESSAGE_LENGTH = 1000;
const FALLBACK_MESSAGE = "지금은 챗봇을 쓸 수 없어요. 잠시 후 다시 시도해 주세요.";

/**
 * Stage 7: app/layout.tsx에서 렌더링되는 공유 챗봇. 어느 도구 페이지(/  또는 /trade)에
 * 있든 동일한 컴포넌트가 유지되며, 대화 히스토리는 ChatContext(React Context)에 보관되므로
 * 페이지 이동으로 리마운트되어도 초기화되지 않는다. 색상은 두 도구(블루/그린)와 무관한
 * 슬레이트/네이비 중립색(ChatPanel.module.css)을 사용한다.
 */
export function ChatPanel() {
  const { messages, setMessages, currentSimulation } = useChatContext();
  const [isOpen, setIsOpen] = useState(false);
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
      {isOpen && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span>세금 Q&amp;A 챗봇</span>
            <button
              type="button"
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
              aria-label="챗봇 닫기"
            >
              ✕
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
          <div className={styles.inputRow}>
            <input
              type="text"
              className={styles.input}
              value={input}
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
      )}
      <button type="button" className={styles.launcher} onClick={() => setIsOpen((v) => !v)}>
        {isOpen ? "닫기" : "세금 Q&A 챗봇"}
      </button>
    </div>
  );
}
