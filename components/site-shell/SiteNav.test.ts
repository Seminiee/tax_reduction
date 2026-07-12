import { describe, expect, it } from "vitest";
import { TOOLS } from "./SiteNav";

// Stage 21: 거치식/매매차익이 `/`로 통합되며 네비게이션이 3개에서 2개 링크로 줄었다.
// 이 프로젝트는 DOM 렌더링 테스트 인프라(jsdom/RTL)를 쓰지 않으므로, 렌더링 대신
// 네비게이션이 실제로 사용하는 데이터(TOOLS)를 직접 검증한다.
describe("SiteNav TOOLS", () => {
  it("정확히 2개의 링크만 노출한다", () => {
    expect(TOOLS).toHaveLength(2);
  });

  it("절세 계좌 수익 시뮬레이터(/)와 배당금 계산기(/dividend) 링크만 남아있다", () => {
    expect(TOOLS).toEqual([
      { href: "/", label: "절세 계좌 수익 시뮬레이터" },
      { href: "/dividend", label: "배당금 계산기" },
    ]);
  });

  it("매매차익 계산기(/trade) 링크는 더 이상 존재하지 않는다", () => {
    expect(TOOLS.some((tool) => tool.href === "/trade")).toBe(false);
  });
});
