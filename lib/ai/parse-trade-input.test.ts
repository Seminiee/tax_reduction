import { beforeEach, describe, expect, it, vi } from "vitest";

const mockParse = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { parse: mockParse },
  })),
}));

import { HAIKU_MODEL, parseTradeInput } from "./parse-trade-input";

describe("parseTradeInput (Anthropic API 목 처리)", () => {
  beforeEach(() => {
    mockParse.mockReset();
  });

  it("claude-haiku-4-5-20251001 모델과 시스템 프롬프트로 호출하고 parsed_output을 반환한다", async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        stockName: "나스닥 100 ETF",
        currentPriceKrw: 115_000,
        expectedProfitPerShareKrw: 15_000,
        expectedLossPerShareKrw: 0,
        quantity: 200,
        isaType: "general",
        assumedFields: [{ field: "expectedLossPerShareKrw", reason: "손실 언급이 없어 0으로 가정" }],
      },
    });

    const result = await parseTradeInput("나스닥 100 ETF 11만5천원에 200주, 주당 만5천원 이익 예상");

    expect(result.stockName).toBe("나스닥 100 ETF");
    expect(result.quantity).toBe(200);
    expect(mockParse).toHaveBeenCalledTimes(1);

    const [params] = mockParse.mock.calls[0];
    expect(params.model).toBe(HAIKU_MODEL);
    expect(typeof params.system).toBe("string");
    expect(params.system.length).toBeGreaterThan(0);
    expect(params.messages).toEqual([
      { role: "user", content: "나스닥 100 ETF 11만5천원에 200주, 주당 만5천원 이익 예상" },
    ]);
  });

  it("parsed_output이 없으면 에러를 던진다", async () => {
    mockParse.mockResolvedValue({ parsed_output: null });

    await expect(parseTradeInput("의미 없는 텍스트")).rejects.toThrow("AI_PARSE_EMPTY_OUTPUT");
  });

  it("Anthropic API 호출이 실패하면 에러가 그대로 전파된다 (라우트에서 폴백 처리)", async () => {
    mockParse.mockRejectedValue(new Error("network timeout"));

    await expect(parseTradeInput("아무 종목 100주")).rejects.toThrow("network timeout");
  });
});
