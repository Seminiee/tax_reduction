import { describe, expect, it } from "vitest";
import { chatWithTaxAssistant } from "./chat-with-tax-assistant";

// 실제 Anthropic API를 호출하는 수동 스모크 테스트. 기본 `npm run test`에서는 항상 스킵된다.
// 수동 실행 방법은 README.md 참고.
const shouldRun = process.env.RUN_AI_SMOKE_TEST === "1" && !!process.env.ANTHROPIC_API_KEY;

describe.skipIf(!shouldRun)("chatWithTaxAssistant 스모크 테스트 (실제 API 호출)", () => {
  it("일반 세금 질문에 응답한다", async () => {
    const result = await chatWithTaxAssistant([
      { role: "user", content: "ISA 계좌랑 일반 해외주식 계좌 세금 차이가 뭐예요?" },
    ]);
    expect(result.length).toBeGreaterThan(0);
  }, 30_000);

  it("확인 필요 항목 질문에는 확정 답변 대신 확인 필요 안내를 한다", async () => {
    const result = await chatWithTaxAssistant([
      { role: "user", content: "ISA 비과세 한도가 정확히 얼마예요? 200만원이 맞나요 500만원이 맞나요?" },
    ]);
    expect(result).toContain("확인");
  }, 30_000);

  it("범위 밖 질문에는 범위를 정중히 안내한다", async () => {
    const result = await chatWithTaxAssistant([
      { role: "user", content: "오늘 저녁 메뉴 추천해줘" },
    ]);
    expect(result).toContain("해외주식/ISA 세금 관련 질문만 답변할 수 있어요");
  }, 30_000);
});
