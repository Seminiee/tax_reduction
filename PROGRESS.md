# PROGRESS.md — 세션 진행 로그

새 세션 시작 시 이 파일의 "현재 상태"부터 확인한다.

## 현재 상태
- **완료**: Stage 18 (dividend-simplify — /dividend에서 다른 금융소득 고급설정 UI 제거, otherFinancialIncomeKrw 항상 0 고정). 로컬 검증 완료, **프로덕션 재배포는 사용자 확인 후 별도 진행 예정**(아직 미배포).
- **마지막 업데이트**: 2026-07-11 (Stage 18 완료)

## 스테이지 체크리스트

| Stage | 내용 | 상태 |
|---|---|---|
| 0 | 프로젝트 스캐폴딩 (Next.js 세팅, 폴더 구조, 배포 파이프라인 확인) | done |
| 1 | 세금 계산 엔진 (config/tax-rules.json + lib/tax 순수함수 + 단위테스트) | done |
| 2 | 시뮬레이션 API (/api/simulate) — 연도별 세후 자산 곡선 반환 | done |
| 3 | 프론트엔드 입력 폼 + 결과 그래프 UI | done |
| 4 | AI 자연어 파싱 + 결과 해설 (/api/explain, Anthropic API 연동) | done |
| 5 | AI 세제 Q&A 챗봇 (선택 기능, /api/chat) | done |
| 6 | 배포(Vercel) + QA + 지원서 자료(스크린샷, 프롬프트 캡처) 준비 | done |
| 7 | 다중 도구 공유 셸 (네비게이션 + 공용 챗봇, feature_list.json 신규 추가) | done |
| 8 | 매매차익 계산기 (/trade, rate-engine 리팩터링 + 신규 순수함수) | done |
| 9 | security-parity + final-qa (rate-limit 점검, npm audit, 최종 배포/검증) | done |
| 10 | 배당금 계산기 (/dividend, rate-engine에 applyGeneralDividendTax 추가) | done |
| 11 | final-security-and-mobile-check (rate-limit/모바일/npm audit/최종 배포) | done |
| 12 | dividend-quantity-input-modes (수량/총매수금액 입력모드, resolveDividendQuantity) | done |
| 13 | deploy-and-verify (rate-limit/모바일 재확인, 최종 배포) | done |
| 14 | chatbot-ui-redesign-and-fact-fix (ISA 한도 사실관계 수정 + 하단 바 UI) | done |
| 15 | deploy-and-verify (rate-limit/audit 재확인, 최종 배포) | done |
| 16 | chatbot-scope-eligibility (ISA 가입 자격 요건 챗봇 답변 범위 추가) | done |
| 17 | deploy-and-verify (rate-limit/audit 재확인, 최종 배포) | done |
| 18 | dividend-simplify (다른 금융소득 고급설정 UI 제거) | done |

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

### 2026-07-05 (Stage 5)
- lib/ai/chat-with-tax-assistant.ts: stateless 챗봇(서버 저장 없음, 클라이언트가 매번 히스토리 전체 전송). 시스템 프롬프트는 역할/범위 한정, skills.md 1절 계산 로직 근거, 조건부 표현 강제, skills.md 2절 "확인 필요 항목" 3가지 질문 시 확정 답변 대신 "확인 필요" 안내, currentSimulation 있을 때만 맥락 문장 동적 추가, 마크다운 금지(테스트 중 `**` 노출 발견해 규칙 추가)까지 반영.
- 남용 방지: `validateChatMessages`(메시지당 1000자 제한, role/마지막 메시지 검증), `sliceRecentMessages`(최근 10개만 전송, Anthropic 요구사항에 맞춰 첫 메시지가 user가 되도록 보정) — 둘 다 순수함수로 분리해 단위테스트로 직접 검증.
- app/api/chat/route.ts 신규 구현 (실패 시 502 + "지금은 챗봇을 쓸 수 없어요" 폴백, Stage 4와 동일 패턴).
- 단위테스트 17개: "확인 필요 항목" 3개 질문(비과세 한도/선환급 폐지/배당분리과세 개편)을 각각 mock 시나리오로 넣어 시스템 프롬프트에 해당 지시가 실제로 포함되는지(프롬프트 조립 로직) 검증. 스모크 테스트 3개(일반 질문/확인필요/범위밖)는 RUN_AI_SMOKE_TEST 게이트로 분리, 실제 실행해 통과 확인.
- UI: components/tax-simulator/ChatPanel.tsx — 결과 카드 아래 접었다 펼 수 있는 채팅 패널, UI_SPEC.md 1절 색상/카드 토큰 재사용(새 색상 추가 없음), "AI 답변은 참고용이며 개별 세무 상담을 대체하지 않습니다" 상시 노출. 스트리밍 없이 단순 요청-응답.
- UI_SPEC.md에 "6. Stage 5: 세금 Q&A 챗봇" 섹션 신규 추가 (mockup에는 없던 부분이라 실제 구현 기준으로 문서화).
- PROMPTS.md에 챗봇 시스템 프롬프트 원문(고정+동적 부분) + 3가지 실제 응답 예시(curl로 확인) 기록.
- Playwright로 실제 브라우저에서 챗봇 펼치기 → 질문 전송 → "확인이 필요합니다" 응답 렌더링 확인, 콘솔 에러 없음.
- `npm run build`/`npm run lint`/`npm run test`(37개, 스모크 5개 스킵) 모두 통과.
- 다음 세션에서 할 일: 사용자 확인 후 Stage 6(deploy-and-submit: 최종 Vercel 배포, 지원서 자료, README 정리) 시작.

### 2026-07-05 (Stage 6)
- 보안/개인정보: PII 입력·저장 지점 없음, XSS 취약점(innerHTML류) 없음(AI 텍스트는 전부 JSX 텍스트 보간), ANTHROPIC_API_KEY가 클라이언트 번들(.next/static)에 미노출됨을 직접 grep으로 확인.
- npm audit: vitest 2.1.9 → 3.2.6 업그레이드로 7개 취약점(모더레이트5/high1/critical1) 중 5개 해소, Node 20.11.1 호환성도 유지(테스트 42개 전부 통과 재확인). 남은 postcss 모더레이트 1건은 next 내부 번들 의존성이라 next를 9.x로 내려야만 없어져 그대로 둠 — 런타임에 사용자 입력이 postcss로 흘러가지 않아 이 앱 기준 위험 낮음.
- lib/rate-limit.ts 신규: in-memory IP 기반 rate limiter(분당 10회), /api/parse·/api/explain·/api/chat에 적용. 정교한 rate limiting이 아니라 데모 비용 폭주 방지용임을 코드 주석에 명시. curl로 11번째 요청부터 429+Retry-After 확인(로컬/프로덕션 모두).
- 모바일(375px) 반응형 점검: 전반적으로 문제 없었으나, 극단값(연수익률 30%처럼 threshold가 슬라이더 왼쪽 끝에 가까운 경우) 스트레스 테스트에서 AmountSliderCard 마커 라벨이 뷰포트 밖으로 6px 잘리는 실제 버그를 발견 — 라벨 위치만 8~92%로 clamp(마커 선/트랙 분기점은 정확한 위치 유지)하는 최소 수정으로 해결.
- 라이선스 점검(license-checker로 전체 트리 스캔): GPL(강한 카피레프트) 없음. LGPL-3.0-or-later 1건(@img/sharp-libvips-darwin-arm64, next의 선택적 이미지 최적화 의존성, 코드에서 next/image 미사용, 수정 없이 그대로 사용해 실질 문제 없음).
- Vercel 배포 전 ANTHROPIC_API_KEY가 실제로는 등록되어 있지 않은 것을 `vercel env ls`로 발견(사용자는 등록했다고 알고 있었음) → .env.local의 값을 그대로 사용해 Vercel Production 환경변수로 직접 등록 후 배포 진행.
- 프로덕션 배포: https://taxreduction.vercel.app (Vercel). curl로 /api/simulate, /api/parse, /api/explain, /api/chat(일반/확인필요/범위밖 3종) 전부 정상 응답 확인. Playwright로 프로덕션 URL에서 슬라이더 조작 → AI로 조건 채우기 → AI 설명 보기 → 챗봇 3문의 전체 플로우 실제 동작 확인, 콘솔 에러 없음, currentSimulation 맥락도 정확히 반영됨.
- README.md 최종 정리: 배포 URL 추가, 기술스택 "제안/확정 아님" 문구 제거(최종 확정 스택으로 갱신), PROMPTS.md 링크 안내 추가, AI 기능 안내 문구에 /api/chat 포함.
- `npm run build`/`npm run lint`/`npm run test`(42개, 스모크 5개 스킵) 모두 통과.
- feature_list.json의 모든 스테이지(0~6) 완료. 다음 세션에서 새로 시작할 정해진 작업 없음 — 추가 요청 시 이 로그와 skills.md의 "확인 필요 항목"부터 참고할 것.

### 2026-07-07 (Stage 7)
- feature_list.json에 Stage 7(site-shell) 신규 추가(0~6은 미변경). 프로젝트가 "거치식" 단일 도구에서 "거치식(/)+매매차익(/trade, Stage 8 예정)" 다중 도구 구조로 확장되는 첫 단계.
- app/layout.tsx에 공유 셸 추가: SiteNav(상단 네비, `/` "거치 기준 수익" / `/trade` "매매차익 계산기" — /trade는 아직 없어 클릭 시 404 정상), 슬레이트(slate-900) 중립색. Tailwind 유틸리티 클래스 사용(레이아웃 레벨은 원래 스캐폴드부터 Tailwind 사용 관례).
- 챗봇을 components/tax-simulator/ChatPanel.tsx에서 components/chat/(ChatContext.tsx + ChatPanel.tsx + ChatPanel.module.css)로 이동. React Context(ChatProvider)가 대화 히스토리 + currentSimulation을 보관해 페이지 이동에도 리마운트/초기화되지 않음. UI도 기존 "카드 내부 접기/펼치기"에서 우하단 고정 플로팅 버튼+패널로 변경(두 도구가 서로 다른 폭의 레이아웃을 쓸 수 있어 특정 페이지 폭에 종속되지 않는 형태가 더 적합하다고 판단).
- 챗봇 색상을 기존 블루 accent 토큰에서 슬레이트/네이비 중립색(#0f172a, #1e293b, #f1f5f9, #e2e8f0)으로 전면 교체(지시대로, 임의 색상 아님).
- lib/ai/chat-with-tax-assistant.ts: ChatCurrentSimulation을 discriminated union({kind:"hold",...} | {kind:"trade"})으로 일반화. TradeSimulationContext는 Stage 8 전이라 필드 없이 kind만 존재. buildCurrentSimulationContext는 kind==="trade"면 빈 문자열 반환(컨텍스트 미주입), chatWithTaxAssistant도 이에 맞춰 수정. app/api/chat/route.ts의 검증 로직과 기존 테스트(SAMPLE_SIMULATION에 kind:"hold" 추가)도 함께 갱신, trade 케이스 테스트 2건 신규 추가.
- TaxSimulator.tsx: currentSimulation에 kind:"hold" 추가하고 useEffect로 공유 컨텍스트에 동기화(언마운트 시 정리). 기존 인라인 ChatPanel 렌더링/구 파일 제거, TaxSimulator.module.css의 죽은 챗봇 클래스도 정리.
- Playwright로 실제 브라우저 검증: `/`에서 슬라이더 조작 → 플로팅 챗봇 열기 → "지금 계산한 조건 요약해줘" 질문 시 currentSimulation 맥락이 정확히 반영된 응답 확인, 네비 링크 클릭 후에도 대화 메시지 유지 확인, 콘솔 에러 없음. `/trade`는 계획대로 404.
- skills.md에 "6. 다중 도구 구조" 섹션 추가(도구별 테마 독립성, 챗봇 공유, 매매차익 도구의 ISA 3년 유지 가정 명시). UI_SPEC.md에 "7. Stage 7 갱신" 절 추가(6절의 챗봇 위치/색상 설명을 대체한다고 명시). README.md에 다중 도구 구조 섹션 추가.
- `npm run build`/`npm run lint`/`npm run test`(44개, 스모크 5개 스킵) 모두 통과.
- 다음 세션에서 할 일: 사용자 확인 후 Stage 8(매매차익 계산기 `/trade`, `design/ui_mockup_mk.html` 시안 기반) 시작. 구현 시 skills.md 6절의 "ISA 3년 유지 가정" 제약을 지킬 것.

### 2026-07-07 (Stage 8)
- 시작 전 확인: 사용자가 지칭한 `design/merged-ui-mockup.html`은 저장소에 존재하지 않음(디렉터리에는 `design/ui-mockup.html`, `design/ui_mockup_mk.html`만 존재). skills.md/UI_SPEC.md/README가 계속 참조해온 `design/ui_mockup_mk.html`을 대신 기준 시안으로 사용 — 사용자에게 이 대체 사실을 알림.
- `design/ui_mockup_mk.html`의 `updateUI()`는 일반계좌 세금을 `profit*qty*0.154`(배당소득세율)로 계산하는데, 이는 이 프로젝트가 일관되게 쓰는 일반계좌 양도소득세율(22%+기본공제 250만원)과 다름. 사용자가 이번 요청에서 직접 지정한 `applyGeneralCapitalGainsTax` 함수 시그니처(`capital_gains_tax_rate`+`annual_basic_deduction_krw` 사용)가 이 불일치를 명시적으로 해소하므로, 목업의 0.154 공식이 아니라 이 함수 스펙을 채택함(레이아웃/게이지/인터랙션 흐름만 목업 그대로 이식).
- lib/tax/rate-engine.ts 신규: `applyGeneralCapitalGainsTax`(순이익-기본공제)*양도세율, `applyIsaSeparateTax`(순이익-비과세한도)*분리과세율 — 두 순수함수 모두 config/tax-rules.json을 인자로 받아 하드코딩 없음.
- lib/tax/general-account.ts, lib/tax/isa-account.ts가 위 두 함수를 내부적으로 쓰도록 리팩터링. 리팩터링 직후 기존 44개 테스트 전부 재실행해 통과 확인(변경 전/후 결과 완전히 동일) — 회귀 없음.
- lib/tax/trade-calculator.ts 신규: `calculateTrade` 순수함수. 연간 납입한도(2,000만원) 초과 시 초과 수량을 일반계좌 규칙으로 강제 전환(`isaQuantity`/`generalQuantity` 분할), ISA 편입분은 이익-손실 손익통산 후 비과세한도 초과분에 9.9% 분리과세, 강제전환분은 22%+기본공제 양도소득세 적용. 단위테스트 5개(이익만 있는 케이스/손익통산 2건/서민형 비과세한도 초과/납입한도 초과 분할) 전부 통과.
- skills.md 6절에 매매차익 계산기 스코프 제약 추가: ISA 3년 의무유지 가정 유지, 금융소득종합과세 계산 미포함을 거치식 도구와 명확히 구분해 명시.
- app/api/parse-trade/route.ts + lib/ai/parse-trade-input.ts 신규: 기존 `/api/parse`(거치식)와 완전히 분리된 라우트/파서(스키마가 달라 공유 시 회귀 위험 있다고 판단), `client.messages.parse()` + zodOutputFormat으로 자연어 매매 계획을 종목명/현재가/이익/손실/수량/ISA유형으로 파싱, assumedFields 패턴 동일 적용.
- lib/ai/chat-with-tax-assistant.ts: `TradeSimulationContext`에 실제 필드(request: 종목/현재가/이익/손실/수량/ISA유형, response: trade-calculator 계산 결과 전체) 채움. `buildCurrentSimulationContext`의 trade 분기를 hold 분기와 동일한 패턴으로 구현(종목/수량/한도초과 여부/실제 세금/절세액 요약). app/api/chat/route.ts의 `isValidCurrentSimulation`도 trade에 대해 request/response 존재 검증하도록 갱신(기존엔 kind만 확인). 기존 chat-with-tax-assistant.test.ts의 placeholder trade 테스트 2건을 실제 필드 기반 테스트로 교체.
- app/trade/page.tsx + components/trade-calculator/*(TradeCalculator, IsaTypeToggle, ScenarioForm, ResultPanel, NaturalLanguageInputCard, Disclaimer): `design/ui_mockup_mk.html`의 2컬럼 레이아웃/그린-에메랄드 테마/게이지바(납입한도·비과세소진율·세금비교)를 Tailwind 유틸리티 클래스로 그대로 이식(range input thumb만 CSS 모듈로 분리, Tailwind로 표현 불가). ISA 유형은 거치식 도구와 동일하게 2단 토글(일반형/서민형)만 노출. "ISA 3년 의무유지를 가정합니다" 문구를 Disclaimer에 상시 노출. 챗봇 공유 컨텍스트 동기화는 TaxSimulator.tsx와 동일한 useEffect+cleanup 패턴 재사용.
- Playwright로 실제 브라우저 검증: `/trade` 기본 렌더(콘솔 에러 없음), 수량 슬라이더를 최대(2,000주)로 올려 연간 납입한도 초과 배너 노출 확인, ISA 유형을 서민형으로 전환 시 비과세한도/세금 재계산 확인, 플로팅 챗봇에서 "지금 계산한 조건 요약해줘" 질문 시 실제 Anthropic API가 종목명/수량/173주 ISA·1,827주 일반계좌 분할/정확한 세금 금액(5,479,100원 등)을 정확히 반영한 응답을 반환함을 확인, `/trade`→`/`→`/trade` 왕복 후에도 대화 메시지 유지 확인. 계산 결과는 수기 계산과 전부 일치(예: 200주 기본값 기준 절세액 51,095원, 2,000주+일반형 기준 511,995원).
- `npm run build`/`npm run lint`/`npm run test`(52개, 스모크 5개 스킵) 모두 통과. `npx tsc --noEmit`에서 나오는 `chat-with-tax-assistant.test.ts`의 `verificationStatus` 누락 타입 에러는 Stage 7 커밋(9cabede)에 이미 있던 것으로 `git stash` 비교로 확인한 기존 이슈이며(SAMPLE_SIMULATION 목 데이터에 필드 누락), 이번 Stage 8 변경과 무관 — `next build`의 타입체크 대상에는 포함되지 않아 빌드는 영향 없음.
- feature_list.json에 Stage 8(trade-calculator) 신규 추가 및 done 처리(0~7 미변경). PROMPTS.md에 "1-B. 매매차익 계산기 자연어 파싱" 섹션(parse-trade 시스템 프롬프트 원문+출력 스키마) 및 챗봇 동적 템플릿 섹션에 trade용 변형 추가.
- 사용자 확인 없이 다음 스테이지로 넘어가지 않음(요청대로) — 다음 세션 진행 여부는 사용자 확인 후 결정.

### 2026-07-07 (Stage 9)
- feature_list.json에 Stage 9(security-parity + final-qa) 신규 추가(0~8 미변경).
- rate-limit 점검: app/api/parse-trade/route.ts는 Stage 8 구현 당시 이미 lib/rate-limit.ts(분당 10회, 429+Retry-After)를 기존 3개 라우트(/api/chat, /api/explain, /api/parse)와 byte-identical하게 적용해뒀음을 diff로 재확인. Stage 8에서 신규 추가된 API 라우트는 /api/parse-trade가 유일 — 다른 누락 없음. /api/simulate는 Stage 2부터 AI 미호출(비용 리스크 없음) 이유로 의도적으로 rate-limit 미적용 상태 유지(Stage 6 결정 그대로).
- `npm audit`: Stage 6 이후 package.json 변경 없음(git diff로 확인, Stage 7/8 모두 신규 의존성 추가 안 함) — 남은 취약점은 Stage 6에서 이미 검토한 postcss XSS 모더레이트 1건(next 내부 번들, next 9.x 다운그레이드 없이는 해소 불가)뿐, high/critical 없음.
- `npm run lint`/`npm run test`(52개, 스모크 5개 스킵)/`npm run build` 모두 통과 확인 후 `npx vercel --prod`로 프로덕션 재배포, https://taxreduction.vercel.app에 정상 alias 완료.
- 프로덕션 검증(Playwright, 실제 Anthropic API 호출): `/`에서 슬라이더 조작 → AI로 조건 채우기(애플 2000만원 6년 10%) → AI 설명 보기 → 챗봇 질문까지 전체 플로우 정상 동작, 챗봇이 실제 계산값(세후 3,258만원 vs 3,410만원)을 정확히 참조. `/trade`로 이동해도 챗봇 대화 1건 유지 확인. `/trade`에서 슬라이더/ISA유형 토글/AI로 조건 채우기(삼성전자 커버드콜 ETF)/챗봇까지 정상 동작, 챗봇이 매매차익 계산 결과(절세액 570,900원)를 정확히 참조. `/`로 복귀 후에도 대화 2건(hold+trade 질문) 모두 유지 확인. 콘솔 에러 없음.
  - 전체 플로우 테스트 중 `/trade`의 AI 파싱이 응답까지 6초 이상 걸려 스크린샷에 "분석 중..." 상태가 찍힌 것을 발견 — 별도로 격리해서 재확인한 결과 정상 상태에서는 약 1.8초 만에 정확히 파싱됨(200 응답, 종목명/가격/이익/손실/수량/isaType assumedFields 전부 정확). 동시에 돌리고 있던 rate-limit 반복 요청 테스트 부하 때문에 일시적으로 느려진 것으로 판단, 실제 버그 아님.
  - `/api/parse-trade` rate-limit 실동작 확인: 프로덕션에서 연속 요청 시 일부는 6~7번째부터 429+Retry-After를 반환함을 확인(정확히 11번째가 아닌 경우가 있었음) — 이는 lib/rate-limit.ts 주석에 이미 문서화된 대로 서버리스 인스턴스가 여러 개 뜨면 인스턴스마다 카운트가 분리되어 실제 허용치가 설정값과 달라질 수 있다는 알려진 한계 때문. 429/Retry-After 자체는 정상 동작함을 확인(새로운 버그 아님, Stage 6부터 있던 동일한 in-memory rate limiter의 알려진 특성).
- PROGRESS.md/feature_list.json Stage 9 done 처리, 커밋.

### 2026-07-11 (Stage 10)
- feature_list.json에 Stage 10(dividend-calculator) 신규 추가(0~9 미변경). 공유 파일(app/layout.tsx의 SiteNav, ChatCurrentSimulation 유니언 타입)에는 최소 추가만 하고 기존 로직/디자인은 변경하지 않음.
- lib/tax/rate-engine.ts에 `applyGeneralDividendTax(totalDividendKrw, config, marginalTaxRateForComprehensiveIncome)` 신규 추출(현지 원천세+국내 배당소득세 정산, 종합과세 초과분 한계세율 적용 — general-account.ts의 기존 연도별 인라인 계산식을 그대로 옮김). general-account.ts가 이 함수를 내부적으로 쓰도록 리팩터링하되, yearlyBreakdown의 `foreignWithholdingTax`/`domesticDividendTax`/`isComprehensiveTaxationTriggered` 필드는 그대로 유지(foreignWithholdingTax는 계속 인라인 계산, domesticDividendTax는 `dividendTaxForYear - foreignWithholdingTax`로 역산). 리팩터링 직후 기존 52개 테스트 전부 재실행해 통과 확인 — 회귀 없음.
- lib/tax/dividend-calculator.ts 신규: `calculateDividend` 순수함수. `otherFinancialIncomeKrw`가 0(기본값)이면 이 배당금 단독으로 종합과세를 판단하지 않고 국내 배당소득세율(15.4%)을 그대로 한계세율 자리에 대입 — `applyGeneralDividendTax`의 임계값 분리 계산식이 대입한 세율=국내세율일 때 대수적으로 정확히 `totalDividendKrw*15.4%`로 귀결됨을 증명하고 이를 이용해 로직 중복 없이 "고정 15.4%"를 구현함. ISA 쪽은 `applyIsaSeparateTax`를 손익통산 없이 배당금 자체를 순이익으로 취급해 그대로 재사용. ISA 연간 납입한도 초과 로직은 매수원가 정보가 없어 포함하지 않음(trade-calculator.ts와 다른 스코프).
- 단위테스트 5개(비과세한도 이내/초과/otherFinancialIncomeKrw로 종합과세 대상/일반계좌가 유리한 케이스 존재 여부 검증/quantity=0 경계값) 전부 통과. 4번째 테스트에서 수학적으로 증명: 일반계좌의 최저 실효세율(현지 원천징수 15%)이 ISA의 초과분 분리과세율(9.9%)보다 항상 높고 ISA는 추가로 비과세 한도까지 있어, 배당금 단독 비교에서는 일반계좌가 ISA보다 유리해지는 세율 조합이 존재하지 않음(한계세율이 최고 구간 45%까지 올라가도 확인) — "있다면"이라는 조건부 요청에 정직하게 답한 것으로, 인위적으로 반례를 만들지 않음.
- skills.md에 "7. 배당금 계산기 스코프" 섹션 추가: ISA 납입한도 로직 제외 이유, ISA 3년 의무유지 가정, otherFinancialIncomeKrw 선택 입력의 의미를 명시.
- app/dividend/page.tsx + components/dividend-calculator/*(DividendCalculator, IsaTypeToggle, ScenarioForm, ResultPanel, NaturalLanguageInputCard, Disclaimer): app/trade의 레이아웃 패턴(헤드라인 결과 숫자+수량 슬라이더+비교 카드)을 참고해 앰버/골드(#f59e0b) 테마로 구성. 수량 슬라이더는 API 호출 없이 클라이언트에서 dividend-calculator.ts를 직접 호출해 즉시 재계산(Stage 3/8과 동일 패턴). 헤드라인은 세금 이득이 양수면 큰 금액을, 음수(이론상 이 모델에서는 발생하지 않지만 타입 계약상 가능)면 "일반계좌가 더 유리해요" 톤으로 분기 표시. 비교 카드는 더 유리한 쪽에만 "이 조건에서 더 유리" 배지(무조건 ISA 강조 아님). "다른 금융소득"은 접이식 고급설정으로 기본 숨김. "ISA 3년 의무유지를 가정합니다" 상시 노출.
- app/api/parse-dividend/route.ts + lib/ai/parse-dividend-input.ts 신규: 스키마(stockName/quantity/dividendPerShareKrw/otherFinancialIncomeKrw, isaType 제외 — 화면에 이미 선택된 토글값을 AI가 덮어쓰지 않도록). **rate-limit(lib/rate-limit.ts)을 구현 시점부터 다른 세 AI 라우트와 동일하게 적용**(Stage 9에서 parse-trade에 나중에 붙였던 방식을 반복하지 않음, 사용자가 명시적으로 요청한 부분).
- lib/ai/chat-with-tax-assistant.ts: `DividendSimulationContext`(kind: "dividend") 추가해 `ChatCurrentSimulation`을 3원 유니언(hold|trade|dividend)으로 확장. `buildCurrentSimulationContext`에 dividend 분기 구현(hold/trade와 동일 패턴 — 종목/수량/배당금/종합과세 여부/두 계좌 실수령액/세금이득 요약). app/api/chat/route.ts의 `isValidCurrentSimulation`도 dividend kind 검증 추가.
- components/site-shell/SiteNav.tsx에 "배당금 계산기" → /dividend 링크 추가(기존 두 링크는 그대로 유지, 최소 추가만).
- PROMPTS.md에 "1-C. 배당금 계산기 자연어 파싱" 섹션(parse-dividend 시스템 프롬프트 원문+출력 스키마) 및 챗봇 동적 템플릿 섹션에 dividend용 변형 추가.
- Playwright로 실제 브라우저 검증(로컬): `/dividend` 기본 렌더(콘솔 에러 없음, 200주 기준 세금 이득 계산 수기 검증과 일치), 수량 슬라이더 조작 시 즉시 재계산 확인(500주 기준 세금 이득 154,000원, 수기 계산과 일치), "다른 금융소득" 고급설정 펼치기/입력 확인, AI로 조건 채우기(삼성전자 200주, 배당금 1500원, 다른 금융소득 없음) 실제 Claude API로 정확히 파싱되어 폼 반영(otherFinancialIncomeKrw가 이전 입력값을 정확히 0으로 덮어씀) 확인, 플로팅 챗봇이 실제 계산 조건(세금 이득 46,200원 등)을 정확히 참조하는 응답 반환 확인, `/dividend`→`/`→`/trade`→`/dividend` 왕복 후에도 챗봇 대화 1건 유지 확인.
- `npm run build`/`npm run lint`/`npm run test`(62개, 스모크 5개 스킵) 모두 통과.
- feature_list.json Stage 10 done 처리, 커밋. **사용자 확인 없이 다음 단계(프로덕션 재배포/rate-limit 최종 점검)로 넘어가지 않음** — 다음 세션에서 재배포 요청 시 Stage 9와 동일한 패턴(rate-limit 목록 재확인 + npm audit + 배포 + 실제 브라우저 검증)으로 진행할 것.

### 2026-07-11 (Stage 11)
- feature_list.json에 Stage 11(final-security-and-mobile-check) 신규 추가(0~10 미변경).
- rate-limit 점검: /api/parse, /api/explain, /api/chat, /api/parse-trade, /api/parse-dividend 5개 라우트 모두 `checkRateLimit(getClientIp(request))` 블록이 byte-identical하게(기본값 분당 10회, 429+Retry-After) 이미 적용되어 있음을 diff로 확인 — 수정 필요 없음.
- `npm audit`: Stage 10 이후 package.json 변경 없음(git diff로 확인). 남은 취약점은 Stage 6/9에서 이미 검토한 postcss XSS 모더레이트 1건(next 내부 번들)뿐, high/critical 없음.
- 모바일(375px) 반응형 점검을 /trade, /dividend에 Playwright로 실시: 콘솔 에러 없음, `document.documentElement.scrollWidth === clientWidth`로 수평 오버플로우 없음 확인, DOM 전체를 순회해 뷰포트를 벗어나는 요소 없음 확인. `fullPage: true` 스크린샷에서 챗봇 플로팅 버튼이 콘텐츠 중간에 "끼어 있는" 것처럼 보이는 현상을 처음 발견했으나, `boundingBox()`로 스크롤 전후 위치가 동일함을 확인해 이는 Playwright의 fullPage 스크린샷이 `position: fixed` 요소를 합성하는 과정에서 생기는 촬영 아티팩트일 뿐 실제로는 뷰포트 우하단에 정확히 고정됨을 확인함. ChatPanel.module.css에 이미 `@media (max-width: 480px)` 반응형 규칙(`width: calc(100vw - 24px)`)이 있어 좁은 화면에서도 챗봇 패널이 넘치지 않음. **실제로 깨진 부분이 없어 코드 수정은 하지 않음.**
- 챗봇 플로팅 버튼/패널이 /trade(그린)·/dividend(앰버) 양쪽에서 모두 중립 슬레이트/네이비 색(#0f172a 등)으로 렌더링되어 각 도구 테마와 충돌 없음을 스크린샷으로 최종 확인.
- `npm run build`/`npm run lint`/`npm run test`(62개, 스모크 5개 스킵) 모두 통과 후 `npx vercel --prod`로 프로덕션 재배포, https://taxreduction.vercel.app에 정상 alias 완료.
- 프로덕션 rate-limit 실동작 검증: 5개 라우트 모두 반복 요청 시 429+Retry-After 확인. `/api/explain`은 정확히 10번째 요청까지 허용(400, 페이로드 무효화로 인한 응답이지만 rate-limit 게이트는 통과)되고 11번째부터 429가 뜨는 이상적인 사례를 확인함(rate-limit 검사가 body 파싱보다 먼저 실행되므로 무효 payload로도 카운트 테스트 가능). 나머지 라우트는 이번 세션 중 반복 테스트로 이미 direct 리밋에 걸려 있던 상태에서 429를 반환함을 확인 — 두 경우 모두 rate limiter가 정상 동작함을 보여주는 것으로, lib/rate-limit.ts 주석에 문서화된 "서버리스 인스턴스가 여러 개 뜨면 인스턴스마다 카운트가 분리될 수 있다"는 알려진 한계와 일치하는 결과.
- 프로덕션 검증(Playwright, 실제 Anthropic API 호출): `/`에서 슬라이더+AI로 조건 채우기(애플 3000만원 7년 9%)+챗봇 질문 → 정확한 세후 금액 참조 응답 확인. `/trade`로 이동해도 챗봇 대화 1건 유지, 슬라이더+AI 파싱+챗봇 질문 → 절세액 정확히 참조하는 응답 확인. `/dividend`로 이동해도 대화 2건 유지, 슬라이더+AI 파싱+챗봇 질문 → 세금이득 정확히 참조하는 응답 확인(AI 파싱 결과와 챗봇 응답 수치가 일치: 코카콜라 300주 750,000원 배당, 세금이득 115,500원). 다시 `/`로 복귀해도 대화 3건(hold+trade+dividend) 전부 유지 확인. 콘솔 에러 없음.
- feature_list.json Stage 11 done 처리, 커밋.

### 2026-07-11 (Stage 12)
- feature_list.json에 Stage 12(dividend-quantity-input-modes) 신규 추가(0~11 미변경). /dividend 관련 파일과 공유 타입(ChatCurrentSimulation의 dividend 분기)에 대한 최소 확장만 진행, 다른 도구는 건드리지 않음.
- lib/tax/dividend-calculator.ts에 `resolveDividendQuantity` 순수함수 추가: "quantity"(수량 직접입력) / "amount"(총매수금액 입력) 두 모드를 union 타입으로 받는다. amount 모드는 `Math.floor(totalPurchaseAmountKrw / currentPriceKrw)`로 내림 처리하고 `actualInvestedAmountKrw`(재계산된 실제 투입 금액)를 `requestedAmountKrw`(사용자가 입력한 원래 금액)와 별도로 반환해 나머지 차액을 숨기지 않는다. `calculateDividend` 본체(applyGeneralDividendTax/applyIsaSeparateTax 호출부)는 전혀 건드리지 않고 그 앞단에서 quantity만 결정해주는 구조 유지. 단위테스트 5개(quantity 모드/amount 모드 나누어떨어짐/amount 모드 나머지 있음/경계값(주가 0 이하)/두 모드 invariant) 전부 통과.
- app/dividend UI: ScenarioForm에 "현재 주가" 입력(app/trade 패턴 재사용), 입력모드 2단 토글("수량으로 입력"/"총 매수금액으로 입력", 기존 IsaTypeToggle과 동일한 세그먼트 버튼 스타일), 모드별 슬라이더(수량 모드는 기존 수량 슬라이더+"총 매수금액 약 ~" 참고문구, 금액 모드는 만원 단위 슬라이더+매수 가능 수량 문구+나머지 있을 때 안내 배너) 구현. DividendCalculator.tsx가 `resolveDividendQuantity`를 useMemo로 호출해 실제 계산에 쓸 수량을 도출하고, ResultPanel 헤드라인을 "{quantity}주 (총 매수금액 약 {actualInvestedAmountKrw}원) 매수 시" 형태로 통일(모드 무관하게 항상 노출). 슬라이더 조작마다 API 호출 없이 클라이언트에서 즉시 재계산(기존 패턴 유지).
- app/api/parse-dividend 스키마에 `currentPriceKrw`, `totalPurchaseAmountKrw` 선택 필드 추가. 시스템 프롬프트를 v2로 갱신해 "300주"처럼 수량으로 언급하면 quantity만, "3천만원어치"처럼 금액으로 언급하면 totalPurchaseAmountKrw만 채우고 나머지는 0+assumedFields로 남기도록 명시(동시에 채우지 않음). isaType을 스키마에서 제외한 기존 결정은 유지.
- lib/ai/chat-with-tax-assistant.ts: DividendSimulationContext의 request에 `currentPriceKrw`/`inputMode`/`actualInvestedAmountKrw` 필드 추가, buildCurrentSimulationContext의 dividend 템플릿을 갱신해 챗봇이 입력방식과 실제 투입금액까지 참조해 답할 수 있게 함.
- PROMPTS.md: "1-C. 배당금 계산기 자연어 파싱"에 v1 원문은 그대로 두고 "v2" 하위섹션을 추가(새 시스템 프롬프트 원문 + 출력 스키마). 챗봇 동적 템플릿 섹션에도 배당금 계산기 템플릿 v2를 v1 뒤에 추가. 지원서 이력상 어떤 버전이 최종인지 헷갈리지 않도록 실제 코드가 쓰는 버전(v2)임을 명시.
- skills.md 7절에 "수량 입력모드" 항목 추가: 내림 처리 이유, actualInvestedAmountKrw/requestedAmountKrw 차이를 UI/AI 응답에 그대로 노출한다는 원칙, 두 모드가 동일 수량에 도달하면 계산 결과가 완전히 같아야 한다는 invariant 명시.
- `npm run build`/`npm run lint`/`npm run test`(68개, 스모크 5개 스킵) 모두 통과.
- 로컬 브라우저 검증(Playwright): 수량모드 260주 vs 금액모드 3,000만원(→260주 내림, 요청자의 예시 그대로: 실제 매수 가능 금액 약 2,990만원) 두 경우가 헤드라인·세금이득(₩80,080)까지 완전히 동일함을 실제 화면에서 확인(invariant 실동작 검증). 금액모드에서 "입력하신 금액 중 실제 매수 가능한 금액은 약 ₩29,900,000(260주)입니다" 안내문구 정상 노출 확인. AI 자연어 입력으로 "코카콜라 300주 보유..." → quantity 모드 UI로 자동 전환, "나스닥 100 ETF 11만5천원에 3천만원어치..." → amount 모드 UI로 자동 전환되며 정확히 260주로 도출됨을 실제 Claude API 호출로 확인. 콘솔 에러 없음.
- feature_list.json Stage 12 done 처리, 커밋. **사용자 요청대로 프로덕션 재배포는 진행하지 않음** — 재배포는 사용자 확인 후 별도 진행.

### 2026-07-11 (Stage 13)
- feature_list.json에 Stage 13(deploy-and-verify) 신규 추가(0~12 미변경).
- rate-limit 재확인: 5개 API 라우트(/api/parse, /api/explain, /api/chat, /api/parse-trade, /api/parse-dividend) 모두 `checkRateLimit(getClientIp(request))` 블록이 여전히 정상 존재함을 grep으로 확인 — Stage 12의 parse-dividend 스키마 확장 작업 중 실수로 지워진 곳 없음.
- `npm audit`: Stage 11 이후 package.json/package-lock.json 변경 없음(git diff로 확인, Stage 12는 신규 의존성 추가 안 함) — 남은 취약점은 기존과 동일한 postcss XSS 모더레이트 1건뿐, 신규 취약점 없음.
- `/dividend` 신규 UI(입력모드 토글, 주가 입력 필드, "실제 매수 가능한 금액은 약 ~" 안내문구)를 375px에서 Playwright로 점검: 수평 오버플로우 없음, 콘솔 에러 없음, 금액 모드 슬라이더 단위(만원)와 안내문구 모두 잘리지 않고 박스 안에서 자연스럽게 줄바꿈됨을 확인. **실제로 깨진 부분이 없어 코드 수정은 하지 않음.**
- `npm run build`/`npm run lint`/`npm run test`(68개, 스모크 5개 스킵) 모두 통과 후 `npx vercel --prod`로 프로덕션 재배포, https://taxreduction.vercel.app에 정상 alias 완료.
- 프로덕션 검증(Playwright, 실제 Anthropic API 호출): `/dividend`에서 수량모드(260주)와 총매수금액모드(3,000만원→260주 내림)의 헤드라인이 완전히 동일함을 재확인(₩29,900,000, 260주). AI 자연어 입력 "코카콜라 300주 보유..." → 수량모드로 정상 전환, "나스닥 100 ETF 11만5천원에 3천만원어치..." → 총매수금액모드로 정상 전환되며 260주로 정확히 도출됨을 실제 API로 확인. 챗봇에게 "지금 실제로 매수되는 금액이 얼마예요?"라고 물었을 때 "29,900,000원이며 260주만 매수 가능해서 내림 처리됐다"는 정확한 이유까지 포함한 응답을 확인(resolveDividendQuantity의 내림 로직을 정확히 반영). 이어서 `/dividend`→`/`→`/trade`→`/dividend` 3페이지 왕복 시 챗봇 대화 1건이 끝까지 유지됨을 확인. 콘솔 에러 없음.
- feature_list.json Stage 13 done 처리, 커밋.

### 2026-07-11 (Stage 14)
- feature_list.json에 Stage 14(chatbot-ui-redesign-and-fact-fix) 신규 추가(0~13 미변경).
- **A. 사실관계 수정(근본 원인 수정)**: 그동안 챗봇이 "ISA 비과세 한도가 정확히 얼마냐"는 질문에 "자료마다 상충해 확인이 필요하다"고 얼버무린 원인을 찾음 — `config/tax-rules.json`의 실제 값(200만원/400만원)은 이미 맞았는데, 시스템 프롬프트가 이를 500만원/1,000만원 확대 "추진안"(국회 미통과)과 뒤섞어 "상충"으로 취급하고 있었음.
  - config/tax-rules.json: `isa_account.types` 각 항목에 `verified: true` 추가, `isa_account.pending_legislation` 객체 신규 추가(확대안 설명/제안 금액/status: "국회 미통과"/as_of: 2026-07-11).
  - skills.md: 2절 "확인 필요 항목"에서 ISA 비과세 한도 항목 제거, 1절 근처에 "확정 시행 기준(200만/400만) vs 미통과 추진안(500만/1000만) 절대 혼동 금지" 명시.
  - lib/ai/chat-with-tax-assistant.ts의 `CHAT_SYSTEM_PROMPT`를 v2로 갱신(실제 코드): [답변 근거]에 확정 vs 추진안 구분 문구 추가, [확인 필요 항목]에서 ISA 한도 제거(외국납부세액 선환급/배당소득 분리과세 개편 2개만 유지), 신규 [추진 중인 세법 개정안 질문 대응] 규칙 추가(7월 말 세법개정안 발표 맥락 언급 허용하되 시행 여부/시점 단정 금지).
  - PROMPTS.md: 챗봇 시스템 프롬프트 "v2" 섹션 신규 추가(v1 원문은 이력으로 보존), v1의 예시 응답 2번(ISA 한도 "확인 필요")에 "v1 기준 — Stage 14에서 수정됨" 주석 추가, v2 검증용 실제 응답 예시 2건 신규 추가.
  - 단위테스트: 확인 필요 항목 it.each에서 ISA 한도 케이스 제거(2개만 유지), "vs 500만원" 같은 상충 표현이 프롬프트에 없는지 + "일반형 200만원, 서민형/농어민형 400만원이 현재 확정 시행 기준" 문구가 포함되는지 확인하는 신규 테스트 2건 추가 — 전부 통과.
  - `lib/ai/chat-with-tax-assistant.smoke.test.ts`: 기존에 ISA 한도 질문이 "확인 필요"라고 답하는지 확인하던(이제는 틀린 기대값) 테스트를 "200만/400만으로 정확히 답하는지" + "500만원 확대 질문엔 국회 미통과로 안내하는지" 검증으로 교체, 외국납부세액 선환급 확인 필요 테스트는 별도로 유지. `RUN_AI_SMOKE_TEST=1`로 실제 API 호출해 5개 전부 통과 확인. `npx tsx`로 실제 응답 원문도 캡처해 PROMPTS.md에 기록.
- **B. 챗봇 UI 재설계**: `components/chat/ChatPanel.tsx`/`ChatPanel.module.css`를 우하단 원형 버튼+슬라이드업 패널 구조에서 화면 하단 고정 가로 바로 전면 재설계. collapsed 상태는 얇은 입력 바(아이콘+입력창+전송 버튼, 높이 약 56~64px)만 항상 보이고, 입력창 포커스나 메시지 전송 시 `isExpanded` 상태로 전환되어 위로 대화 히스토리 영역(`max-height: 50vh`, 스크롤 가능)이 펼쳐짐. 헤더의 "접기 ▾" 버튼으로 다시 collapsed로 되돌아가되 `ChatContext`의 대화 상태는 그대로 유지(Stage 7의 페이지 이동 시 히스토리 유지 메커니즘 자체는 변경하지 않음). 색상은 Stage 7에서 정한 슬레이트/네이비 중립색(#0f172a, #1e293b, #f1f5f9, #e2e8f0) 그대로 유지. `app/layout.tsx`의 `{children}` wrapper에 `pb-20`(80px) 추가해 collapsed 바가 페이지 하단 콘텐츠를 가리지 않게 함. UI_SPEC.md에 "8. Stage 14 갱신" 절 추가(7절의 위치 설명을 대체).
- `npm run build`/`npm run lint`/`npm run test`(69개, 스모크 7개 스킵) 모두 통과.
- 로컬 브라우저 검증(Playwright): `/`에서 collapsed→포커스 시 expand→접기 버튼으로 collapse 확인, 메시지 전송 시 자동 expand 및 "ISA 비과세 한도가 얼마예요?" 질문에 200만원/400만원을 확정 답변하고 500만원/1,000만원은 "국회 통과 전 추진안"으로 정확히 구분하는 응답 확인. `/`→`/trade`→`/dividend` 이동 시마다 입력창 포커스로 expand해 대화 1건이 계속 유지됨을 확인. 375px 모바일에서 collapsed 상태가 콘텐츠를 가리지 않음(스크롤 최하단에서 disclaimer 완전히 노출 확인)과 expanded 상태가 뷰포트의 약 45%(364px/812px)만 차지해 화면을 과하게 가리지 않음을 확인. 콘솔 에러 없음.
- feature_list.json Stage 14 done 처리, 커밋. **사용자 요청대로 프로덕션 재배포는 진행하지 않음** — 재배포는 사용자 확인 후 별도 진행.

### 2026-07-11 (Stage 15)
- feature_list.json에 Stage 15(deploy-and-verify) 신규 추가(0~14 미변경).
- rate-limit 재확인: 5개 API 라우트 모두 `checkRateLimit(getClientIp(request))` 정상 존재. `npm audit`: 신규 취약점 없음, 기존 postcss 모더레이트 1건만 잔존.
- `npm run build`/`npm run lint`/`npm run test`(69개, 스모크 7개 스킵) 모두 통과 후 `npx vercel --prod`로 프로덕션 재배포, https://taxreduction.vercel.app에 정상 alias 완료.
- 프로덕션 검증(Playwright, 실제 Anthropic API 호출): `/`에서 챗봇이 collapsed 상태로 시작함을 확인 → "비과세 한도 정확히 얼마예요?" 질문에 "일반형 200만원, 서민형/농어민형 400만원"으로 정확히 답하고 500만원/1,000만원은 "국회에서 논의 중이나 아직 통과되지 않음"으로 정확히 구분하는 응답을 실제 배포 환경에서 재확인(로컬과 동일하게 정상). 접기 버튼으로 collapsed 복귀 확인. `/trade`로 이동 시 챗봇이 collapsed 상태로 리셋되지만(예상된 동작 — isExpanded는 로컬 UI 상태) 대화 메시지 자체는 Context에 그대로 유지됨을 확인(1건). `/dividend`로 이동해도 메시지 1건 계속 유지 확인. 375px 모바일에서 collapsed/expanded 모두 수평 오버플로우 없음, 콘솔 에러 없음 확인.
- feature_list.json Stage 15 done 처리, 커밋.

### 2026-07-11 (Stage 16)
- feature_list.json에 Stage 16(chatbot-scope-eligibility) 신규 추가(0~15 미변경).
- 발견된 문제: 챗봇에게 "서민형 ISA 가입하려면 소득이 얼마여야 하냐"고 물으면 v1/v2 프롬프트에 가입 자격 관련 근거 정보가 전혀 없어 [역할과 범위] 규칙에 따라 "세금 관련 질문만 답변할 수 있어요"라며 범위 밖으로 잘못 처리했음. 가입 자격은 명백히 이 서비스가 다루는 ISA 주제인데 프롬프트가 못 따라간 것이 원인.
- config/tax-rules.json: `isa_account.types`에 `eligibility` 필드 추가 — 일반형은 `null`(소득 제한 없음), 서민형은 `{income_salary_only_krw: 50000000, income_comprehensive_krw: 38000000, note, verified: true, as_of: 2026-07-11}`, 농어민형은 `{income_comprehensive_krw: 38000000, note, verified: true, as_of: 2026-07-11}`.
- skills.md: 1절에 "ISA 가입 자격" 소단원 추가(일반형/서민형/농어민형 기준 + 국내투자형 ISA 신설 논의로 향후 자격이 바뀔 수 있다는 한 줄), 2절 확인 필요 항목에 "국내투자형 ISA 신설 및 금융소득종합과세 대상자 가입 허용 여부" 추가.
- lib/ai/chat-with-tax-assistant.ts의 `CHAT_SYSTEM_PROMPT`를 v3로 갱신(실제 코드): [역할과 범위] 주제 목록에 "ISA 계좌 유형별 가입 자격 요건" 추가, [답변 근거]에 가입 자격 기준(소득 요건) 신규 불릿 추가, [추진 중인 세법 개정안 질문 대응]에 "국내투자형 ISA 신설(금융소득종합과세 대상자도 가입 허용)"을 기존 비과세 한도 확대와 같은 범주로 추가.
- PROMPTS.md: 챗봇 시스템 프롬프트 "v3" 섹션 신규 추가(v1/v2 원문 이력 보존), v3 검증용 실제 응답 예시 2건(가입 자격 질문, 국내투자형 ISA 질문) 추가.
- 단위테스트 2건 추가: v3 프롬프트에 "가입 자격", "5천만원", "3,800만원" 문구 포함 확인 + "국내투자형 ISA 신설" 관련 미확정 안내 규칙 포함 확인 — 전부 통과.
- 스모크 테스트 2건 추가 + 실제 API(`RUN_AI_SMOKE_TEST=1`) 7개 전부 통과 확인: 서민형 가입 소득 기준 질문에 더 이상 "범위 밖"으로 처리하지 않고 5천만원/3,800만원 정확히 답변, 국내투자형 ISA 질문에 국회 미통과·시점 미확정으로 정확히 안내. `npx tsx`로 실제 응답 원문 캡처해 PROMPTS.md에 기록.
- `npm run build`/`npm run lint`/`npm run test`(71개, 스모크 9개 스킵) 모두 통과.
- feature_list.json Stage 16 done 처리, 커밋. **사용자 요청대로 프로덕션 재배포는 진행하지 않음** — 재배포는 사용자 확인 후 별도 진행.

### 2026-07-11 (Stage 17)
- feature_list.json에 Stage 17(deploy-and-verify) 신규 추가(0~16 미변경). 사용자가 처음 "Stage 18"로 요청했으나 실제 마지막 스테이지가 16이라 번호가 하나 비게 되는 것을 발견해 17로 진행(사용자에게 고지 후 진행).
- rate-limit 재확인: 5개 API 라우트 모두 정상. `npm audit`: 신규 취약점 없음, 기존 postcss 모더레이트 1건만 잔존.
- `npm run build`/`npm run lint`/`npm run test`(71개, 스모크 9개 스킵) 모두 통과 후 `npx vercel --prod`로 프로덕션 재배포, https://taxreduction.vercel.app에 정상 alias 완료.
- 프로덕션 검증(Playwright, 실제 Anthropic API 호출): "서민형 ISA 가입 소득 기준이 얼마예요?" → 총급여 5,000만원 이하/종합소득 3,800만원 이하로 정확히 답변. "국내투자형 ISA는 언제 생기나요?" → 국회 미통과·시행 여부 미확정으로 정확히 안내. 로컬과 동일한 정확도로 배포 환경에서도 재확인됨. `/`→`/trade`→`/dividend` 이동 시마다 하단 바 챗봇이 정상적으로 expand되고 대화 메시지(2건)가 계속 유지됨을 확인. 콘솔 에러 없음.
- feature_list.json Stage 17 done 처리, 커밋.

### 2026-07-11 (Stage 18)
- feature_list.json에 Stage 18(dividend-simplify) 신규 추가(0~17 미변경). 마지막 스테이지가 17로 확정되어 있어 번호 공백 없이 진행.
- app/dividend: `ScenarioForm.tsx`에서 "다른 금융소득" 접이식 고급설정 UI(토글 버튼 + input) 전체 제거. `lib/tax/dividend-calculator.ts`의 `calculateDividend` 함수 시그니처와 기존 단위테스트(otherFinancialIncomeKrw로 종합과세 대상되는 케이스 포함)는 전혀 건드리지 않음 — `DividendCalculator.tsx`에서 `otherFinancialIncomeKrw`를 `useState` 대신 고정 `const 0`으로 바꿔 호출부에서만 항상 0을 전달하도록 변경.
- `Disclaimer.tsx`에 상시 노출 안내문구 추가: "이 계산은 배당금 외 다른 금융소득은 고려하지 않습니다. 다른 금융소득과 합산 시 종합과세 대상이 될 수 있습니다." (기존 ISA 3년 의무유지 문구와 동일한 톤/위치).
- `lib/ai/parse-dividend-input.ts` 스키마 v3: `otherFinancialIncomeKrw` 필드 제거(stockName/quantity/currentPriceKrw/totalPurchaseAmountKrw/dividendPerShareKrw/assumedFields만 유지), 시스템 프롬프트에서도 관련 불릿 제거. `NaturalLanguageInputCard.tsx` placeholder를 "예: 리얼티인컴 250주 보유, 주가 6만원, 주당 배당금 1,000원"으로 갱신.
- `lib/ai/chat-with-tax-assistant.ts`: `DividendSimulationContext.request`에서 `otherFinancialIncomeKrw` 제거, `buildCurrentSimulationContext`의 dividend 분기 템플릿에서 해당 필드를 빼고 "배당금 외 다른 금융소득은 고려하지 않으므로 항상 국내 배당소득세율(15.4%) 기준으로 계산됩니다" 문장을 추가.
- PROMPTS.md: parse-dividend v3 섹션 신규 추가(v1/v2 원문 보존), `buildCurrentSimulationContext`용 배당금 계산기 템플릿도 v3로 갱신(같은 방식으로 otherFinancialIncomeKrw 플레이스홀더 제거 + 안내 문장 추가).
- skills.md 7절 갱신: 사용자가 요청한 원안 문구("배당금 자체가 2천만원을 넘으면 종합과세 로직은 여전히 정상 작동하지만...")는 실제 코드와 어긋남을 확인해 정확한 버전으로 대체 기록. `calculateDividend`의 `isComprehensiveTaxationTriggered = otherFinancialIncomeKrw > 0 && ...`가 `otherFinancialIncomeKrw > 0`을 전제조건으로 하므로, 이 값이 항상 0으로 고정되면 **배당금 자체가 2천만원을 넘어도 종합과세는 트리거되지 않고 항상 15.4% 고정 세율**이 적용됨을 명시.
- 관련 스모크테스트(`lib/ai/chat-with-tax-assistant.smoke.test.ts`) 확인 결과 otherFinancialIncomeKrw/dividend 관련 참조 없어 추가 정리 불필요. `lib/ai/chat-with-tax-assistant.test.ts`의 `SAMPLE_DIVIDEND_SIMULATION`에서 타입 정합성 위해 `otherFinancialIncomeKrw: 0,` 라인 제거, `lib/ai/parse-dividend-input.test.ts` 목 데이터에서도 동일 필드 제거.
- `npm run test`(71개 통과, 스모크 9개 스킵 — `dividend-calculator.test.ts` 10개 전부 포함해 그대로 통과), `npm run lint`, `npm run build` 모두 클린.
- 로컬 dev 서버 + Playwright로 `/dividend` 확인: 고급설정 섹션/버튼 완전히 사라짐, 새 안내문구 노출 확인, AI 자연어 입력에 "리얼티인컴 250주 보유, 주가 6만원, 주당 배당금 1,000원" 입력 시 실제 Anthropic API 호출로 종목명/수량/현재주가/주당배당금 4개 필드가 정확히 채워짐(총매수금액 ₩15,000,000 자동 계산) 확인.
- feature_list.json Stage 18 done 처리, 커밋 예정. **사용자 요청대로 프로덕션 재배포는 진행하지 않음** — 재배포는 사용자 확인 후 별도 진행.

<!-- 새 세션 로그는 위 형식으로 아래에 계속 추가 -->
