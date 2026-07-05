import { beforeEach, describe, expect, it, vi } from "vitest";

const mockParse = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { parse: mockParse },
  })),
}));

import { HAIKU_MODEL, parseInvestmentInput } from "./parse-investment-input";

describe("parseInvestmentInput (Anthropic API 목 처리)", () => {
  beforeEach(() => {
    mockParse.mockReset();
  });

  it("claude-haiku-4-5-20251001 모델과 시스템 프롬프트로 호출하고 parsed_output을 반환한다", async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        principalKrw: 10_000_000,
        annualReturnRate: 0.08,
        annualDividendYieldRate: 0,
        holdingYears: 5,
        isaType: "general",
        annualFinancialIncomeKrw: 0,
        assumedFields: [{ field: "isaType", reason: "언급이 없어 일반형으로 가정" }],
      },
    });

    const result = await parseInvestmentInput("애플에 1000만원, 5년, 연 8% 예상");

    expect(result.principalKrw).toBe(10_000_000);
    expect(result.holdingYears).toBe(5);
    expect(mockParse).toHaveBeenCalledTimes(1);

    const [params] = mockParse.mock.calls[0];
    expect(params.model).toBe(HAIKU_MODEL);
    expect(typeof params.system).toBe("string");
    expect(params.system.length).toBeGreaterThan(0);
    expect(params.messages).toEqual([
      { role: "user", content: "애플에 1000만원, 5년, 연 8% 예상" },
    ]);
  });

  it("parsed_output이 없으면 에러를 던진다", async () => {
    mockParse.mockResolvedValue({ parsed_output: null });

    await expect(parseInvestmentInput("의미 없는 텍스트")).rejects.toThrow(
      "AI_PARSE_EMPTY_OUTPUT"
    );
  });

  it("Anthropic API 호출이 실패하면 에러가 그대로 전파된다 (라우트에서 폴백 처리)", async () => {
    mockParse.mockRejectedValue(new Error("network timeout"));

    await expect(parseInvestmentInput("애플에 1000만원")).rejects.toThrow(
      "network timeout"
    );
  });
});
