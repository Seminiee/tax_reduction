import taxRules from "@/config/tax-rules.json";
import styles from "./TaxSimulator.module.css";

export function Disclaimer() {
  return (
    <div className={styles.disclaimer}>
      실제 계산 로직은 자동화된 테스트로 검증된 계산 함수를 따릅니다.
      <br />
      {taxRules.verification_status}
      <br />
      {taxRules.simulation_assumptions.join(" · ")}
    </div>
  );
}
