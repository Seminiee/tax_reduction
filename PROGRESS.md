# PROGRESS.md — 세션 진행 로그

새 세션 시작 시 이 파일의 "현재 상태"부터 확인한다.

## 현재 상태
- **다음 작업**: Stage 2 (시뮬레이션 API) — 사용자 확인 후 시작
- **마지막 업데이트**: 2026-07-05 (Stage 1 완료)

## 스테이지 체크리스트

| Stage | 내용 | 상태 |
|---|---|---|
| 0 | 프로젝트 스캐폴딩 (Next.js 세팅, 폴더 구조, 배포 파이프라인 확인) | done |
| 1 | 세금 계산 엔진 (config/tax-rules.json + lib/tax 순수함수 + 단위테스트) | done |
| 2 | 시뮬레이션 API (/api/simulate) — 연도별 세후 자산 곡선 반환 | todo |
| 3 | 프론트엔드 입력 폼 + 결과 그래프 UI | todo |
| 4 | AI 자연어 파싱 + 결과 해설 (/api/explain, Anthropic API 연동) | todo |
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

<!-- 새 세션 로그는 위 형식으로 아래에 계속 추가 -->
