import taxRules from "@/config/tax-rules.json";
import styles from "./TaxSimulator.module.css";

export function Header() {
  return (
    <>
      <h1 className={styles.title}>해외ETF 세후수익 시뮬레이터</h1>
      <div className={styles.sub1}>일반계좌 직접투자 • ISA 절세계좌 • 국내상장 해외ETF</div>
      <div className={styles.sub2}>
        투자금액을 슬라이드하면 세후수익과 절세 구간을 바로 보여드립니다.
      </div>
      <div className={styles.updated}>
        updated at : {taxRules.as_of} (세율 기준일 · 세법 개정에 따라 변경될 수 있어요)
      </div>
    </>
  );
}
