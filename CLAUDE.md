# CLAUDE.md — 프로젝트 컨텍스트 앵커

새 세션을 시작하면 반드시 이 순서로 읽는다: **PROGRESS.md → feature_list.json → skills.md → (필요시) 이 파일 하단 아키텍처**

## 한 줄 목적
ISA 계좌 vs 일반 해외주식 계좌의 세후 수익률을 시뮬레이션하고 AI가 해설해주는 K-AI 콘텐츠 어워드 제출용 웹앱.

## 절대 규칙 (위반 금지)
1. **세율·한도·정책 플래그는 반드시 `config/tax-rules.json`에서만 관리한다.** 계산 로직 코드에 `0.099`, `2000000` 같은 숫자를 직접 쓰지 않는다. 새로운 세금 규칙이 필요하면 config에 키를 추가하고 코드에서는 그 키를 참조한다.
2. **모든 세금 계산 함수는 순수함수로 작성하고 단위 테스트를 동반한다.** (입력 → 출력이 결정적이어야 시뮬레이션 신뢰도를 검증할 수 있음)
3. **불확실한 세법 수치는 절대 확정적으로 서술하지 않는다.** UI/AI 해설 문구에 "본 계산은 OOO 가정 기준"이라는 문구가 항상 노출되어야 한다. (skills.md의 "확인 필요 항목" 참고)
4. **AI(LLM 호출)는 장식이 아니라 필수 기능이어야 한다.** 최소한 "결과 자연어 해설" 기능은 실제 Anthropic API 호출로 구현한다. 목업/하드코딩 텍스트로 대체하지 않는다.
5. 각 스테이지 작업을 시작하기 전 PROGRESS.md의 해당 스테이지 상태를 `in_progress`로 갱신하고, 완료 후 `done`으로 갱신 + 다음 세션을 위한 메모를 남긴다.

## 스테이지 게이트 워크플로우
feature_list.json에 정의된 스테이지 순서를 따른다. 한 스테이지의 산출물이 검증(빌드 통과 + 테스트 통과)되기 전에는 다음 스테이지로 넘어가지 않는다. 각 스테이지 완료 시 사람에게 결과를 보여주고 확인받은 뒤 다음으로 진행한다.

## 아키텍처 개요
```
/app                  Next.js App Router 페이지 및 API 라우트
  /                   `/` — 절세 계좌 수익 시뮬레이터 (매매차익 UI, Stage 21부터)
  /trade              `/`로 redirect (Stage 21, 매매차익 UI 통합으로 별도 페이지 소멸)
  /dividend           배당금 계산기
  /api/simulate       거치식 세금 시뮬레이션 API (POST) — 어떤 페이지도 더 이상 호출하지 않지만
                      보존됨(죽은 코드, skills.md 6절). rate-limit 없음(순수 계산, AI 호출 없음).
  /api/explain        AI 결과 해설 API (POST, Anthropic 호출). kind: "hold" | "trade" 판별
                      유니언으로 일반화됨(Stage 21). hold(v1)는 죽은 코드 경로지만 여전히 동작함.
  /api/parse          거치식 자연어 파싱 API — 어떤 페이지도 더 이상 호출하지 않지만 보존됨(죽은
                      코드). rate-limit 걸려있는 살아있는 엔드포인트이므로 보안 점검 대상에 포함.
  /api/parse-trade    매매차익 자연어 파싱 API (`/`가 사용)
  /api/parse-dividend 배당금 자연어 파싱 API
  /api/chat           AI 세제 Q&A 챗봇 API (POST, 선택 기능)
/lib
  /tax                순수 계산 로직 (직투/ISA 각각의 세후수익 계산 함수). general-account.ts,
                      isa-account.ts, threshold.ts는 Stage 21부터 어떤 페이지도 호출하지 않지만
                      삭제 없이 보존됨 — trade-calculator.ts, dividend-calculator.ts는 계속 사용됨.
  /tax/tax-engine.test.ts   단위 테스트 (경계값: 손실, 비과세한도 초과, 3년 미만 등)
/config
  tax-rules.json      세율/한도/정책 플래그 (유일한 출처)
/components
  /tax-simulator      구 `/` 구현체(거치식). Stage 21부터 어떤 라우트도 렌더링하지 않지만 보존됨.
  /trade-calculator   현재 `/`의 실제 구현체 (매매차익 UI + Stage 21 신규 헤더/AI 설명 보기)
  /dividend-calculator  `/dividend` 구현체
  /chat, /site-shell  공용 챗봇, 상단 네비게이션(2개 링크)
```

## 코딩 컨벤션
- TypeScript strict 모드
- 세금 로직과 UI 로직을 절대 섞지 않는다 (lib/tax는 React를 import하지 않는다)
- 커밋 단위 = 스테이지 단위

## 참고 문서
- `skills.md` — 세금 계산 도메인 지식, 공식, 출처, 확인 필요 항목, 테스트 시나리오
- `UI_SPEC.md` — 프론트엔드 디자인 언어, 컴포넌트 구성, 안내문구 상태 분기 (Stage 3 필수 참고)
- `design/ui-mockup.html` — 확정된 UI/UX 인터랙션 레퍼런스 (브라우저로 열어서 확인, 임의 변경 금지)
- `feature_list.json` — 스테이지별 기능 명세 및 완료 기준
- `PROGRESS.md` — 세션 간 진행 상황 로그
