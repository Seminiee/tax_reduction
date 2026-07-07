import { NextResponse } from "next/server";
import {
  chatWithTaxAssistant,
  validateChatMessages,
  type ChatCurrentSimulation,
  type ChatMessage,
} from "@/lib/ai/chat-with-tax-assistant";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const FALLBACK_MESSAGE = "지금은 챗봇을 쓸 수 없어요. 잠시 후 다시 시도해 주세요.";

function isValidCurrentSimulation(value: unknown): value is ChatCurrentSimulation {
  if (!value || typeof value !== "object") return false;
  const sim = value as Record<string, unknown>;
  // Stage 8 전: trade는 kind만 확인한다(필드는 아직 정의되지 않음).
  if (sim.kind === "trade") return true;
  if (sim.kind !== "hold") return false;
  return (
    typeof sim.request === "object" &&
    sim.request !== null &&
    typeof sim.response === "object" &&
    sim.response !== null
  );
}

export async function POST(request: Request) {
  // 공개 데모 링크에서 비용 폭주를 막기 위한 최소한의 방어 (lib/rate-limit.ts 주석 참고).
  const rateLimit = checkRateLimit(getClientIp(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: `요청이 너무 많아요. ${rateLimit.retryAfterSeconds}초 후 다시 시도해 주세요.`,
      },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } }
    );
  }

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
