import { describe, expect, it } from "vitest";
import { checkRateLimit, getClientIp } from "./rate-limit";

describe("checkRateLimit", () => {
  it("한도 이내 요청은 허용한다", () => {
    const id = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(id, 5, 60_000).allowed).toBe(true);
    }
  });

  it("한도를 초과하면 차단하고 재시도 시간을 안내한다", () => {
    const id = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(id, 3, 60_000);
    }
    const result = checkRateLimit(id, 3, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("다른 식별자(IP)는 서로 영향을 주지 않는다", () => {
    const idA = `test-a-${Math.random()}`;
    const idB = `test-b-${Math.random()}`;
    for (let i = 0; i < 3; i++) checkRateLimit(idA, 3, 60_000);
    expect(checkRateLimit(idA, 3, 60_000).allowed).toBe(false);
    expect(checkRateLimit(idB, 3, 60_000).allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("x-forwarded-for 헤더의 첫 IP를 사용한다", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("헤더가 없으면 x-real-ip를 사용하고, 그것도 없으면 unknown을 반환한다", () => {
    const withRealIp = new Request("http://localhost", {
      headers: { "x-real-ip": "9.9.9.9" },
    });
    expect(getClientIp(withRealIp)).toBe("9.9.9.9");

    const withoutAny = new Request("http://localhost");
    expect(getClientIp(withoutAny)).toBe("unknown");
  });
});
