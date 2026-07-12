import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

import {
  explainSimulationResult,
  buildTradeExplainPayload,
  HAIKU_MODEL,
  EXPLAIN_SYSTEM_PROMPT_HOLD,
  EXPLAIN_SYSTEM_PROMPT_TRADE,
  type ExplainSimulationInput,
  type TradeExplainInput,
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
  verificationStatus:
    "일부 세부 사항은 아직 확정되지 않았으니 투자 결정 전 최신 공지를 확인하시기 바랍니다.",
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
    annualContributionLimitKrw: 20_000_000,
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
  verificationStatus:
    "일부 세부 사항은 아직 확정되지 않았으니 투자 결정 전 최신 공지를 확인하시기 바랍니다.",
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

  it("kind가 trade면 EXPLAIN_SYSTEM_PROMPT_TRADE(v3)로, hold면 EXPLAIN_SYSTEM_PROMPT_HOLD(v1)로 호출한다", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "이 조건에서는 ISA 계좌가 세금이 더 적어요." }],
    });

    await explainSimulationResult(SAMPLE_INPUT);
    expect(mockCreate.mock.calls[0][0].system).toBe(EXPLAIN_SYSTEM_PROMPT_HOLD);
    // hold(v1)는 Stage 22 변경 대상이 아니므로 payload가 원본 input 그대로여야 한다.
    expect(JSON.parse(mockCreate.mock.calls[0][0].messages[0].content)).toEqual(SAMPLE_INPUT);

    mockCreate.mockClear();
    await explainSimulationResult(SAMPLE_TRADE_INPUT);
    expect(mockCreate.mock.calls[0][0].system).toBe(EXPLAIN_SYSTEM_PROMPT_TRADE);
  });

  it("Stage 22: trade payload에는 원본 input/result/verificationStatus와 함께 fieldDescriptions가 포함되고, generalOnlyTaxKrw/generalForcedTaxKrw 설명이 명확히 구분된다", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "이 조건에서는 ISA 계좌가 세금이 더 적어요." }],
    });

    await explainSimulationResult(SAMPLE_TRADE_INPUT);

    const sentPayload = JSON.parse(mockCreate.mock.calls[0][0].messages[0].content);
    const tradeInput = SAMPLE_TRADE_INPUT as TradeExplainInput;

    expect(sentPayload).toEqual(buildTradeExplainPayload(tradeInput));
    expect(sentPayload.input).toEqual(tradeInput.input);
    expect(sentPayload.result).toEqual(tradeInput.result);
    expect(sentPayload.verificationStatus).toBe(tradeInput.verificationStatus);

    expect(sentPayload.fieldDescriptions.generalOnlyTaxKrw).toContain("가상 세금");
    expect(sentPayload.fieldDescriptions.generalForcedTaxKrw).toContain("실제로 부과되는 세금");
    expect(sentPayload.fieldDescriptions.generalOnlyTaxKrw).not.toBe(
      sentPayload.fieldDescriptions.generalForcedTaxKrw
    );
  });

  it("Stage 22: EXPLAIN_SYSTEM_PROMPT_TRADE에 generalOnlyTaxKrw 오용을 금지하는 규칙이 포함된다", () => {
    expect(EXPLAIN_SYSTEM_PROMPT_TRADE).toContain("generalOnlyTaxKrw");
    expect(EXPLAIN_SYSTEM_PROMPT_TRADE).toContain("generalForcedTaxKrw");
    expect(EXPLAIN_SYSTEM_PROMPT_TRADE).toContain("fieldDescriptions");
  });

  it("Stage 23: trade payload에 annualContributionLimitKrw가 포함되고, taxFreeLimitKrw/annualContributionLimitKrw 설명이 명확히 구분된다", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "이 조건에서는 ISA 계좌가 세금이 더 적어요." }],
    });

    await explainSimulationResult(SAMPLE_TRADE_INPUT);

    const sentPayload = JSON.parse(mockCreate.mock.calls[0][0].messages[0].content);

    expect(sentPayload.result.annualContributionLimitKrw).toBe(20_000_000);
    expect(sentPayload.fieldDescriptions.taxFreeLimitKrw).toContain("수익");
    expect(sentPayload.fieldDescriptions.taxFreeLimitKrw).toContain("일반형 200만원");
    expect(sentPayload.fieldDescriptions.annualContributionLimitKrw).toContain("투자 원금");
    expect(sentPayload.fieldDescriptions.annualContributionLimitKrw).toContain("2,000만원");
    expect(sentPayload.fieldDescriptions.taxFreeLimitKrw).not.toBe(
      sentPayload.fieldDescriptions.annualContributionLimitKrw
    );
  });

  it("Stage 23: EXPLAIN_SYSTEM_PROMPT_TRADE에 taxFreeLimitKrw/annualContributionLimitKrw 혼동을 금지하는 규칙이 포함된다", () => {
    expect(EXPLAIN_SYSTEM_PROMPT_TRADE).toContain("taxFreeLimitKrw");
    expect(EXPLAIN_SYSTEM_PROMPT_TRADE).toContain("annualContributionLimitKrw");
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
