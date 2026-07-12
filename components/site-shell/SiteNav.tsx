"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Stage 7: 여러 도구를 오가는 공용 네비게이션. 각 도구 자체 색과 무관하게 셸 자체는 중립
// 슬레이트 색으로 유지한다. Stage 21: 거치식/매매차익이 `/`로 통합되며 2개 링크로 축소.
export const TOOLS = [
  { href: "/", label: "절세 계좌 수익 시뮬레이터" },
  { href: "/dividend", label: "배당금 계산기" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-slate-900">
      <div className="max-w-5xl mx-auto flex items-center gap-1 px-4 py-2">
        {TOOLS.map((tool) => {
          const isActive = pathname === tool.href;
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className={
                "px-3 py-1.5 rounded-md text-sm font-semibold transition-colors " +
                (isActive
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white")
              }
            >
              {tool.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
