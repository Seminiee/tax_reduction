import { NextResponse } from "next/server";
import {
  chatWithTaxAssistant,
  validateChatMessages,
  type ChatCurrentSimulation,
  type ChatMessage,
} from "@/lib/ai/chat-with-tax-assistant";

const FALLBACK_MESSAGE = "지금은 챗봇을 쓸 수 없어요. 잠시 후 다시 시도해 주세요.";

function isValidCurrentSimulation(value: unknown): value is ChatCurrentSimulation {
  if (!value || typeof value !== "object") return false;
  const sim = value as Record<string, unknown>;
  return (
    typeof sim.request === "object" &&
    sim.request !== null &&
    typeof sim.response === "object" &&
    sim.response !== null
  );
}

export async function POST(request: Request) {
  let body: { messages?: unknown; currentSimulation?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "요청 본문이 올바른 JSON이 아닙니다." },
      { status: 400 }
    );
  }

  const validationError = validateChatMessages(body.messages);
  if (validationError) {
    return NextResponse.json({ error: "INVALID_INPUT", message: validationError }, { status: 400 });
  }

  const currentSimulation =
    body.currentSimulation !== undefined && isValidCurrentSimulation(body.currentSimulation)
      ? body.currentSimulation
      : undefined;

  try {
    const reply = await chatWithTaxAssistant(body.messages as ChatMessage[], currentSimulation);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("[/api/chat] AI 챗봇 응답 실패:", error);
    return NextResponse.json(
      { error: "AI_UNAVAILABLE", message: FALLBACK_MESSAGE },
      { status: 502 }
    );
  }
}
