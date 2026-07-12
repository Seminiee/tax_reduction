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
  buildHoldExplainPayload,
  substitutePlaceholders,
  detectUnsubstitutedNumbers,
  HAIKU_MODEL,
  EXPLAIN_SYSTEM_PROMPT_HOLD,
  EXPLAIN_SYSTEM_PROMPT_TRADE,
  type ExplainSimulationInput,
  type TradeExplainInput,
  type HoldExplainInput,
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
// Stage 27: 일반계좌 세율이 22%+250만원 공제에서 15.4% 배당소득세+한계세율로 바뀌면서
// `/`의 기본 예시(TIGER 미국S&P500, Stage 25)와 같은 시나리오로 값을 다시 계산해 갱신했다.
const SAMPLE_TRADE_INPUT: ExplainSimulationInput = {
  kind: "trade",
  input: {
    stockName: "TIGER 미국S&P500",
    currentPriceKrw: 20_000,
    expectedProfitPerShareKrw: 3_000,
    expectedLossPerShareKrw: 0,
    quantity: 1_500,
    isaType: "general",
  },
  result: {
    totalInvestKrw: 30_000_000,
    annualContributionLimitKrw: 20_000_000,
    isExceedingContributionLimit: true,
    isaQuantity: 1_000,
    generalQuantity: 500,
    taxFreeLimitKrw: 2_000_000,
    netGainForIsaKrw: 3_000_000,
    isaTaxKrw: 99_000,
    isComprehensiveTaxationTriggered: false,
    marginalTaxRateApplied: 0.154,
    generalForcedTaxKrw: 231_000,
    generalOnlyTaxKrw: 693_000,
    totalTaxKrw: 330_000,
    savedAmountKrw: 363_000,
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
    // Stage 28: hold payload도 buildHoldExplainPayload로 감싸져(isaAccount.taxableExcessFormatted
    // 추가) 더 이상 원본 SAMPLE_INPUT과 완전히 같지 않다.
    expect(JSON.parse(params.messages[0].content)).toEqual(
      buildHoldExplainPayload(SAMPLE_INPUT as HoldExplainInput)
    );
  });

  it("kind가 trade면 EXPLAIN_SYSTEM_PROMPT_TRADE(v7)로, hold면 EXPLAIN_SYSTEM_PROMPT_HOLD(v3)로 호출한다", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "이 조건에서는 ISA 계좌가 세금이 더 적어요." }],
    });

    await explainSimulationResult(SAMPLE_INPUT);
    expect(mockCreate.mock.calls[0][0].system).toBe(EXPLAIN_SYSTEM_PROMPT_HOLD);
    // Stage 28: hold도 buildHoldExplainPayload로 감싸져 나간다(taxableExcessFormatted 추가).
    expect(JSON.parse(mockCreate.mock.calls[0][0].messages[0].content)).toEqual(
      buildHoldExplainPayload(SAMPLE_INPUT as HoldExplainInput)
    );

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
    // Stage 28: result에 isaTaxableExcessKrw(Formatted)가 추가돼 더 이상 원본 tradeInput.result와
    // 완전히 같지 않다 — 원본 필드는 그대로 포함되어 있는지만 부분 일치로 확인한다.
    expect(sentPayload.result).toMatchObject(tradeInput.result);
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

  it("Stage 27: trade payload에 isComprehensiveTaxationTriggered/marginalTaxRateApplied가 포함되고 15.4%/한계세율 기준 설명이 붙는다", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "이 조건에서는 ISA 계좌가 세금이 더 적어요." }],
    });

    await explainSimulationResult(SAMPLE_TRADE_INPUT);

    const sentPayload = JSON.parse(mockCreate.mock.calls[0][0].messages[0].content);

    expect(sentPayload.result.isComprehensiveTaxationTriggered).toBe(false);
    expect(sentPayload.result.marginalTaxRateApplied).toBeCloseTo(0.154, 6);
    expect(sentPayload.fieldDescriptions.isComprehensiveTaxationTriggered).toContain(
      "금융소득종합과세"
    );
    expect(sentPayload.fieldDescriptions.marginalTaxRateApplied).toContain("한계세율");
  });

  it("Stage 27: EXPLAIN_SYSTEM_PROMPT_TRADE가 15.4% 배당소득세를 명시하고 22% 양도소득세는 이 서비스의 계산 대상이 아니라고 안내한다", () => {
    expect(EXPLAIN_SYSTEM_PROMPT_TRADE).toContain("15.4%");
    expect(EXPLAIN_SYSTEM_PROMPT_TRADE).toContain("국내상장 해외ETF");
    expect(EXPLAIN_SYSTEM_PROMPT_TRADE).toContain("22% 양도소득세");
    expect(EXPLAIN_SYSTEM_PROMPT_TRADE).toContain("이 서비스의 계산 대상이 아니므로");
  });

  it("Stage 28: trade payload의 isaTaxableExcessKrw/isaTaxableExcessKrwFormatted가 ISA 순이익-비과세한도를 정확히 '만원' 단위로 미리 계산해 제공한다", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "이 조건에서는 ISA 계좌가 세금이 더 적어요." }],
    });

    await explainSimulationResult(SAMPLE_TRADE_INPUT);

    const sentPayload = JSON.parse(mockCreate.mock.calls[0][0].messages[0].content);

    // netGainForIsaKrw(3,000,000) - taxFreeLimitKrw(2,000,000) = 1,000,000원 = "100만원"
    expect(sentPayload.result.isaTaxableExcessKrw).toBe(1_000_000);
    expect(sentPayload.result.isaTaxableExcessKrwFormatted).toBe("100만원");
    expect(sentPayload.fieldDescriptions.isaTaxableExcessKrwFormatted).toContain("만원");
  });

  it("Stage 29: EXPLAIN_SYSTEM_PROMPT_TRADE가 숫자를 직접 쓰지 말고 플레이스홀더만 쓰라는 규칙과 사용 가능한 목록을 포함한다", () => {
    expect(EXPLAIN_SYSTEM_PROMPT_TRADE).toContain("절대 아라비아 숫자로 직접 쓰지 말고");
    expect(EXPLAIN_SYSTEM_PROMPT_TRADE).toContain("사용 가능한 플레이스홀더");
    expect(EXPLAIN_SYSTEM_PROMPT_TRADE).toContain("{{isaTaxableExcessKrw}}");
    expect(EXPLAIN_SYSTEM_PROMPT_TRADE).toContain("{{isaTaxKrw}}");
    expect(EXPLAIN_SYSTEM_PROMPT_TRADE).toContain("{{totalTaxKrw}}");
  });

  it("Stage 28: hold payload의 isaAccount.taxableExcessFormatted가 '만원' 단위로 정확히 미리 계산된다", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "이 조건에서는 ISA 계좌가 세금이 더 적어요." }],
    });

    await explainSimulationResult(SAMPLE_INPUT);

    const sentPayload = JSON.parse(mockCreate.mock.calls[0][0].messages[0].content);

    // taxableExcess(2,693,281) / 10,000 = 269.3281 -> 반올림 269 -> "269만원"
    expect(sentPayload.isaAccount.taxableExcess).toBe(2_693_281);
    expect(sentPayload.isaAccount.taxableExcessFormatted).toBe("269만원");
  });

  it("Stage 29: EXPLAIN_SYSTEM_PROMPT_HOLD가 숫자를 직접 쓰지 말고 플레이스홀더만 쓰라는 규칙과 사용 가능한 목록을 포함한다", () => {
    expect(EXPLAIN_SYSTEM_PROMPT_HOLD).toContain("절대 아라비아 숫자로 직접 쓰지 말고");
    expect(EXPLAIN_SYSTEM_PROMPT_HOLD).toContain("사용 가능한 플레이스홀더");
    expect(EXPLAIN_SYSTEM_PROMPT_HOLD).toContain("{{isaTaxableExcessKrw}}");
    expect(EXPLAIN_SYSTEM_PROMPT_HOLD).toContain("{{isaTaxKrw}}");
    expect(EXPLAIN_SYSTEM_PROMPT_HOLD).toContain("{{principalKrw}}");
  });

  it("Stage 29: AI 응답의 {{필드명}} 플레이스홀더가 실제 값으로 정확히 치환된 최종 텍스트가 반환된다 (trade)", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "ISA 초과분인 {{isaTaxableExcessKrw}}원({{isaTaxableExcessKrwFormatted}})에 {{isaSeparateTaxRatePercent}}가 적용되어 세금이 {{isaTaxKrw}}원이 됩니다. 총 세금은 {{totalTaxKrw}}원입니다.",
        },
      ],
    });

    const result = await explainSimulationResult(SAMPLE_TRADE_INPUT);

    // netGainForIsaKrw(3,000,000) - taxFreeLimitKrw(2,000,000) = 1,000,000원
    expect(result).toContain("1,000,000원");
    expect(result).toContain("100만원");
    expect(result).toContain("9.9%");
    expect(result).toContain("99,000원");
    expect(result).toContain("330,000원");
    expect(result).not.toContain("{{");
    expect(result).not.toContain("}}");
  });

  it("Stage 29: 목록에 없는 플레이스홀더는 안전 문구로 대체되고 앱이 죽지 않는다 (trade)", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "예상 절세액은 {{totallyMadeUpFieldName}}입니다." }],
    });

    const result = await explainSimulationResult(SAMPLE_TRADE_INPUT);

    expect(result).toContain("(값 확인 필요)");
    expect(result).not.toContain("{{");
  });

  it("Stage 29: substitutePlaceholders가 알려진 필드는 값으로, 알 수 없는 필드는 안전 문구로 치환한다", () => {
    const placeholderMap = { totalTaxKrw: "330,000원" };

    expect(substitutePlaceholders("총 세금은 {{totalTaxKrw}}입니다.", placeholderMap)).toBe(
      "총 세금은 330,000원입니다."
    );
    expect(substitutePlaceholders("절세액은 {{unknownField}}입니다.", placeholderMap)).toBe(
      "절세액은 (값 확인 필요)입니다."
    );
    expect(substitutePlaceholders("플레이스홀더가 없는 문장입니다.", placeholderMap)).toBe(
      "플레이스홀더가 없는 문장입니다."
    );
  });

  it("Stage 29: detectUnsubstitutedNumbers가 플레이스홀더 없이 직접 쓴 금액은 감지하고, 플레이스홀더로만 쓴 문장은 통과시킨다", () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(detectUnsubstitutedNumbers("초과분 100만원에 9.9%가 적용되어 99,000원이 됩니다.")).toBe(
      true
    );
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleWarnSpy.mockClear();
    expect(
      detectUnsubstitutedNumbers(
        "초과분 {{isaTaxableExcessKrwFormatted}}에 {{isaSeparateTaxRatePercent}}가 적용되어 {{isaTaxKrw}}이 됩니다."
      )
    ).toBe(false);
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
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
