# PROGRESS.md — 세션 진행 로그

새 세션 시작 시 이 파일의 "현재 상태"부터 확인한다.

## 현재 상태
- **다음 작업**: Stage 5 (AI 세제 Q&A 챗봇, 선택 기능) — 사용자 확인 후 시작
- **마지막 업데이트**: 2026-07-05 (Stage 4 완료)

## 스테이지 체크리스트

| Stage | 내용 | 상태 |
|---|---|---|
| 0 | 프로젝트 스캐폴딩 (Next.js 세팅, 폴더 구조, 배포 파이프라인 확인) | done |
| 1 | 세금 계산 엔진 (config/tax-rules.json + lib/tax 순수함수 + 단위테스트) | done |
| 2 | 시뮬레이션 API (/api/simulate) — 연도별 세후 자산 곡선 반환 | done |
| 3 | 프론트엔드 입력 폼 + 결과 그래프 UI | done |
| 4 | AI 자연어 파싱 + 결과 해설 (/api/explain, Anthropic API 연동) | done |
| 5 | AI 세제 Q&A 챗봇 (선택 기능, /api/chat) | todo |
| 6 | 배포(Vercel) + QA + 지원서 자료(스크린샷, 프롬프트 캡처) 준비 | todo |

## 세션 로그
### 2026-07-05
- 주제 확정: 일반 해외주식 계좌 직투 vs ISA 국내상장 해외ETF 세후수익률 시뮬레이션
- CLAUDE.md / skills.md / README.md / feature_list.json / config/tax-rules.json 초안 작성 완료
- Stage 0(scaffolding) 완료: Next.js 16(TS, App Router) + Tailwind v4 init, tax-rules.json을 config/로 이동, git 저장소 초기화, Vercel 배포(https://taxreduction.vercel.app) 확인
- UI/UX 시안 확정: UI_SPEC.md 작성. feature_list.json Stage 3 작업 항목을 이 스펙 기준으로 갱신.
  - ⚠️ 참고: UI_SPEC.md/CLAUDE.md가 참조하는 `design/ui-mockup.html`이 현재 저장소에 존재하지 않음 — Stage 3 시작 전 확인 필요.
- 다음 세션에서 할 일: Stage 1(tax-engine)부터 진행. lib/tax 구현 시 UI_SPEC.md 3절의 findIsaThresholdPrincipal 함수도 함께 추가할 것.

### 2026-07-05 (Stage 1)
- config/tax-rules.json에 `general_account.comprehensive_taxation_threshold_krw`(2천만원, 금융소득종합과세 기준) 필드 추가. 기존 값은 전혀 수정하지 않음.
- lib/tax/general-account.ts: 직투 계좌 순수함수(simulateGeneralAccount) 구현 — 연도별 배당 원천징수(현지+국내 top-up, 금융소득종합과세 기준 초과 시 한계세율 적용) + 보유기간 종료 시 단일 매도 매매차익(기본공제 후 22%) 과세
- lib/tax/isa-account.ts: ISA 계좌 순수함수(simulateIsaAccount) 구현 — 연도별 통산(국내 과세 없음, foreign_dividend_pre_refund_abolished 플래그로 현지 원천세 처리 분기) + 만기 시 비과세한도 초과분 9.9% 분리과세, 3년 미만 중도해지 시 15.4% 일반과세로 대체
- lib/tax/threshold.ts: findIsaThresholdPrincipal 순수함수 구현 (UI_SPEC.md 3절 공식) — growthFactor ≤ 0(연수익률 0% 이하) 예외 케이스를 별도 result kind로 처리
- vitest 도입(devDependency) — Node 20.11.1 환경에서 vitest 4.x(rolldown 기반)가 `node:util styleText` 미지원으로 기동 실패해 vitest 2.1.9로 고정
- lib/tax/tax-engine.test.ts: skills.md 4절 5개 시나리오 + findIsaThresholdPrincipal 역산/경계 시나리오까지 총 6개 시나리오, 11개 테스트 전부 통과 확인 (`npm run test`)
- `npm run build` 정상 통과 확인, lib/tax 폴더 React import 없음(grep으로 확인)
- 다음 세션에서 할 일: 사용자 확인 후 Stage 2 (시뮬레이션 API, /api/simulate) 시작. Stage 3 시작 전 design/ui-mockup.html 존재 여부 재확인 필요.

### 2026-07-05 (경로 정리)
- 루트에 있던 `ui-mockup.html`을 문서(CLAUDE.md/UI_SPEC.md/feature_list.json)가 참조하는 `design/ui-mockup.html`로 이동.
- feature_list.json Stage 0 status가 Stage 1 커밋(211aa22) 때 실수로 "done"→"todo"로 되돌아가 있던 것을 발견해 "done"으로 재수정 (git 커밋 이력 기준으로 확인: 90a0b60에서는 done이었으나 211aa22 diff에 의도치 않게 포함됨).

### 2026-07-05 (Stage 2)
- config/tax-rules.json에 `national_income_tax_brackets`(종합소득세 누진세율표, 한계세율만) 추가. skills.md 2절과 동일하게 `verification_status: 미검증 초안` 표시 포함 — 표준적으로 알려진 8단계 구간·세율(6%~45%)을 사용했으나 2026년 시행 기준 최종 확인은 안 됨.
- lib/tax/income-tax-brackets.ts: resolveMarginalIncomeTaxRate 순수함수 신규 추가 + tax-engine.test.ts에 경계값 테스트 3건 추가 (CLAUDE.md 규칙 2 — 모든 세금 계산 함수는 단위테스트 동반)
- app/api/simulate/route.ts 구현: 입력 검증(400 에러 응답 포함) → annualFinancialIncomeKrw가 comprehensive_taxation_threshold_krw 초과 시에만 브래킷에서 한계세율 조회 → simulateGeneralAccount/simulateIsaAccount/findIsaThresholdPrincipal 결과를 하나의 JSON으로 병합해 반환
- 로컬 dev 서버(curl)로 4개 시나리오(성장주/정상, 배당주+서민형+3년미만 중도해지, 고배당+종합과세 15%/42% 구간, 입력검증 실패 2건) 모두 정상 응답 확인
- `npm run test`(14개) / `npm run build` 모두 통과
- 다음 세션에서 할 일: 사용자 확인 후 Stage 3(frontend-ui) 시작. UI_SPEC.md + design/ui-mockup.html 브라우저로 열어 인터랙션 재확인 후 진행.

### 2026-07-05 (종합과세 계산 검증)
- Stage 3 시작 전 요청받은 대로 lib/tax/general-account.ts, app/api/simulate/route.ts의 금융소득종합과세 계산 방식을 재확인 — 2천만원(comprehensive_taxation_threshold_krw) 이하는 이미 15.4% 분리과세로 유지되고 초과분에만 한계세율이 적용되고 있어 코드 변경 없음 (curl로 재검증: domesticDividendTax = 임계분+초과분 합산이 정확히 일치).
- skills.md 3절에 이 단순화(완전한 비교과세 대신 초과분만 마진세율)를 가정으로 명시.

### 2026-07-05 (Stage 3)
- components/tax-simulator/ 아래에 Header, ConditionInputCard, AmountSliderCard, ResultComparisonCard, Disclaimer 컴포넌트 + 오케스트레이터 TaxSimulator.tsx("use client") 구현
- UI_SPEC.md 1절 디자인 언어(색상/카드/타이포)를 CSS 모듈(TaxSimulator.module.css)로 그대로 이식, design/ui-mockup.html 대비 임의 변경 없음
- 슬라이더는 /api/simulate를 호출하지 않고 lib/tax의 simulateGeneralAccount/simulateIsaAccount/findIsaThresholdPrincipal을 클라이언트에서 직접 호출 — 네트워크 지연 없이 즉시 반응 (/api/simulate 라우트 자체는 미변경, Stage 4용으로 유지)
- UI_SPEC.md 4절 안내문구 4가지 상태(정상/전구간초과/전구간안전/3년미만)를 모두 분기 구현. 단, growthFactor≤0(연수익률 0% 이하)인 경우는 mockup의 스크립트가 "3년미만"과 동일한 분기로 잘못 묶여 있던 것을 발견해, UI_SPEC.md 4절 원문(4개 상태는 서로 별개)에 맞춰 "전구간안전"으로 올바르게 분리 구현함 — mockup 스크립트가 아닌 UI_SPEC.md 문서를 최종 근거로 삼음
- 결과 비교 카드의 "이 조건에서 더 유리" 배지는 mockup처럼 ISA 쪽에만 두지 않고, 실제로 더 유리한 쪽(일반계좌/ISA 어느 쪽이든)에 동일하게 표시하도록 일반화 (task 지시문 "더 유리한 쪽 강조"에 맞춤, mockup은 ISA 배지만 구현된 상태였음)
- disclaimer는 taxRules.verification_status/simulation_assumptions를 그대로 렌더링(하드코딩 문구 없음)
- Playwright(임시로 scratchpad에 설치, 프로젝트에 미포함)로 5가지 상태(기본/한도초과/3년미만/전구간초과/전구간안전) 스크린샷 확인, 콘솔 에러 없음 확인
- 스크린샷 확인 중 슬라이더 마커의 부동소수점 좌표값을 그대로 style에 넣어 SSR/CSR 하이드레이션 불일치 경고가 발생하는 것을 발견해 소수점 4자리로 반올림하여 수정
- `npm run build`, `npm run lint`, `npm run test`(14개) 모두 통과
- 다음 세션에서 할 일: 사용자 확인 후 Stage 4(ai-explain, /api/explain Anthropic 연동) 시작.

### 2026-07-05 (Stage 4)
- `@anthropic-ai/sdk`, `zod` 설치. 모델은 사용자 지정대로 `claude-haiku-4-5-20251001` 고정 사용, 필요 시 sonnet-5 전환 여부는 먼저 상의하기로 함.
- lib/ai/parse-investment-input.ts: `client.messages.parse()` + `zodOutputFormat`으로 자유 서술 → 구조화 JSON(assumedFields 포함) 파싱. lib/ai/explain-simulation-result.ts: `client.messages.create()`로 3~5문장 조건부 표현 해설 생성.
- app/api/parse/route.ts, app/api/explain/route.ts 신규 구현 (기존 app/api/simulate/route.ts는 미변경). 실패 시 502 + 폴백 메시지, 앱은 죽지 않음.
- PROMPTS.md에 두 시스템 프롬프트 원문과 curl로 확인한 실제 응답 예시(파싱 2건, 해설 1건)를 기록.
- 단위 테스트(lib/ai/*.test.ts, 6개)는 `@anthropic-ai/sdk`를 vi.mock으로 목 처리해 실제 API를 호출하지 않음. 스모크 테스트(lib/ai/*.smoke.test.ts, 2개)는 `RUN_AI_SMOKE_TEST=1` 환경변수 게이트로 기본 `npm run test`에서는 항상 스킵되고, README에 수동 실행 커맨드를 기록 — 실제로 그 커맨드를 실행해 통과 확인함.
- UI 연결: NaturalLanguageInputCard(자연어 입력 + "AI로 조건 채우기"), AiExplanationPanel("AI 설명 보기") 컴포넌트를 TaxSimulator.tsx에 연결. 슬라이더 자체는 여전히 API를 호출하지 않고 lib/tax 직접 호출 유지, AI 호출은 버튼 클릭시에만 발생.
- Playwright로 실제 브라우저에서 자연어 입력("애플에 2000만원, 6년, 연 10% 예상") → 폼 자동 채움, "AI 설명 보기" → 조건부 표현 포함 해설 출력을 실제 API로 확인, 콘솔 에러 없음.
- `npm run build`/`npm run lint`/`npm run test`(20개, 스모크 2개 스킵) 모두 통과.
- 다음 세션에서 할 일: 사용자 확인 후 Stage 5(ai-chatbot, 선택 기능) 시작 여부 결정.

<!-- 새 세션 로그는 위 형식으로 아래에 계속 추가 -->
