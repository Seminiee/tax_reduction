import { NextResponse } from "next/server";
import { parseInvestmentInput } from "@/lib/ai/parse-investment-input";

const FALLBACK_MESSAGE = "지금은 AI로 조건을 채울 수 없어요. 직접 입력해 주세요.";

export async function POST(request: Request) {
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
      { error: "INVALID_INPUT", message: "text 필드에 자연어 투자 조건을 입력해 주세요." },
      { status: 400 }
    );
  }

  try {
    const parsed = await parseInvestmentInput(body.text);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("[/api/parse] AI 파싱 실패:", error);
    return NextResponse.json(
      { error: "AI_UNAVAILABLE", message: FALLBACK_MESSAGE },
      { status: 502 }
    );
  }
}
