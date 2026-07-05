const MANWON = 10_000;

export function krwToManwon(krw: number): number {
  return krw / MANWON;
}

export function manwonToKrw(manwon: number): number {
  return manwon * MANWON;
}

export function formatManwon(krw: number): string {
  return Math.round(krwToManwon(krw)).toLocaleString("ko-KR");
}

export function formatPercent(rate: number): string {
  const percent = rate * 100;
  return Number.isInteger(percent) ? `${percent}` : percent.toFixed(1);
}
