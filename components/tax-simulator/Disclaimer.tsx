import taxRules from "@/config/tax-rules.json";
import styles from "./TaxSimulator.module.css";

export function Disclaimer() {
  return (
    <div className={styles.disclaimer}>
      실제 계산 로직은 lib/tax의 단위 테스트를 통과한 함수를 따릅니다.
      <br />
      {taxRules.verification_status}
      <br />
      {taxRules.simulation_assumptions.join(" · ")}
    </div>
  );
}
