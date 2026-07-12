import { NextResponse } from "next/server";
import {
  explainSimulationResult,
  type ExplainSimulationInput,
} from "@/lib/ai/explain-simulation-result";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const FALLBACK_MESSAGE = "지금은 AI 설명을 불러올 수 없어요, 계산 결과는 위에서 확인하세요.";

// Stage 21: ChatCurrentSimulation과 동일한 kind 판별 유니언 패턴으로 hold/trade를 구분한다.
function isValidBody(body: unknown): body is ExplainSimulationInput {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (typeof b.input !== "object" || b.input === null) return false;
  if (typeof b.verificationStatus !== "string") return false;

  if (b.kind === "hold") {
    return (
      typeof b.generalAccount === "object" &&
      b.generalAccount !== null &&
      typeof b.isaAccount === "object" &&
      b.isaAccount !== null
    );
  }
  if (b.kind === "trade") {
    return typeof b.result === "object" && b.result !== null;
  }
  return false;
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
        message:
          'kind가 "hold"면 input/generalAccount/isaAccount/verificationStatus, "trade"면 input/result/verificationStatus 필드가 필요합니다.',
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
