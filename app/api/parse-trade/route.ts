import { NextResponse } from "next/server";
import { parseTradeInput } from "@/lib/ai/parse-trade-input";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const FALLBACK_MESSAGE = "지금은 AI로 조건을 채울 수 없어요. 직접 입력해 주세요.";

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

  let body: { text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "요청 본문이 올바른 JSON이 아닙니다." },
      { status: 400 }
    );
  }

  if (typeof body.text !== "string" || body.text.trim().length === 0) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "text 필드에 자연어 매매 계획을 입력해 주세요." },
      { status: 400 }
    );
  }

  try {
    const parsed = await parseTradeInput(body.text);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[/api/parse-trade] AI 파싱 실패:", error);
    return NextResponse.json(
      { error: "AI_UNAVAILABLE", message: FALLBACK_MESSAGE },
      { status: 502 }
    );
  }
}
