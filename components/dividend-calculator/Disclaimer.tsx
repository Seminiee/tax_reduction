import taxRules from "@/config/tax-rules.json";

export function Disclaimer() {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
      <strong className="text-slate-600">ISA 3년 의무유지를 가정합니다.</strong> 이 계산기는 ISA
      의무가입기간(3년)을 충족했다고 가정하며, 중도해지 시나리오와 매수원가 기반의 ISA 연간
      납입한도 초과 로직은 포함하지 않습니다(배당금 입력만으로는 투자원가를 알 수 없기 때문).
      <br />
      <strong className="text-slate-600">
        이 계산은 배당금 외 다른 금융소득은 고려하지 않습니다.
      </strong>{" "}
      다른 금융소득과 합산 시 종합과세 대상이 될 수 있습니다.
      <br />
      실제 계산 로직은 자동화된 테스트로 검증된 계산 함수를 따릅니다.
      <br />
      {taxRules.verification_status}
    </div>
  );
}
