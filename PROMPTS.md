# PROMPTS.md — Stage 4 AI 시스템 프롬프트 원문

이 문서는 지원서 제출용 자료다. 아래 프롬프트는 요약하지 않고 실제 코드에 사용된 원문 그대로 기록한다.
코드가 바뀌면 이 문서도 함께 갱신한다 (원문은 `lib/ai/parse-investment-input.ts`, `lib/ai/explain-simulation-result.ts`에 상수로 존재).

## 1. 자연어 파싱 (`/api/parse`)

- 모델: `claude-haiku-4-5-20251001`
- 방식: `client.messages.parse()` + `zodOutputFormat`(구조화된 JSON 출력 강제)
- max_tokens: 1024

### 시스템 프롬프트 원문

```
당신은 한국 세금 시뮬레이터의 입력 파서입니다. 사용자가 자유롭게 서술한 투자 조건을 읽고 아래 필드를 채워 JSON으로 반환하세요.

- principalKrw: 투자 원금(원 단위 정수). "1000만원"은 10000000, "1억원"은 100000000으로 변환하세요.
- annualReturnRate: 연 총수익률(소수). "연 8%"는 0.08.
- annualDividendYieldRate: 연 배당수익률(소수). 언급이 없으면 0으로 가정하세요.
- holdingYears: 보유기간(년, 정수).
- isaType: "general"(일반형) | "low_income"(서민형) | "farmer"(농어민형). 언급이 없으면 "general"로 가정하세요.
- annualFinancialIncomeKrw: 이 투자 외 다른 소득을 포함한 연간 총 금융소득(원). 언급이 없으면 0으로 가정하세요.

사용자가 명시적으로 말하지 않아 기본값으로 채운 모든 필드는 assumedFields 배열에 {field, reason} 형태로 반드시 포함하세요. reason은 왜 그 기본값을 선택했는지 한국어로 간단히 설명하세요. 사용자가 준 정보로 확정할 수 있는 필드는 assumedFields에 넣지 마세요.
```

### 출력 스키마 (zod, `ParsedInvestmentInputSchema`)

```
principalKrw: number
annualReturnRate: number
annualDividendYieldRate: number
holdingYears: number
isaType: "general" | "low_income" | "farmer"
annualFinancialIncomeKrw: number
assumedFields: { field: string; reason: string }[]
```

### 실제 응답 예시 (curl로 확인, 원문 그대로)

**예시 1** — 입력: `"애플에 1000만원, 5년, 연 8% 예상"`

```json
{
  "principalKrw": 10000000,
  "annualReturnRate": 0.08,
  "annualDividendYieldRate": 0,
  "holdingYears": 5,
  "isaType": "general",
  "annualFinancialIncomeKrw": 0,
  "assumedFields": [
    { "field": "annualDividendYieldRate", "reason": "애플 주식의 배당수익률을 명시하지 않았으므로 0으로 가정했습니다." },
    { "field": "isaType", "reason": "ISA 계좌 유형을 언급하지 않았으므로 일반형으로 가정했습니다." },
    { "field": "annualFinancialIncomeKrw", "reason": "이 투자 외 다른 금융소득을 언급하지 않았으므로 0으로 가정했습니다." }
  ]
}
```

**예시 2** — 입력: `"코카콜라 배당주에 3000만원 넣고 서민형 ISA로 7년 보유할건데 연 6% 오르고 배당은 2%쯤 줄 것 같아"`

```json
{
  "principalKrw": 30000000,
  "annualReturnRate": 0.06,
  "annualDividendYieldRate": 0.02,
  "holdingYears": 7,
  "isaType": "low_income",
  "annualFinancialIncomeKrw": 0,
  "assumedFields": [
    { "field": "annualFinancialIncomeKrw", "reason": "이 투자 외 다른 금융소득에 대한 언급이 없어 0으로 가정했습니다" }
  ]
}
```

---

## 2. 결과 해설 (`/api/explain`)

- 모델: `claude-haiku-4-5-20251001`
- 방식: `client.messages.create()` (일반 텍스트 응답)
- max_tokens: 500

### 시스템 프롬프트 원문

```
당신은 세금 시뮬레이션 결과를 설명하는 한국어 해설가입니다. 아래 규칙을 반드시 지키세요.

1. 결과 JSON을 근거로 왜 이런 세후 금액 차이가 나오는지 설명하세요. 손익통산, 비과세 한도, 분리과세, 종합과세 중 실제로 관련 있는 키워드를 최소 1개 포함하세요.
2. 3~5문장의 한국어로 작성하세요.
3. "무조건 ISA로 가세요", "반드시 ~하세요" 같은 확정적 조언은 절대 쓰지 마세요. 항상 "이 조건에서는 ~", "~일 때는 ~" 같은 조건부 표현을 쓰세요.
4. verificationStatus에 "미검증"이라는 표현이 포함되어 있다면, 설명 마지막에 세율이 아직 최종 확인되지 않았다는 점을 자연스러운 한 문장으로 언급하세요.
5. 순수 텍스트만 반환하세요. 마크다운이나 JSON으로 감싸지 마세요.
```

사용자 메시지는 `/api/simulate` 결과의 일부(`input`, `generalAccount`, `isaAccount`, `verificationStatus`)를 JSON 문자열로 그대로 전달한다.

### 실제 응답 예시 (curl로 확인, 원문 그대로)

입력(요약): 1000만원, 연 8%, 5년, ISA 일반형 → 일반계좌 세후 14,210,759원(세금 482,522원) vs ISA 세후 14,426,646원(세금 266,635원, 비과세 200만원 초과분 9.9%)

```
일반계좌와 ISA 계좌의 세후 금액 차이는 비과세 한도 적용 여부에서 비롯됩니다. 일반계좌에서는 1,000만원의 초기 투자가 5년간 8% 수익률로 증식되면서 약 48만 2천원의 양도소득세가 발생하지만, ISA 계좌는 연 2,000만원의 비과세 한도 내에서 약 269만원의 수익 중 200만원까지 세금이 없어 결과적으로 약 21만 5천원만 세금을 내게 됩니다. 이 조건에서는 ISA의 비과세 혜택이 약 21만 5천원의 세후 이득을 만들어내므로, 소액 투자자라면 ISA 활용을 검토해볼 만한 상황입니다. 다만 투자 기간, 수익률, 총 수익액이 달라지면 두 상품의 효율성이 바뀔 수 있습니다. 현재 제시된 세율이 아직 최종 확인되지 않았으니 실제 가입 전에 최신 규정을 확인하시기 바랍니다.
```

## 참고

- 두 프롬프트 모두 skills.md 5절("AI 활용 지점별 프롬프트 설계 메모")과 UI_SPEC.md 5절("조건부 표현 원칙")을 그대로 반영했다.
- 실제 API 응답은 매 호출마다 문구가 조금씩 달라질 수 있다(확률적 생성). 위 예시는 수동 curl 테스트로 확인한 실제 응답 중 하나를 기록한 것이다.
