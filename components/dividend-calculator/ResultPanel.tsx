import type { DividendCalculatorResult } from "@/lib/tax/dividend-calculator";

interface ResultPanelProps {
  quantity: number;
  result: DividendCalculatorResult;
}

export function ResultPanel({ quantity, result }: ResultPanelProps) {
  const {
    stockName,
    totalDividendKrw,
    taxFreeLimitKrw,
    isComprehensiveTaxationTriggered,
    marginalTaxRateApplied,
    generalDividendTaxKrw,
    generalNetReceivedKrw,
    isaDividendTaxKrw,
    isaNetReceivedKrw,
    taxSavingKrw,
  } = result;

  const isaIsBetter = taxSavingKrw > 0;
  const isGeneralBetter = taxSavingKrw < 0;

  return (
    <div className="flex flex-col gap-6 h-full">
      <section className="flex flex-col justify-center bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <p className="text-sm text-slate-500 font-bold mb-2">
          {stockName || "종목"} {quantity.toLocaleString("ko-KR")}주 배당 (총 ₩
          {Math.round(totalDividendKrw).toLocaleString("ko-KR")})
        </p>
        {isGeneralBetter ? (
          <>
            <h2 className="text-3xl font-black text-slate-700 tracking-tight">
              이 조건에서는 일반계좌가 더 유리해요
            </h2>
            <p className="text-lg font-bold text-slate-500 mt-1">
              ₩{Math.round(Math.abs(taxSavingKrw)).toLocaleString("ko-KR")} 차이
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-1">ISA 활용 시 세금 이득</p>
            <h2 className="text-5xl font-black text-amber-500 tracking-tight">
              ₩{Math.round(taxSavingKrw).toLocaleString("ko-KR")}
            </h2>
          </>
        )}
      </section>

      <div className="grid grid-cols-2 gap-4">
        <div
          className={
            "bg-white border rounded-2xl p-5 shadow-sm " +
            (isGeneralBetter ? "border-amber-400 ring-1 ring-amber-200" : "border-slate-200")
          }
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">일반계좌 (직접투자)</span>
            {isGeneralBetter && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                이 조건에서 더 유리
              </span>
            )}
          </div>
          <p className="text-2xl font-black text-slate-800">
            ₩{Math.round(generalNetReceivedKrw).toLocaleString("ko-KR")}
          </p>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            세금 ₩{Math.round(generalDividendTaxKrw).toLocaleString("ko-KR")}
            {isComprehensiveTaxationTriggered
              ? ` (금융소득종합과세 대상, 한계세율 ${(marginalTaxRateApplied * 100).toFixed(0)}% 적용)`
              : " (현지 원천징수 + 국내 배당소득세 15.4% 기준)"}
          </p>
        </div>

        <div
          className={
            "bg-white border rounded-2xl p-5 shadow-sm " +
            (isaIsBetter ? "border-amber-400 ring-1 ring-amber-200" : "border-slate-200")
          }
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">ISA 계좌</span>
            {isaIsBetter && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                이 조건에서 더 유리
              </span>
            )}
          </div>
          <p className="text-2xl font-black text-slate-800">
            ₩{Math.round(isaNetReceivedKrw).toLocaleString("ko-KR")}
          </p>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            세금 ₩{Math.round(isaDividendTaxKrw).toLocaleString("ko-KR")} (비과세{" "}
            {(taxFreeLimitKrw / 10_000).toLocaleString("ko-KR")}만원 초과분 9.9% 분리과세)
          </p>
        </div>
      </div>
    </div>
  );
}
