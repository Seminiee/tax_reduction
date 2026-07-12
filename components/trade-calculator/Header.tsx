import taxRules from "@/config/tax-rules.json";

// Stage 21: `/`가 거치식(TaxSimulator)에서 매매차익 UI로 통합되며 새로 만든 헤더(A).
// 서브타이틀 텍스트는 기존 거치식 Header(components/tax-simulator/Header.tsx)의 문구를
// 최대한 그대로 가져오되, 색상만 매매차익 테마(에메랄드)로 통일한다.
export function Header() {
  return (
    <header className="text-center mb-2">
      <h1 className="text-3xl font-black text-slate-900 mb-3">절세 계좌 수익 시뮬레이터</h1>
      <p className="text-sm font-bold text-emerald-600 mb-1.5">
        일반계좌 직접투자 • ISA 절세계좌 • 국내상장 해외ETF
      </p>
      <p className="text-sm text-slate-500 mb-1.5">
        투자금액을 슬라이드하면 세후수익과 절세 구간을 바로 보여드립니다.
      </p>
      <p className="text-xs text-slate-400">
        updated at : {taxRules.as_of} (세율 기준 · 확인 필요, config/tax-rules.json 참고)
      </p>
    </header>
  );
}
