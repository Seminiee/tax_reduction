import { describe, expect, it } from "vitest";
import { parseInvestmentInput } from "./parse-investment-input";

// 실제 Anthropic API를 호출하는 수동 스모크 테스트. 기본 `npm run test`에서는 항상 스킵된다.
// 수동 실행 방법은 README.md 참고.
const shouldRun = process.env.RUN_AI_SMOKE_TEST === "1" && !!process.env.ANTHROPIC_API_KEY;

describe.skipIf(!shouldRun)("parseInvestmentInput 스모크 테스트 (실제 API 호출)", () => {
  it("자연어 투자 설명을 구조화된 JSON으로 파싱한다", async () => {
    const result = await parseInvestmentInput("애플에 1000만원, 5년, 연 8% 예상");

    expect(result.principalKrw).toBeGreaterThan(0);
    expect(result.holdingYears).toBe(5);
    expect(Array.isArray(result.assumedFields)).toBe(true);
  }, 30_000);
});
