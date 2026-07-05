import { NextResponse } from "next/server";
import {
  explainSimulationResult,
  type ExplainSimulationInput,
} from "@/lib/ai/explain-simulation-result";

const FALLBACK_MESSAGE = "지금은 AI 설명을 불러올 수 없어요, 계산 결과는 위에서 확인하세요.";

function isValidBody(body: unknown): body is ExplainSimulationInput {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.input === "object" &&
    b.input !== null &&
    typeof b.generalAccount === "object" &&
    b.generalAccount !== null &&
    typeof b.isaAccount === "object" &&
    b.isaAccount !== null &&
    typeof b.verificationStatus === "string"
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "요청 본문이 올바른 JSON이 아닙니다." },
      { status: 400 }
    );
  }

  if (!isValidBody(body)) {
    return NextResponse.json(
      {
        error: "INVALID_INPUT",
        message: "input/generalAccount/isaAccount/verificationStatus 필드가 필요합니다.",
      },
      { status: 400 }
    );
  }

  try {
    const explanation = await explainSimulationResult(body);
    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("[/api/explain] AI 설명 생성 실패:", error);
    return NextResponse.json(
      { error: "AI_UNAVAILABLE", message: FALLBACK_MESSAGE },
      { status: 502 }
    );
  }
}
