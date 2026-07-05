import type { CSSProperties } from "react";
import type { FindIsaThresholdPrincipalResult } from "@/lib/tax/threshold";
import { formatManwon, formatPercent, krwToManwon, manwonToKrw } from "./format";
import styles from "./TaxSimulator.module.css";

interface AmountSliderCardProps {
  principalManwon: number;
  onPrincipalManwonChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  thresholdResult: FindIsaThresholdPrincipalResult;
  taxFreeLimitKrw: number;
  isEarlyWithdrawal: boolean;
  minHoldingYears: number;
  separateTaxRate: number;
}

type SliderNoteState =
  | { kind: "early-withdrawal" }
  | { kind: "always-safe" }
  | { kind: "always-exceeds" }
  | { kind: "normal"; thresholdManwon: number; pct: number };

function resolveSliderNoteState(props: AmountSliderCardProps): SliderNoteState {
  const { thresholdResult, isEarlyWithdrawal, min, max } = props;

  // UI_SPEC.md 4절: 보유기간 3년 미만이면 마커/구간 표시를 아예 숨기고 경고로 대체(최우선 분기).
  if (isEarlyWithdrawal) {
    return { kind: "early-withdrawal" };
  }

  // threshold.ts 주석 참고: growthFactor <= 0(연수익률 0% 이하)이면 threshold가 존재하지 않으며,
  // 이는 "전 구간 안전"과 동일하게 처리한다.
  if (thresholdResult.kind === "no-threshold-non-positive-growth") {
    return { kind: "always-safe" };
  }

  const thresholdManwon = krwToManwon(thresholdResult.thresholdPrincipalKrw);

  if (thresholdManwon < min) {
    return { kind: "always-exceeds" };
  }
  if (thresholdManwon > max) {
    return { kind: "always-safe" };
  }
  // 소수점 자리를 고정해 서버/클라이언트 렌더 시 style 문자열이 완전히 동일하도록 한다
  // (그대로 두면 부동소수점 전체 자릿수가 style에 그대로 박혀 하이드레이션 불일치 경고가 난다).
  const pct = Math.round(((thresholdManwon - min) / (max - min)) * 100 * 10000) / 10000;
  return { kind: "normal", thresholdManwon, pct };
}

export function AmountSliderCard(props: AmountSliderCardProps) {
  const {
    principalManwon,
    onPrincipalManwonChange,
    min,
    max,
    step,
    taxFreeLimitKrw,
    minHoldingYears,
    separateTaxRate,
  } = props;

  const noteState = resolveSliderNoteState(props);
  const taxFreeLimitManwon = formatManwon(taxFreeLimitKrw);
  const separateTaxRatePercent = formatPercent(separateTaxRate);

  const isDangerTrack = noteState.kind === "early-withdrawal" || noteState.kind === "always-exceeds";
  const trackFillClassName = [
    styles.trackFill,
    noteState.kind === "normal" ? styles.trackFillOver : "",
    isDangerTrack ? styles.trackFillDanger : "",
  ]
    .filter(Boolean)
    .join(" ");
  const trackFillStyle: CSSProperties =
    noteState.kind === "normal" ? ({ "--split": `${noteState.pct}%` } as CSSProperties) : {};

  const noteClassName = `${styles.note} ${isDangerTrack ? styles.noteDanger : ""}`.trim();

  return (
    <div className={`${styles.card} ${styles.sliderCard}`}>
      <div className={styles.sliderTop}>
        <div>투자금액</div>
        <div className={styles.amt}>
          {Math.round(principalManwon).toLocaleString("ko-KR")}
          <span className={styles.amtUnit}>만원</span>
        </div>
      </div>
      <div className={styles.trackWrap}>
        <div className={styles.trackBg}>
          <div className={trackFillClassName} style={trackFillStyle} />
          {noteState.kind === "normal" && (
            <>
              <div className={styles.marker} style={{ left: `${noteState.pct}%` }} />
              {/* 라벨은 좌우 끝(0%/100%에 가까울 때)에서 translateX(-50%)로 인해 뷰포트 밖으로
                  잘릴 수 있어(특히 375px 모바일), 라벨 위치만 안전 범위로 clamp한다.
                  실제 마커 선(위)과 트랙 채움 분기점은 clamp 없이 정확한 위치를 유지한다. */}
              <div
                className={styles.markerLabel}
                style={{ left: `${Math.min(92, Math.max(8, noteState.pct))}%` }}
              >
                {formatManwon(manwonToKrw(noteState.thresholdManwon))}만원부터 초과세
              </div>
            </>
          )}
          <input
            type="range"
            className={styles.rangeInput}
            min={min}
            max={max}
            step={step}
            value={principalManwon}
            onChange={(e) => onPrincipalManwonChange(Number(e.target.value))}
          />
        </div>
      </div>
      <div className={styles.rangeLabels}>
        <span>{min.toLocaleString("ko-KR")}만원</span>
        <span>{max.toLocaleString("ko-KR")}만원</span>
      </div>
      <div className={noteClassName}>
        {noteState.kind === "normal" &&
          `투자금액이 ${formatManwon(manwonToKrw(noteState.thresholdManwon))}만원을 넘으면 예상 수익이 비과세 한도(${taxFreeLimitManwon}만원)를 초과해요. 초과분부터는 ${separateTaxRatePercent}% 분리과세가 붙습니다.`}
        {noteState.kind === "always-exceeds" &&
          `슬라이더 최소 금액에서도 이미 비과세 한도(${taxFreeLimitManwon}만원)를 초과해요. 전액이 ${separateTaxRatePercent}% 분리과세 대상입니다.`}
        {noteState.kind === "always-safe" &&
          `이 조건에서는 슬라이더 전 구간이 비과세 한도(${taxFreeLimitManwon}만원) 이내예요.`}
        {noteState.kind === "early-withdrawal" &&
          `보유기간이 ${minHoldingYears}년 미만이면 ISA 세제 혜택이 전부 취소돼요.`}
      </div>
    </div>
  );
}
