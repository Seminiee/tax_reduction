import { describe, expect, it } from "vitest";
import TradePage from "./page";

// Stage 21: 매매차익 UI가 `/`로 통합되며 `/trade`는 `/`로 리다이렉트된다.
// next/navigation의 redirect()는 NEXT_REDIRECT 다이제스트를 담은 에러를 던지는 방식으로
// 동작하므로(리다이렉트 자체가 예외 기반), 그 다이제스트에 목적지 "/"가 포함되는지 검증한다.
describe("TradePage", () => {
  it("/ 로 리다이렉트한다", () => {
    let thrown: (Error & { digest?: string }) | null = null;
    try {
      TradePage();
    } catch (err) {
      thrown = err as Error & { digest?: string };
    }

    expect(thrown).not.toBeNull();
    expect(thrown?.digest).toContain("NEXT_REDIRECT");
    expect(thrown?.digest).toContain(";/;");
  });
});
