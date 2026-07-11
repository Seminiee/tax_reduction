"use client";

import styles from "./DividendCalculator.module.css";

export const QUANTITY_MIN = 1;
export const QUANTITY_MAX = 5_000;

const MANWON = 10_000;
export const AMOUNT_MIN_MANWON = 100;
export const AMOUNT_MAX_MANWON = 30_000;

export type QuantityInputMode = "quantity" | "amount";

interface ScenarioFormProps {
  stockName: string;
  onStockNameChange: (value: string) => void;
  dividendPerShareKrw: number;
  onDividendPerShareKrwChange: (value: number) => void;
  currentPriceKrw: number;
  onCurrentPriceKrwChange: (value: number) => void;
  inputMode: QuantityInputMode;
  onInputModeChange: (mode: QuantityInputMode) => void;
  quantity: number;
  onQuantityChange: (value: number) => void;
  totalPurchaseAmountKrw: number;
  onTotalPurchaseAmountKrwChange: (value: number) => void;
  resolvedQuantity: number;
  actualInvestedAmountKrw: number;
  requestedAmountKrw?: number;
}

export function ScenarioForm({
  stockName,
  onStockNameChange,
  dividendPerShareKrw,
  onDividendPerShareKrwChange,
  currentPriceKrw,
  onCurrentPriceKrwChange,
  inputMode,
  onInputModeChange,
  quantity,
  onQuantityChange,
  totalPurchaseAmountKrw,
  onTotalPurchaseAmountKrwChange,
  resolvedQuantity,
  actualInvestedAmountKrw,
  requestedAmountKrw,
}: ScenarioFormProps) {
  const quantitySliderPercent = ((quantity - QUANTITY_MIN) / (QUANTITY_MAX - QUANTITY_MIN)) * 100;
  const totalPurchaseAmountManwon = totalPurchaseAmountKrw / MANWON;
  const amountSliderPercent =
    ((totalPurchaseAmountManwon - AMOUNT_MIN_MANWON) / (AMOUNT_MAX_MANWON - AMOUNT_MIN_MANWON)) * 100;

  const hasShortfall =
    inputMode === "amount" &&
    requestedAmountKrw !== undefined &&
    requestedAmountKrw !== actualInvestedAmountKrw;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-sm font-bold text-slate-700 mb-5">배당 시나리오 설정</h2>
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs text-slate-500 font-medium mb-1.5">종목명</label>
          <input
            type="text"
            value={stockName}
            onChange={(e) => onStockNameChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-amber-600 font-medium mb-1.5">주당 배당금 (원)</label>
          <input
            type="number"
            value={dividendPerShareKrw}
            onChange={(e) => onDividendPerShareKrwChange(parseFloat(e.target.value) || 0)}
            className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-3 py-2.5 text-sm text-amber-700 font-mono focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
          />
        </div>
      </div>

      <div className="mb-5">
        <label className="block text-xs text-slate-500 font-medium mb-1.5">현재 주가 (원)</label>
        <input
          type="number"
          value={currentPriceKrw}
          onChange={(e) => onCurrentPriceKrwChange(parseFloat(e.target.value) || 0)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:border-amber-400 focus:bg-white transition-colors"
        />
      </div>

      <div className="mb-5">
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl">
          <button
            type="button"
            onClick={() => onInputModeChange("quantity")}
            className={
              "py-2.5 text-sm font-bold rounded-lg transition-all " +
              (inputMode === "quantity"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-700")
            }
          >
            수량으로 입력
          </button>
          <button
            type="button"
            onClick={() => onInputModeChange("amount")}
            className={
              "py-2.5 text-sm font-bold rounded-lg transition-all " +
              (inputMode === "amount"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-700")
            }
          >
            총 매수금액으로 입력
          </button>
        </div>
      </div>

      {inputMode === "quantity" ? (
        <div className="pt-5 border-t border-slate-100">
          <div className="flex justify-between items-center mb-5">
            <span className="text-sm font-bold text-slate-700">보유 수량 조절</span>
            <span className="text-xl font-black text-amber-600 font-mono">
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
              background: `linear-gradient(to right, #f59e0b ${quantitySliderPercent}%, #e2e8f0 ${quantitySliderPercent}%)`,
            }}
          />
          <div className="flex justify-between text-xs text-slate-400 mt-3 font-mono">
            <span>{QUANTITY_MIN.toLocaleString("ko-KR")}주</span>
            <span>{QUANTITY_MAX.toLocaleString("ko-KR")}주</span>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            총 매수금액 약 ₩{Math.round(actualInvestedAmountKrw).toLocaleString("ko-KR")}
          </p>
        </div>
      ) : (
        <div className="pt-5 border-t border-slate-100">
          <div className="flex justify-between items-center mb-5">
            <span className="text-sm font-bold text-slate-700">총 매수금액 조절</span>
            <span className="text-xl font-black text-amber-600 font-mono">
              {totalPurchaseAmountManwon.toLocaleString("ko-KR")}만원
            </span>
          </div>
          <input
            type="range"
            min={AMOUNT_MIN_MANWON}
            max={AMOUNT_MAX_MANWON}
            value={totalPurchaseAmountManwon}
            onChange={(e) =>
              onTotalPurchaseAmountKrwChange((parseInt(e.target.value, 10) || AMOUNT_MIN_MANWON) * MANWON)
            }
            className={styles.slider}
            style={{
              background: `linear-gradient(to right, #f59e0b ${amountSliderPercent}%, #e2e8f0 ${amountSliderPercent}%)`,
            }}
          />
          <div className="flex justify-between text-xs text-slate-400 mt-3 font-mono">
            <span>{AMOUNT_MIN_MANWON.toLocaleString("ko-KR")}만원</span>
            <span>{AMOUNT_MAX_MANWON.toLocaleString("ko-KR")}만원</span>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            매수 가능 수량 약 {resolvedQuantity.toLocaleString("ko-KR")}주
          </p>
          {hasShortfall && (
            <p className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2 mt-2 leading-relaxed">
              입력하신 금액 중 실제 매수 가능한 금액은 약 ₩
              {Math.round(actualInvestedAmountKrw).toLocaleString("ko-KR")}({resolvedQuantity.toLocaleString("ko-KR")}주)입니다.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
