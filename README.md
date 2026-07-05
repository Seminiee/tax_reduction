# 해외ETF 세후수익 시뮬레이터 (가제)

## 배포 URL
- 프로덕션: https://taxreduction.vercel.app

## 프로젝트 소개
서학개미가 해외 주식/ETF에 투자할 때 "일반 해외주식 계좌로 직접 투자"할지 "ISA 계좌로 국내상장 해외ETF에 투자"할지는 세금 구조가 복잡해서 정확한 세후 수익률을 비교하기 어렵습니다.
이 서비스는 사용자의 투자 조건(금액, 예상 수익률, 보유기간, 소득 구간 등)을 입력받아 두 시나리오의 세후 수익률을 시뮬레이션하고, AI가 그 결과를 자연어로 해설해주는 웹앱입니다.

## K-AI 콘텐츠 어워드 제출 정보
- 도전 주제: 우리 곁의 착한 AI, 일상을 바꾸는 상상력
- Track B (솔루션 부문) / 분야: 경제·금융 - 스마트한 경제 활동을 위한 AI 서비스
- 문제의식: 해외투자 세금 정보 격차. 특히 2025년 이후 ISA/IRP 외국납부세액 선환급 폐지 등 최근 세법 변화로 인해 "ISA=무조건 유리"라는 기존 상식과 실제 세후 수익률 사이에 괴리가 생기고 있음

## 핵심 기능
1. 투자 조건 입력 (폼 + 자연어 입력 모두 지원)
2. 일반계좌 vs ISA 계좌 세후 수익률 시뮬레이션 (연도별 그래프)
3. AI 결과 해설 — 왜 이 결과가 나왔는지 근거(세법 조항 포함)와 함께 설명
4. AI 세제 Q&A 챗봇 (선택 기능)

핵심 AI 시스템 프롬프트(자연어 파싱 / 결과 해설 / 세제 챗봇) 원문과 실제 응답 예시는 [PROMPTS.md](./PROMPTS.md)를 참고하세요.

## 기술 스택
- Frontend + Backend: Next.js 16 (TypeScript, App Router) — 단일 레포로 Vercel 배포
- Styling: Tailwind CSS v4 (CSS Modules 병행)
- AI: Anthropic API (`@anthropic-ai/sdk`, `claude-haiku-4-5-20251001`) — 자연어 파싱, 결과 해설, 챗봇
- 테스트: Vitest
- 배포: Vercel

## 로컬 실행
```bash
npm install
npm run dev
```

AI 기능(`/api/parse`, `/api/explain`, `/api/chat`)을 쓰려면 프로젝트 루트에 `.env.local`을 만들고 `ANTHROPIC_API_KEY=sk-ant-...`를 넣어야 한다. `.env.local`은 `.gitignore`에 포함되어 있어 커밋되지 않는다. 프로덕션(Vercel)에는 동일한 키가 Production 환경변수로 등록되어 있다.

## 테스트

```bash
npm run test        # 단위 테스트 (lib/tax, lib/ai) — 실제 Anthropic API 호출 없음, 전부 mock 처리
```

### AI 스모크 테스트 (수동 실행, 실제 Anthropic API 호출)

`lib/ai/*.smoke.test.ts`는 실제 API 키로 `claude-haiku-4-5-20251001`을 호출해 자연어 파싱/결과 해설/세제 Q&A 챗봇이 실제로 동작하는지 확인하는 테스트다. 비용과 네트워크 호출이 발생하므로 `npm run test`에서는 항상 스킵되고, 아래처럼 명시적으로 실행할 때만 동작한다.

```bash
RUN_AI_SMOKE_TEST=1 ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY .env.local | cut -d '=' -f2-) \
  npm run test -- lib/ai/parse-investment-input.smoke.test.ts lib/ai/explain-simulation-result.smoke.test.ts lib/ai/chat-with-tax-assistant.smoke.test.ts
```

## ⚠️ 세금 정보 관련 유의사항 (지원서/시연에도 반드시 명시)
본 서비스의 세율·비과세 한도·정책 변경 사항은 `config/tax-rules.json`의 `as_of` 시점 공개 자료를 기반으로 하며, 일부 수치는 출처마다 상충되어 재확인이 필요합니다(자세한 내용은 `skills.md` 참고). 세법 개정에 따라 달라질 수 있으므로 실제 투자 결정 전 세무 전문가 상담 또는 국세청/금융투자협회 최신 공지 확인을 권장합니다. 모든 세율 파라미터는 하드코딩하지 않고 config에서만 관리합니다.
