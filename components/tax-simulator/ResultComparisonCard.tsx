import taxRules from "@/config/tax-rules.json";
import type { GeneralAccountResult } from "@/lib/tax/general-account";
import type { IsaAccountResult } from "@/lib/tax/isa-account";
import { formatManwon, formatPercent } from "./format";
import styles from "./TaxSimulator.module.css";

interface ResultComparisonCardProps {
  generalResult: GeneralAccountResult;
  isaResult: IsaAccountResult;
  minHoldingYears: number;
}

export function ResultComparisonCard({
  generalResult,
  isaResult,
  minHoldingYears,
}: ResultComparisonCardProps) {
  const generalWins = generalResult.finalAfterTaxValue > isaResult.finalAfterTaxValue;
  const isaWins = isaResult.finalAfterTaxValue > generalResult.finalAfterTaxValue;

  const capitalGainsRatePercent = formatPercent(taxRules.general_account.capital_gains_tax_rate);
  const basicDeductionManwon = formatManwon(taxRules.general_account.annual_basic_deduction_krw);
  const separateTaxRatePercent = formatPercent(taxRules.isa_account.separate_tax_rate_over_limit);
  const domesticRatePercent = formatPercent(taxRules.general_account.domestic_dividend_withholding_rate);
  const taxFreeLimitManwon = formatManwon(isaResult.taxFreeLimitKrw);

  return (
    <div className={styles.card}>
      <div className={styles.resultGrid}>
        <div className={`${styles.resultBox} ${generalWins ? styles.resultBoxWin : ""}`}>
          <div className={styles.resultTitle}>일반계좌 (직접투자)</div>
          <div className={styles.resultNet}>{formatManwon(generalResult.finalAfterTaxValue)}만원</div>
          <div className={styles.resultTax}>
            세금 {formatManwon(generalResult.totalTax)}만원 (양도세 {capitalGainsRatePercent}%, 기본공제{" "}
            {basicDeductionManwon}만원)
          </div>
          {generalWins && <div className={styles.badge}>이 조건에서 더 유리</div>}
        </div>
        <div className={`${styles.resultBox} ${isaWins ? styles.resultBoxWin : ""}`}>
          <div className={styles.resultTitle}>ISA 계좌 (국내상장 해외ETF)</div>
          <div className={styles.resultNet}>{formatManwon(isaResult.finalAfterTaxValue)}만원</div>
          <div className={styles.resultTax}>
            {isaResult.isEarlyWithdrawal
              ? `세금 ${formatManwon(isaResult.tax)}만원 (${minHoldingYears}년 미만 중도해지 → 혜택 취소, ${domesticRatePercent}%)`
              : `세금 ${formatManwon(isaResult.tax)}만원 (비과세 ${taxFreeLimitManwon}만원 초과분 ${separateTaxRatePercent}%)`}
          </div>
          {isaWins && <div className={styles.badge}>이 조건에서 더 유리</div>}
        </div>
      </div>
    </div>
  );
}
