"use client";

import { createContext, useContext, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { ChatCurrentSimulation } from "@/lib/ai/chat-with-tax-assistant";

export interface ChatUiMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatContextValue {
  messages: ChatUiMessage[];
  setMessages: Dispatch<SetStateAction<ChatUiMessage[]>>;
  currentSimulation: ChatCurrentSimulation | null;
  setCurrentSimulation: Dispatch<SetStateAction<ChatCurrentSimulation | null>>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

/**
 * Stage 7: 챗봇을 app/layout.tsx 레벨로 옮기면서 대화 히스토리와 "현재 시뮬레이션 맥락"을
 * 이 Provider가 보관한다. RootLayout은 페이지 이동(/  <-> /trade) 시 리마운트되지 않으므로,
 * 여기 담긴 상태(messages)도 페이지를 옮겨도 유지된다.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
  const [currentSimulation, setCurrentSimulation] = useState<ChatCurrentSimulation | null>(null);

  const value = useMemo(
    () => ({ messages, setMessages, currentSimulation, setCurrentSimulation }),
    [messages, currentSimulation]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChatContext는 ChatProvider 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}
