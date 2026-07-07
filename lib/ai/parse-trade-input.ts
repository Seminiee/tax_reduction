import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod";
import taxRules from "@/config/tax-rules.json";
import { HAIKU_MODEL } from "./model";

export { HAIKU_MODEL };

const ISA_TYPE_KEYS = Object.keys(taxRules.isa_account.types) as [string, ...string[]];

export const ParsedTradeInputSchema = z.object({
  stockName: z.string().describe("종목명. 언급이 없으면 '종목'으로 가정"),
  currentPriceKrw: z.number().describe("현재 주가(원 단위 정수)"),
  expectedProfitPerShareKrw: z
    .number()
    .describe("주당 예상 이익(원, 0 이상). 언급이 없으면 0"),
  expectedLossPerShareKrw: z
    .number()
    .describe("주당 예상 손실(원, 0 이상인 크기값). 언급이 없으면 0"),
  quantity: z.number().describe("매수 수량(정수)"),
  isaType: z.enum(ISA_TYPE_KEYS).describe("ISA 유형"),
  assumedFields: z
    .array(
      z.object({
        field: z.string().describe("가정한 필드명"),
        reason: z.string().describe("왜 이 기본값으로 가정했는지에 대한 한국어 설명"),
      })
    )
    .describe("사용자가 명시하지 않아 합리적 기본값으로 채운 필드 목록"),
});

export type ParsedTradeInput = z.infer<typeof ParsedTradeInputSchema>;

// 실사용 원문은 PROMPTS.md에도 동일하게 기록되어 있다 (지원서 제출용, 수정 시 함께 갱신할 것).
export const PARSE_TRADE_SYSTEM_PROMPT = `당신은 한국 세금 시뮬레이터의 매매차익 계산기 입력 파서입니다. 사용자가 자유롭게 서술한 매매 계획을 읽고 아래 필드를 채워 JSON으로 반환하세요.

- stockName: 종목명(문자열). 언급이 없으면 "종목"으로 가정하세요.
- currentPriceKrw: 현재 주가(원 단위 정수).
- expectedProfitPerShareKrw: 주당 예상 이익(원, 0 이상). 언급이 없으면 0으로 가정하세요.
- expectedLossPerShareKrw: 주당 예상 손실(원, 0 이상인 크기값). 언급이 없으면 0으로 가정하세요.
- quantity: 매수 수량(정수).
- isaType: "general"(일반형) | "low_income"(서민형) | "farmer"(농어민형). 언급이 없으면 "general"로 가정하세요.

사용자가 명시적으로 말하지 않아 기본값으로 채운 모든 필드는 assumedFields 배열에 {field, reason} 형태로 반드시 포함하세요. reason은 왜 그 기본값을 선택했는지 한국어로 간단히 설명하세요. 사용자가 준 정보로 확정할 수 있는 필드는 assumedFields에 넣지 마세요.`;

export async function parseTradeInput(text: string): Promise<ParsedTradeInput> {
  const client = new Anthropic();

  const response = await client.messages.parse(
    {
      model: HAIKU_MODEL,
      max_tokens: 1024,
      system: PARSE_TRADE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
      output_config: {
        format: zodOutputFormat(ParsedTradeInputSchema),
      },
    },
    { timeout: 20_000 }
  );

  if (!response.parsed_output) {
    throw new Error("AI_PARSE_EMPTY_OUTPUT");
  }

  return response.parsed_output;
}
