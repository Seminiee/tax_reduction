"use client";

import { useState } from "react";
import type { ChatCurrentSimulation } from "@/lib/ai/chat-with-tax-assistant";
import styles from "./TaxSimulator.module.css";

interface ChatUiMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  currentSimulation: ChatCurrentSimulation;
}

const MAX_MESSAGE_LENGTH = 1000;
const FALLBACK_MESSAGE = "지금은 챗봇을 쓸 수 없어요. 잠시 후 다시 시도해 주세요.";

export function ChatPanel({ currentSimulation }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
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

    const nextMessages: ChatUiMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, currentSimulation }),
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
    <div className={styles.card}>
      <button type="button" className={styles.chatToggleButton} onClick={() => setIsOpen((v) => !v)}>
        <span>세금 Q&amp;A 챗봇에게 물어보기</span>
        <span>{isOpen ? "접기 ▲" : "펼치기 ▼"}</span>
      </button>
      {isOpen && (
        <div className={styles.chatBody}>
          <div className={styles.chatDisclaimer}>
            AI 답변은 참고용이며 개별 세무 상담을 대체하지 않습니다.
          </div>
          <div className={styles.chatMessages}>
            {messages.length === 0 && (
              <div className={styles.chatEmptyHint}>
                예: &quot;ISA 비과세 한도가 얼마예요?&quot;, &quot;배당소득세는 어떻게 계산돼요?&quot;
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={message.role === "user" ? styles.chatBubbleUser : styles.chatBubbleAssistant}
              >
                {message.content}
              </div>
            ))}
            {isLoading && <div className={styles.chatBubbleAssistant}>답변 작성 중...</div>}
          </div>
          {errorMessage && <div className={`${styles.note} ${styles.noteDanger}`}>{errorMessage}</div>}
          <div className={styles.chatInputRow}>
            <input
              type="text"
              className={styles.chatInput}
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
              className={styles.primaryButton}
              style={{ marginTop: 0 }}
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
            >
              전송
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
