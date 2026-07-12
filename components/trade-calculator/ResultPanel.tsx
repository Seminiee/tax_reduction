import type { ReactNode } from "react";
import type { TradeCalculatorResult } from "@/lib/tax/trade-calculator";

interface ResultPanelProps {
  stockName: string;
  quantity: number;
  result: TradeCalculatorResult;
  /** 슬라이더 최대 수량 기준 이론상 최대 일반계좌 세금 — 하단 세금 비교 막대의 100% 기준값 */
  theoreticalMaxTaxKrw: number;
}

function GaugeBar({
  label,
  valueLabel,
  percent,
  colorClassName,
}: {
  label: ReactNode;
  valueLabel: string;
  percent: number;
  colorClassName: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-slate-500 font-medium">{label}</span>
        <span className="font-mono text-slate-700 font-bold">{valueLabel}</span>
      </div>
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
        <div
          className={`h-full transition-all duration-200 ${colorClassName}`}
          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

export function ResultPanel({ stockName, quantity, result, theoreticalMaxTaxKrw }: ResultPanelProps) {
  const {
    totalInvestKrw,
    annualContributionLimitKrw,
    isExceedingContributionLimit,
    taxFreeLimitKrw,
    netGainForIsaKrw,
    generalOnlyTaxKrw,
    totalTaxKrw,
    savedAmountKrw,
  } = result;

  const investPct = Math.min((totalInvestKrw / annualContributionLimitKrw) * 100, 100);
  const taxFreePct = Math.min((netGainForIsaKrw / taxFreeLimitKrw) * 100, 100);
  const safeMaxTax = theoreticalMaxTaxKrw > 0 ? theoreticalMaxTaxKrw : 1;
  const genTaxPct = (generalOnlyTaxKrw / safeMaxTax) * 100;
  const isaTaxPct = (totalTaxKrw / safeMaxTax) * 100;

  return (
    <div className="flex flex-col gap-6 h-full">
      {isExceedingContributionLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-3 shadow-sm">
          <span>
            <strong className="text-amber-800">연간 납입 한도(2,000만 원) 초과!</strong>
            <br />
            한도를 초과한 매수 수량은 일반 계좌 규칙(15.4% 배당소득세, 금융소득종합과세 시 한계세율)으로
            강제 전환되어 과세됩니다.
          </span>
        </div>
      )}

      <section className="flex flex-col justify-center flex-1 bg-white border border-slate-200 rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="mb-8">
          <p className="text-sm text-slate-500 font-bold mb-2">
            {stockName || "종목"} {quantity.toLocaleString("ko-KR")}주 절세 혜택
          </p>
          <h2 className="text-5xl font-black text-emerald-500 tracking-tight">
            ₩{Math.round(savedAmountKrw).toLocaleString("ko-KR")}
          </h2>
        </div>

        <div className="space-y-6 mb-8">
          <GaugeBar
            label="납입 한도 (2,000만)"
            valueLabel={`₩${Math.round(totalInvestKrw).toLocaleString("ko-KR")} (${Math.round(investPct)}%)`}
            percent={investPct}
            colorClassName="bg-cyan-400"
          />
          <GaugeBar
            label={`비과세 소진율 (${(taxFreeLimitKrw / 10_000).toLocaleString("ko-KR")}만)`}
            valueLabel={`${Math.round(taxFreePct)}%`}
            percent={taxFreePct}
            colorClassName="bg-emerald-400"
          />
        </div>

        <div className="pt-6 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-5">실시간 세금 비교 (수량에 따른 변화)</h3>

          <div className="mb-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500 font-semibold text-xs">
                일반 계좌 세금 (전량 매도 가정, 15.4% 배당소득세+한계세율)
              </span>
              <span className="font-mono text-rose-500 font-bold text-sm">
                ₩{Math.round(generalOnlyTaxKrw).toLocaleString("ko-KR")}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
              <div
                className="h-full bg-rose-400 transition-all duration-150"
                style={{ width: `${Math.min(Math.max(genTaxPct, 0), 100)}%` }}
              />
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500 font-semibold text-xs">
                ISA 활용 시 실제 세금 (9.9% 분리과세 + 한도초과분)
              </span>
              <span className="font-mono text-emerald-600 font-bold text-sm">
                ₩{Math.round(totalTaxKrw).toLocaleString("ko-KR")}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
              <div
                className="h-full bg-emerald-400 transition-all duration-150"
                style={{ width: `${Math.min(Math.max(isaTaxPct, 0), 100)}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between py-3 border-t border-slate-50">
            <span className="text-slate-400 font-medium text-xs">ISA 인정 순수익 (손익통산 후)</span>
            <span className="font-mono text-slate-600 font-bold text-xs">
              ₩{Math.round(netGainForIsaKrw).toLocaleString("ko-KR")}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
