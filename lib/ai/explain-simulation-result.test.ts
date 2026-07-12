import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

import {
  explainSimulationResult,
  HAIKU_MODEL,
  EXPLAIN_SYSTEM_PROMPT_HOLD,
  EXPLAIN_SYSTEM_PROMPT_TRADE,
  type ExplainSimulationInput,
} from "./explain-simulation-result";

const SAMPLE_INPUT: ExplainSimulationInput = {
  kind: "hold",
  input: { principalKrw: 10_000_000, annualReturnRate: 0.08, holdingYears: 5, isaType: "general" },
  generalAccount: {
    finalAfterTaxValue: 14_210_759,
    totalTax: 482_522,
    capitalGainsTax: 482_522,
    totalDividendTax: 0,
  },
  isaAccount: {
    finalAfterTaxValue: 14_426_646,
    tax: 266_635,
    isEarlyWithdrawal: false,
    taxableExcess: 2_693_281,
    taxFreeLimitKrw: 2_000_000,
  },
  verificationStatus: "미검증 초안 — 국세청/금융투자협회 최신 공지로 재확인 필요",
};

// Stage 21: `/`로 통합된 매매차익 계산기 결과 해설(v2) 입력 샘플.
const SAMPLE_TRADE_INPUT: ExplainSimulationInput = {
  kind: "trade",
  input: {
    stockName: "나스닥 100 ETF",
    currentPriceKrw: 115_000,
    expectedProfitPerShareKrw: 15_000,
    expectedLossPerShareKrw: 0,
    quantity: 200,
    isaType: "general",
  },
  result: {
    totalInvestKrw: 23_000_000,
    isExceedingContributionLimit: true,
    isaQuantity: 173,
    generalQuantity: 27,
    taxFreeLimitKrw: 2_000_000,
    netGainForIsaKrw: 2_595_000,
    isaTaxKrw: 58_905,
    generalForcedTaxKrw: 89_100,
    generalOnlyTaxKrw: 660_000,
    totalTaxKrw: 148_005,
    savedAmountKrw: 511_995,
  },
  verificationStatus: "미검증 초안 — 국세청/금융투자협회 최신 공지로 재확인 필요",
};

describe("explainSimulationResult (Anthropic API 목 처리)", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("claude-haiku-4-5-20251001 모델로 호출하고 텍스트를 반환한다", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "이 조건에서는 ISA 계좌가 비과세 한도 덕분에 세금이 더 적어요." }],
    });

    const result = await explainSimulationResult(SAMPLE_INPUT);

    expect(result).toBe("이 조건에서는 ISA 계좌가 비과세 한도 덕분에 세금이 더 적어요.");
    expect(mockCreate).toHaveBeenCalledTimes(1);

    const [params] = mockCreate.mock.calls[0];
    expect(params.model).toBe(HAIKU_MODEL);
    expect(typeof params.system).toBe("string");
    expect(JSON.parse(params.messages[0].content)).toEqual(SAMPLE_INPUT);
  });

  it("kind가 trade면 EXPLAIN_SYSTEM_PROMPT_TRADE(v2)로, hold면 EXPLAIN_SYSTEM_PROMPT_HOLD(v1)로 호출한다", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "이 조건에서는 ISA 계좌가 세금이 더 적어요." }],
    });

    await explainSimulationResult(SAMPLE_INPUT);
    expect(mockCreate.mock.calls[0][0].system).toBe(EXPLAIN_SYSTEM_PROMPT_HOLD);

    mockCreate.mockClear();
    await explainSimulationResult(SAMPLE_TRADE_INPUT);
    expect(mockCreate.mock.calls[0][0].system).toBe(EXPLAIN_SYSTEM_PROMPT_TRADE);
    expect(JSON.parse(mockCreate.mock.calls[0][0].messages[0].content)).toEqual(SAMPLE_TRADE_INPUT);
  });

  it("텍스트 블록이 없으면 에러를 던진다", async () => {
    mockCreate.mockResolvedValue({ content: [] });

    await expect(explainSimulationResult(SAMPLE_INPUT)).rejects.toThrow(
      "AI_EXPLAIN_EMPTY_OUTPUT"
    );
  });

  it("Anthropic API 호출이 실패하면 에러가 그대로 전파된다 (라우트에서 폴백 처리)", async () => {
    mockCreate.mockRejectedValue(new Error("network timeout"));

    await expect(explainSimulationResult(SAMPLE_INPUT)).rejects.toThrow(
      "network timeout"
    );
  });
});
