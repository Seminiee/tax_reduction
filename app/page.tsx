// Stage 21: `/`는 거치식(TaxSimulator, components/tax-simulator/)에서 매매차익 UI로
// 통합되었다. TaxSimulator와 그 계산 엔진(lib/tax/general-account.ts 등)은 삭제하지 않고
// 죽은 코드로 보존한다 — skills.md 6절 참고.
import { TradeCalculator } from "@/components/trade-calculator/TradeCalculator";

export default function Home() {
  return <TradeCalculator />;
}
