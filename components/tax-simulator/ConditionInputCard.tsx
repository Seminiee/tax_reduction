import taxRules from "@/config/tax-rules.json";
import { krwToManwon } from "./format";
import styles from "./TaxSimulator.module.css";

export type TwoWayIsaType = "general" | "low_income";

interface ConditionInputCardProps {
  isaType: TwoWayIsaType;
  onIsaTypeChange: (isaType: TwoWayIsaType) => void;
  annualReturnRatePercent: number;
  onAnnualReturnRatePercentChange: (value: number) => void;
  holdingYears: number;
  onHoldingYearsChange: (value: number) => void;
}

const TOGGLE_OPTIONS: { isaType: TwoWayIsaType; label: string }[] = [
  {
    isaType: "general",
    label: `일반형 (${krwToManwon(taxRules.isa_account.types.general.tax_free_limit_krw)}만원)`,
  },
  {
    isaType: "low_income",
    label: `서민형 (${krwToManwon(taxRules.isa_account.types.low_income.tax_free_limit_krw)}만원)`,
  },
];

export function ConditionInputCard({
  isaType,
  onIsaTypeChange,
  annualReturnRatePercent,
  onAnnualReturnRatePercentChange,
  holdingYears,
  onHoldingYearsChange,
}: ConditionInputCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <div className={styles.label}>ISA 유형</div>
        <div className={styles.toggleGroup}>
          {TOGGLE_OPTIONS.map((option) => (
            <button
              key={option.isaType}
              type="button"
              className={`${styles.toggle} ${isaType === option.isaType ? styles.toggleActive : ""}`}
              onClick={() => onIsaTypeChange(option.isaType)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.label}>예상 연수익률</div>
        <div className={styles.content}>
          <input
            type="number"
            className={styles.numInput}
            value={annualReturnRatePercent}
            step={0.5}
            onChange={(e) => onAnnualReturnRatePercentChange(Number(e.target.value))}
          />
          <span className={styles.unit}>%</span>
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.label}>보유기간</div>
        <div className={styles.content}>
          <input
            type="number"
            className={styles.numInput}
            value={holdingYears}
            min={1}
            max={10}
            onChange={(e) => onHoldingYearsChange(Number(e.target.value))}
          />
          <span className={styles.unit}>년</span>
        </div>
      </div>
    </div>
  );
}
