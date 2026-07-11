import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

import {
  buildCurrentSimulationContext,
  chatWithTaxAssistant,
  HAIKU_MODEL,
  MAX_HISTORY_MESSAGES,
  MAX_MESSAGE_LENGTH,
  sliceRecentMessages,
  validateChatMessages,
  type ChatCurrentSimulation,
  type ChatMessage,
} from "./chat-with-tax-assistant";

const SAMPLE_SIMULATION: ChatCurrentSimulation = {
  kind: "hold",
  request: {
    principalKrw: 10_000_000,
    annualReturnRate: 0.08,
    annualDividendYieldRate: 0,
    holdingYears: 5,
    isaType: "general",
    annualFinancialIncomeKrw: 0,
  },
  response: {
    generalAccount: { finalAfterTaxValue: 14_210_759, totalTax: 482_522 },
    isaAccount: {
      finalAfterTaxValue: 14_426_646,
      tax: 266_635,
      isEarlyWithdrawal: false,
      taxableExcess: 2_693_281,
      taxFreeLimitKrw: 2_000_000,
    },
  },
};

const SAMPLE_TRADE_SIMULATION: ChatCurrentSimulation = {
  kind: "trade",
  request: {
    stockName: "나스닥 100 ETF",
    currentPriceKrw: 100_000,
    expectedProfitPerShareKrw: 50_000,
    expectedLossPerShareKrw: 0,
    quantity: 200,
    isaType: "general",
  },
  response: {
    totalInvestKrw: 20_000_000,
    isExceedingContributionLimit: false,
    isaQuantity: 200,
    generalQuantity: 0,
    taxFreeLimitKrw: 2_000_000,
    isaTaxKrw: 792_000,
    generalForcedTaxKrw: 0,
    generalOnlyTaxKrw: 1_650_000,
    totalTaxKrw: 792_000,
    savedAmountKrw: 858_000,
  },
};

const SAMPLE_DIVIDEND_SIMULATION: ChatCurrentSimulation = {
  kind: "dividend",
  request: {
    stockName: "코카콜라",
    quantity: 100,
    dividendPerShareKrw: 100_000,
    currentPriceKrw: 115_000,
    inputMode: "quantity",
    actualInvestedAmountKrw: 11_500_000,
    isaType: "general",
    otherFinancialIncomeKrw: 0,
  },
  response: {
    totalDividendKrw: 10_000_000,
    taxFreeLimitKrw: 2_000_000,
    isComprehensiveTaxationTriggered: false,
    marginalTaxRateApplied: 0.154,
    generalDividendTaxKrw: 1_540_000,
    generalNetReceivedKrw: 8_460_000,
    isaDividendTaxKrw: 792_000,
    isaNetReceivedKrw: 9_208_000,
    taxSavingKrw: 748_000,
  },
};

function mockReply(text: string) {
  mockCreate.mockResolvedValue({ content: [{ type: "text", text }] });
}

describe("validateChatMessages (남용 방지 / 입력 검증)", () => {
  it("빈 배열이면 에러 메시지를 반환한다", () => {
    expect(validateChatMessages([])).toBeTruthy();
  });

  it("role이 user/assistant가 아니면 에러를 반환한다", () => {
    expect(validateChatMessages([{ role: "system", content: "안녕" }])).toBeTruthy();
  });

  it(`content가 ${MAX_MESSAGE_LENGTH}자를 초과하면 에러를 반환한다`, () => {
    const longText = "a".repeat(MAX_MESSAGE_LENGTH + 1);
    expect(validateChatMessages([{ role: "user", content: longText }])).toBeTruthy();
  });

  it("마지막 메시지가 user가 아니면 에러를 반환한다", () => {
    expect(
      validateChatMessages([
        { role: "user", content: "질문" },
        { role: "assistant", content: "답변" },
      ])
    ).toBeTruthy();
  });

  it("정상 입력이면 null을 반환한다", () => {
    expect(
      validateChatMessages([
        { role: "user", content: "ISA 비과세 한도가 뭐예요?" },
      ])
    ).toBeNull();
  });
});

describe("sliceRecentMessages (히스토리 길이 제한)", () => {
  it(`최근 ${MAX_HISTORY_MESSAGES}개만 남긴다`, () => {
    const messages: ChatMessage[] = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `메시지 ${i}`,
    }));

    const result = sliceRecentMessages(messages);
    expect(result.length).toBeLessThanOrEqual(MAX_HISTORY_MESSAGES);
    expect(result[0].role).toBe("user");
    expect(result[result.length - 1].content).toBe("메시지 14");
  });
});

describe("buildCurrentSimulationContext", () => {
  it("투자금액/수익률/세후금액을 포함한 컨텍스트 문자열을 만든다 (kind: hold)", () => {
    const context = buildCurrentSimulationContext(SAMPLE_SIMULATION);
    expect(context).toContain("10,000,000원");
    expect(context).toContain("8.0%");
    expect(context).toContain("14,210,759원");
    expect(context).toContain("14,426,646원");
  });

  it("종목/수량/절세액을 포함한 컨텍스트 문자열을 만든다 (kind: trade)", () => {
    const context = buildCurrentSimulationContext(SAMPLE_TRADE_SIMULATION);
    expect(context).toContain("나스닥 100 ETF");
    expect(context).toContain("200주");
    expect(context).toContain("858,000원");
    expect(context).toContain("ISA 3년 의무유지");
  });

  it("종목/배당금/세금이득을 포함한 컨텍스트 문자열을 만든다 (kind: dividend)", () => {
    const context = buildCurrentSimulationContext(SAMPLE_DIVIDEND_SIMULATION);
    expect(context).toContain("코카콜라");
    expect(context).toContain("100주");
    expect(context).toContain("748,000원");
    expect(context).toContain("ISA 3년 의무유지");
  });
});

describe("chatWithTaxAssistant (Anthropic API 목 처리)", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("claude-haiku-4-5-20251001 모델과 시스템 프롬프트로 호출한다", async () => {
    mockReply("이 조건에서는 ISA가 비과세 한도 덕분에 유리할 수 있어요.");

    const result = await chatWithTaxAssistant([
      { role: "user", content: "ISA가 왜 유리해요?" },
    ]);

    expect(result).toBe("이 조건에서는 ISA가 비과세 한도 덕분에 유리할 수 있어요.");
    const [params] = mockCreate.mock.calls[0];
    expect(params.model).toBe(HAIKU_MODEL);
    expect(params.system).toContain("확정적 투자 조언은 절대 하지 마세요");
  });

  it.each([
    ["ISA 비과세 한도가 정확히 얼마예요? 200만원 맞아요?", "ISA 비과세 한도의 정확한 금액"],
    ["외국납부세액 선환급 폐지가 실제로 시행됐나요?", "외국납부세액 선환급 폐지"],
    ["배당소득 분리과세 개편이 일반계좌 배당주에도 영향 있나요?", "배당소득 분리과세 세율 개편"],
  ])(
    "확인 필요 항목 질문(%s) 시 시스템 프롬프트에 해당 안내 지시가 포함된다",
    async (userQuestion, expectedPhraseInPrompt) => {
      mockReply("이 부분은 자료마다 수치가 달라 국세청/금융투자협회 최신 공지로 확인이 필요합니다.");

      await chatWithTaxAssistant([{ role: "user", content: userQuestion }]);

      const [params] = mockCreate.mock.calls[0];
      expect(params.system).toContain(expectedPhraseInPrompt);
      expect(params.system).toContain(
        "이 부분은 자료마다 수치가 달라 국세청/금융투자협회 최신 공지로 확인이 필요합니다"
      );
    }
  );

  it("범위 밖 질문에도 동일한 시스템 프롬프트(범위 안내 지시 포함)로 호출한다", async () => {
    mockReply("죄송하지만 이 챗봇은 해외주식/ISA 세금 관련 질문만 답변할 수 있어요.");

    const result = await chatWithTaxAssistant([
      { role: "user", content: "오늘 날씨 어때요?" },
    ]);

    expect(result).toContain("이 챗봇은 해외주식/ISA 세금 관련 질문만 답변할 수 있어요");
    const [params] = mockCreate.mock.calls[0];
    expect(params.system).toContain("이 챗봇은 해외주식/ISA 세금 관련 질문만 답변할 수 있어요");
  });

  it("currentSimulation이 있으면 시스템 프롬프트에 시뮬레이션 맥락이 추가된다", async () => {
    mockReply("당신이 방금 계산한 조건 기준으로는 ISA가 더 유리해요.");

    await chatWithTaxAssistant(
      [{ role: "user", content: "왜 ISA가 더 유리해요?" }],
      SAMPLE_SIMULATION
    );

    const [params] = mockCreate.mock.calls[0];
    expect(params.system).toContain("[현재 시뮬레이션 조건]");
    expect(params.system).toContain("14,426,646원");
  });

  it("currentSimulation이 없으면 시스템 프롬프트에 시뮬레이션 맥락이 없다", async () => {
    mockReply("일반적인 설명입니다.");

    await chatWithTaxAssistant([{ role: "user", content: "ISA가 뭐예요?" }]);

    const [params] = mockCreate.mock.calls[0];
    expect(params.system).not.toContain("[현재 시뮬레이션 조건]");
  });

  it("currentSimulation이 kind: trade면 매매차익 컨텍스트를 시스템 프롬프트에 추가한다", async () => {
    mockReply("당신이 방금 계산한 조건 기준으로는 절세 효과가 있어요.");

    await chatWithTaxAssistant(
      [{ role: "user", content: "이 조건에서 얼마나 절세돼요?" }],
      SAMPLE_TRADE_SIMULATION
    );

    const [params] = mockCreate.mock.calls[0];
    expect(params.system).toContain("[현재 시뮬레이션 조건 — 매매차익 계산기]");
    expect(params.system).toContain("858,000원");
  });

  it("currentSimulation이 kind: dividend면 배당금 컨텍스트를 시스템 프롬프트에 추가한다", async () => {
    mockReply("당신이 방금 계산한 배당 조건 기준으로는 ISA가 더 유리해요.");

    await chatWithTaxAssistant(
      [{ role: "user", content: "이 배당금 조건에서 얼마나 이득이에요?" }],
      SAMPLE_DIVIDEND_SIMULATION
    );

    const [params] = mockCreate.mock.calls[0];
    expect(params.system).toContain("[현재 시뮬레이션 조건 — 배당금 계산기]");
    expect(params.system).toContain("748,000원");
  });

  it("히스토리는 최근 메시지만 잘라 API에 전달한다", async () => {
    mockReply("답변");
    const messages: ChatMessage[] = Array.from({ length: 15 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `메시지 ${i}`,
    }));

    await chatWithTaxAssistant(messages);

    const [params] = mockCreate.mock.calls[0];
    expect(params.messages.length).toBeLessThanOrEqual(MAX_HISTORY_MESSAGES);
  });

  it("텍스트 블록이 없으면 에러를 던진다", async () => {
    mockCreate.mockResolvedValue({ content: [] });
    await expect(
      chatWithTaxAssistant([{ role: "user", content: "질문" }])
    ).rejects.toThrow("AI_CHAT_EMPTY_OUTPUT");
  });

  it("Anthropic API 호출이 실패하면 에러가 그대로 전파된다 (라우트에서 폴백 처리)", async () => {
    mockCreate.mockRejectedValue(new Error("network timeout"));
    await expect(
      chatWithTaxAssistant([{ role: "user", content: "질문" }])
    ).rejects.toThrow("network timeout");
  });
});
