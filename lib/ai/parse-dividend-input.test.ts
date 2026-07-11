import { beforeEach, describe, expect, it, vi } from "vitest";

const mockParse = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { parse: mockParse },
  })),
}));

import { HAIKU_MODEL, parseDividendInput } from "./parse-dividend-input";

describe("parseDividendInput (Anthropic API 목 처리)", () => {
  beforeEach(() => {
    mockParse.mockReset();
  });

  it("수량으로 언급하면 quantity를 채우고 totalPurchaseAmountKrw는 0으로 둔다", async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        stockName: "코카콜라",
        quantity: 100,
        currentPriceKrw: 0,
        totalPurchaseAmountKrw: 0,
        dividendPerShareKrw: 2000,
        assumedFields: [{ field: "currentPriceKrw", reason: "주가 언급이 없어 0으로 가정" }],
      },
    });

    const result = await parseDividendInput("코카콜라 100주 보유, 주당 배당금 2000원");

    expect(result.stockName).toBe("코카콜라");
    expect(result.quantity).toBe(100);
    expect(result.totalPurchaseAmountKrw).toBe(0);
    expect(mockParse).toHaveBeenCalledTimes(1);

    const [params] = mockParse.mock.calls[0];
    expect(params.model).toBe(HAIKU_MODEL);
    expect(typeof params.system).toBe("string");
    expect(params.system.length).toBeGreaterThan(0);
    expect(params.messages).toEqual([
      { role: "user", content: "코카콜라 100주 보유, 주당 배당금 2000원" },
    ]);
  });

  it("총매수금액으로 언급하면 totalPurchaseAmountKrw를 채우고 quantity는 0으로 둔다", async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        stockName: "나스닥 100 ETF",
        quantity: 0,
        currentPriceKrw: 115_000,
        totalPurchaseAmountKrw: 30_000_000,
        dividendPerShareKrw: 3000,
        assumedFields: [],
      },
    });

    const result = await parseDividendInput(
      "나스닥 100 ETF 11만5천원에 3천만원어치 보유, 주당 배당금 3000원"
    );

    expect(result.quantity).toBe(0);
    expect(result.totalPurchaseAmountKrw).toBe(30_000_000);
    expect(result.currentPriceKrw).toBe(115_000);
  });

  it("parsed_output이 없으면 에러를 던진다", async () => {
    mockParse.mockResolvedValue({ parsed_output: null });

    await expect(parseDividendInput("의미 없는 텍스트")).rejects.toThrow("AI_PARSE_EMPTY_OUTPUT");
  });

  it("Anthropic API 호출이 실패하면 에러가 그대로 전파된다 (라우트에서 폴백 처리)", async () => {
    mockParse.mockRejectedValue(new Error("network timeout"));

    await expect(parseDividendInput("아무 종목 100주")).rejects.toThrow("network timeout");
  });
});
