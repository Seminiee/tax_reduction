import styles from "./TradeCalculator.module.css";

export const QUANTITY_MIN = 1;
export const QUANTITY_MAX = 2_000;

interface ScenarioFormProps {
  stockName: string;
  onStockNameChange: (value: string) => void;
  currentPriceKrw: number;
  onCurrentPriceKrwChange: (value: number) => void;
  expectedProfitPerShareKrw: number;
  onExpectedProfitPerShareKrwChange: (value: number) => void;
  expectedLossPerShareKrw: number;
  onExpectedLossPerShareKrwChange: (value: number) => void;
  quantity: number;
  onQuantityChange: (value: number) => void;
}

export function ScenarioForm({
  stockName,
  onStockNameChange,
  currentPriceKrw,
  onCurrentPriceKrwChange,
  expectedProfitPerShareKrw,
  onExpectedProfitPerShareKrwChange,
  expectedLossPerShareKrw,
  onExpectedLossPerShareKrwChange,
  quantity,
  onQuantityChange,
}: ScenarioFormProps) {
  const sliderPercent =
    ((quantity - QUANTITY_MIN) / (QUANTITY_MAX - QUANTITY_MIN)) * 100;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-sm font-bold text-slate-700 mb-5">투자 시나리오 설정</h2>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs text-slate-500 font-medium mb-1.5">종목명</label>
          <input
            type="text"
            value={stockName}
            onChange={(e) => onStockNameChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 font-medium mb-1.5">현재 주가 (원)</label>
          <input
            type="number"
            value={currentPriceKrw}
            onChange={(e) => onCurrentPriceKrwChange(parseFloat(e.target.value) || 0)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <label className="block text-xs text-emerald-600 font-medium mb-1.5">주당 예상 이익 (+)</label>
          <input
            type="number"
            value={expectedProfitPerShareKrw}
            onChange={(e) => onExpectedProfitPerShareKrwChange(parseFloat(e.target.value) || 0)}
            className="w-full bg-emerald-50/50 border border-emerald-200 rounded-xl px-3 py-2.5 text-sm text-emerald-700 font-mono focus:outline-none focus:border-emerald-400 focus:bg-white transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-rose-600 font-medium mb-1.5">주당 예상 손실 (-)</label>
          <input
            type="number"
            value={expectedLossPerShareKrw}
            onChange={(e) => onExpectedLossPerShareKrwChange(parseFloat(e.target.value) || 0)}
            className="w-full bg-rose-50/50 border border-rose-200 rounded-xl px-3 py-2.5 text-sm text-rose-700 font-mono focus:outline-none focus:border-rose-400 focus:bg-white transition-colors"
          />
        </div>
      </div>
      <div className="pt-5 border-t border-slate-100">
        <div className="flex justify-between items-center mb-5">
          <span className="text-sm font-bold text-slate-700">매수 수량 조절</span>
          <span className="text-xl font-black text-emerald-600 font-mono">
            {quantity.toLocaleString("ko-KR")}주
          </span>
        </div>
        <input
          type="range"
          min={QUANTITY_MIN}
          max={QUANTITY_MAX}
          value={quantity}
          onChange={(e) => onQuantityChange(parseInt(e.target.value, 10) || QUANTITY_MIN)}
          className={styles.slider}
          style={{
            background: `linear-gradient(to right, #10b981 ${sliderPercent}%, #e2e8f0 ${sliderPercent}%)`,
          }}
        />
        <div className="flex justify-between text-xs text-slate-400 mt-3 font-mono">
          <span>{QUANTITY_MIN.toLocaleString("ko-KR")}주</span>
          <span>{QUANTITY_MAX.toLocaleString("ko-KR")}주</span>
        </div>
      </div>
    </section>
  );
}
