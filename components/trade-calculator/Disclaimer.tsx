import taxRules from "@/config/tax-rules.json";

export function Disclaimer() {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
      <strong className="text-slate-600">ISA 3년 의무유지를 가정합니다.</strong> 이 계산기는 ISA
      의무가입기간(3년)을 충족했다고 가정하며, 중도해지 시나리오와 금융소득종합과세 계산은 포함하지
      않습니다.
      <br />
      실제 계산 로직은 lib/tax의 단위 테스트를 통과한 함수를 따릅니다.
      <br />
      {taxRules.verification_status}
    </div>
  );
}
