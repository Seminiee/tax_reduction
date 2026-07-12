import { redirect } from "next/navigation";

// Stage 21: 매매차익 계산기 UI가 `/`로 통합되면서 `/trade`는 `/`로 리다이렉트된다.
export default function TradePage() {
  redirect("/");
}
