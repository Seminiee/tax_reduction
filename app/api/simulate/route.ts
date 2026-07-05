import { NextResponse } from "next/server";
import taxRules from "@/config/tax-rules.json";
import { simulateGeneralAccount } from "@/lib/tax/general-account";
import { simulateIsaAccount, type IsaAccountType } from "@/lib/tax/isa-account";
import { findIsaThresholdPrincipal } from "@/lib/tax/threshold";
import { resolveMarginalIncomeTaxRate } from "@/lib/tax/income-tax-brackets";

interface SimulateRequestBody {
  principalKrw: number;
  annualReturnRate: number;
  annualDividendYieldRate: number;
  holdingYears: number;
  isaType: IsaAccountType;
  annualFinancialIncomeKrw: number;
}

const ISA_TYPES = Object.keys(taxRules.isa_account.types) as IsaAccountType[];
const MAX_HOLDING_YEARS = 100;

function validationErrorFor(body: Partial<SimulateRequestBody>): string | null {
  const {
    principalKrw,
    annualReturnRate,
    annualDividendYieldRate,
    holdingYears,
    isaType,
    annualFinancialIncomeKrw,
  } = body;

  if (typeof principalKrw !== "number" || !Number.isFinite(principalKrw) || principalKrw <= 0) {
    return "principalKrw는 0보다 큰 유한한 숫자여야 합니다.";
  }
  if (typeof annualReturnRate !== "number" || !Number.isFinite(annualReturnRate) || annualReturnRate <= -1) {
    return "annualReturnRate는 -1(-100%)보다 큰 유한한 숫자여야 합니다.";
  }
  if (
    typeof annualDividendYieldRate !== "number" ||
    !Number.isFinite(annualDividendYieldRate) ||
    annualDividendYieldRate < 0
  ) {
    return "annualDividendYieldRate는 0 이상의 유한한 숫자여야 합니다.";
  }
  if (
    typeof holdingYears !== "number" ||
    !Number.isInteger(holdingYears) ||
    holdingYears < 1 ||
    holdingYears > MAX_HOLDING_YEARS
  ) {
    return `holdingYears는 1 이상 ${MAX_HOLDING_YEARS} 이하의 정수여야 합니다.`;
  }
  if (typeof isaType !== "string" || !ISA_TYPES.includes(isaType as IsaAccountType)) {
    return `isaType은 ${ISA_TYPES.join(", ")} 중 하나여야 합니다.`;
  }
  if (
    typeof annualFinancialIncomeKrw !== "number" ||
    !Number.isFinite(annualFinancialIncomeKrw) ||
    annualFinancialIncomeKrw < 0
  ) {
    return "annualFinancialIncomeKrw는 0 이상의 유한한 숫자여야 합니다.";
  }

  return null;
}

export async function POST(request: Request) {
  let body: Partial<SimulateRequestBody>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "INVALID_JSON", message: "요청 본문이 올바른 JSON이 아닙니다." },
      { status: 400 }
    );
  }

  const validationError = validationErrorFor(body);
  if (validationError) {
    return NextResponse.json({ error: "INVALID_INPUT", message: validationError }, { status: 400 });
  }

  const {
    principalKrw,
    annualReturnRate,
    annualDividendYieldRate,
    holdingYears,
    isaType,
    annualFinancialIncomeKrw,
  } = body as SimulateRequestBody;

  // annualFinancialIncomeKrw(이 투자 외 다른 금융소득 포함 연간 총 금융소득)가 금융소득종합과세
  // 기준을 넘을 때만 브래킷 표에서 한계세율을 찾아 넘긴다. 넘지 않으면 simulateGeneralAccount
  // 내부의 연도별 판단에서도 어차피 트리거되지 않으므로 이 값은 결과에 영향을 주지 않는다.
  const isSubjectToComprehensiveTaxation =
    annualFinancialIncomeKrw > taxRules.general_account.comprehensive_taxation_threshold_krw;
  const marginalTaxRateForComprehensiveIncome = isSubjectToComprehensiveTaxation
    ? resolveMarginalIncomeTaxRate(annualFinancialIncomeKrw)
    : 0;

  const generalAccount = simulateGeneralAccount({
    principalKrw,
    annualReturnRate,
    annualDividendYieldRate,
    holdingYears,
    marginalTaxRateForComprehensiveIncome,
  });

  const isaAccount = simulateIsaAccount({
    principalKrw,
    annualReturnRate,
    annualDividendYieldRate,
    holdingYears,
    isaType,
  });

  const taxFreeLimitKrw = taxRules.isa_account.types[isaType].tax_free_limit_krw;
  const isaThreshold = findIsaThresholdPrincipal({
    annualReturnRate,
    holdingYears,
    taxFreeLimitKrw,
  });

  return NextResponse.json({
    input: {
      principalKrw,
      annualReturnRate,
      annualDividendYieldRate,
      holdingYears,
      isaType,
      annualFinancialIncomeKrw,
    },
    assumptions: taxRules.simulation_assumptions,
    verificationStatus: taxRules.verification_status,
    generalAccount,
    isaAccount,
    isaThreshold,
    comprehensiveTaxation: {
      isSubject: isSubjectToComprehensiveTaxation,
      marginalTaxRateApplied: marginalTaxRateForComprehensiveIncome,
    },
  });
}
