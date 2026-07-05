# PROGRESS.md — 세션 진행 로그

새 세션 시작 시 이 파일의 "현재 상태"부터 확인한다.

## 현재 상태
- **다음 작업**: Stage 1 (세금 계산 엔진) — 사용자 확인 후 시작
- **마지막 업데이트**: 2026-07-05 (Stage 0 완료)

## 스테이지 체크리스트

| Stage | 내용 | 상태 |
|---|---|---|
| 0 | 프로젝트 스캐폴딩 (Next.js 세팅, 폴더 구조, 배포 파이프라인 확인) | done |
| 1 | 세금 계산 엔진 (config/tax-rules.json + lib/tax 순수함수 + 단위테스트) | todo |
| 2 | 시뮬레이션 API (/api/simulate) — 연도별 세후 자산 곡선 반환 | todo |
| 3 | 프론트엔드 입력 폼 + 결과 그래프 UI | todo |
| 4 | AI 자연어 파싱 + 결과 해설 (/api/explain, Anthropic API 연동) | todo |
| 5 | AI 세제 Q&A 챗봇 (선택 기능, /api/chat) | todo |
| 6 | 배포(Vercel) + QA + 지원서 자료(스크린샷, 프롬프트 캡처) 준비 | todo |

## 세션 로그
### 2026-07-05
- 주제 확정: 일반 해외주식 계좌 직투 vs ISA 국내상장 해외ETF 세후수익률 시뮬레이션
- CLAUDE.md / skills.md / README.md / feature_list.json / config/tax-rules.json 초안 작성 완료
- 다음 세션에서 할 일: Stage 0 스캐폴딩부터 시작. Next.js 프로젝트 init 후 이 파일 갱신할 것.

### 2026-07-05 (Stage 0)
- Next.js 16 (TypeScript, App Router) + Tailwind CSS v4 프로젝트 init (create-next-app)
- 폴더 구조 생성: app/, lib/tax/ (빈 폴더, Stage 1에서 채움), components/ (빈 폴더, Stage 3에서 채움)
- tax-rules.json을 루트에서 config/tax-rules.json으로 이동 (CLAUDE.md 아키텍처 경로와 일치시킴, 내용은 미변경) — 원래 CLAUDE.md/feature_list.json이 config/ 경로를 참조했지만 실제로는 폴더가 없던 상태였음을 발견해 사용자 확인 후 이동
- git 저장소 초기화 및 Stage 0 결과 최초 커밋
- 로컬 `npm run build` / `npm run dev` 정상 동작 확인 (http://localhost:3000 → 200)
- Vercel CLI(npx vercel) 로그인 및 프로덕션 배포 완료 → https://taxreduction.vercel.app (200 정상 렌더, Tailwind 클래스 적용 확인)
- 다음 세션에서 할 일: 사용자 확인 후 Stage 1 (세금 계산 엔진: lib/tax 순수함수 + 단위테스트) 시작

<!-- 새 세션 로그는 위 형식으로 아래에 계속 추가 -->
