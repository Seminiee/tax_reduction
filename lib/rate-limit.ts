// 매우 단순한 in-memory IP 기반 rate limiter.
// 목적은 공개 데모 링크에서 AI API 호출 비용이 폭주하는 것을 막는 것뿐이며,
// 정교하거나 분산 환경에 안전한 rate limiting이 아니다.
// - 서버리스 인스턴스가 여러 개 뜨면(콜드 스타트 등) 인스턴스마다 별도로 카운트되어
//   실제 허용치가 이 값보다 느슨해질 수 있다.
// - 배포/재시작 시 카운트가 초기화된다.
// 데모 규모에서는 이 정도 허용 오차로 충분하다고 판단해 in-memory로 구현했다.

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

const requestLog = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  identifier: string,
  maxRequests: number = MAX_REQUESTS_PER_WINDOW,
  windowMs: number = WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (requestLog.get(identifier) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= maxRequests) {
    const retryAfterMs = timestamps[0] + windowMs - now;
    requestLog.set(identifier, timestamps);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  timestamps.push(now);
  requestLog.set(identifier, timestamps);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}
