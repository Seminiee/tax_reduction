import taxRules from "@/config/tax-rules.json";

// Stage 3의 거치식 도구와 동일한 결정: UI는 2단 토글(일반형/서민형)만 노출한다
// (config에는 farmer도 있지만 tax_free_limit_krw가 low_income과 같아 UI에서는 생략).
export type TwoWayIsaType = "general" | "low_income";

interface IsaTypeToggleProps {
  isaType: TwoWayIsaType;
  onChange: (isaType: TwoWayIsaType) => void;
}

const MANWON = 10_000;

export function IsaTypeToggle({ isaType, onChange }: IsaTypeToggleProps) {
  const generalLimit = taxRules.isa_account.types.general.tax_free_limit_krw / MANWON;
  const lowIncomeLimit = taxRules.isa_account.types.low_income.tax_free_limit_krw / MANWON;
  const currentLimitManwon =
    isaType === "general" ? generalLimit : lowIncomeLimit;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-semibold text-slate-600">가입 유형 선택</span>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md">
          비과세 {currentLimitManwon.toLocaleString("ko-KR")}만
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
        <button
          type="button"
          onClick={() => onChange("general")}
          className={
            "py-3 text-sm font-bold rounded-lg transition-all " +
            (isaType === "general"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
              : "text-slate-500 hover:text-slate-700")
          }
        >
          일반형{" "}
          <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
            비과세 {generalLimit.toLocaleString("ko-KR")}만
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChange("low_income")}
          className={
            "py-3 text-sm font-bold rounded-lg transition-all " +
            (isaType === "low_income"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
              : "text-slate-500 hover:text-slate-700")
          }
        >
          서민형{" "}
          <span className="block text-[10px] font-medium text-slate-400 mt-0.5">
            비과세 {lowIncomeLimit.toLocaleString("ko-KR")}만
          </span>
        </button>
      </div>
    </section>
  );
}
