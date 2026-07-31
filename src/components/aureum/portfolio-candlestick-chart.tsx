"use client";

import { useEffect, useMemo, useRef } from "react";
import { CandlestickSeries, ColorType, CrosshairMode, createChart, type CandlestickData, type Time } from "lightweight-charts";
import { signedDelta } from "@/lib/calc/portfolio";
import type { TransactionDTO } from "@/types";

export function PortfolioCandlestickChart({ transactions }: { transactions: TransactionDTO[] }) {
  const host = useRef<HTMLDivElement>(null);
  const movements = useMemo(() => {
    let equity = 0;
    return [...transactions]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id))
      .map((transaction, index) => {
        const open = equity;
        equity += signedDelta(transaction.type, transaction.amount);
        return { time: (Math.floor(new Date(transaction.date).getTime() / 1000) + index) as Time, open, high: Math.max(open, equity), low: Math.min(open, equity), close: equity, type: transaction.type };
      });
  }, [transactions]);
  useEffect(() => {
    if (!host.current || !movements.length) return;
    const styles = getComputedStyle(document.documentElement);
    const colors = { PROFIT: styles.getPropertyValue("--a-green").trim(), LOSS: styles.getPropertyValue("--a-red").trim(), DEPOSIT: styles.getPropertyValue("--a-gold").trim(), WITHDRAWAL: styles.getPropertyValue("--a-purple").trim() };
    const data = movements.map(({ type, ...candle }) => ({ ...candle, color: colors[type], borderColor: colors[type], wickColor: colors[type] } satisfies CandlestickData<Time>));
    const chart = createChart(host.current, { autoSize: true, layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: styles.getPropertyValue("--a-muted").trim(), attributionLogo: false }, grid: { vertLines: { color: "transparent" }, horzLines: { color: styles.getPropertyValue("--a-line-soft").trim() } }, crosshair: { mode: CrosshairMode.Normal }, rightPriceScale: { borderColor: styles.getPropertyValue("--a-line").trim() }, timeScale: { borderColor: styles.getPropertyValue("--a-line").trim() }, localization: { locale: "en-IN", priceFormatter: (price: number) => `₹${price.toLocaleString("en-IN")}` } });
    const series = chart.addSeries(CandlestickSeries, { upColor: styles.getPropertyValue("--a-gold").trim(), downColor: styles.getPropertyValue("--a-red").trim(), borderUpColor: styles.getPropertyValue("--a-gold").trim(), borderDownColor: styles.getPropertyValue("--a-red").trim(), wickUpColor: styles.getPropertyValue("--a-gold").trim(), wickDownColor: styles.getPropertyValue("--a-red").trim(), priceLineVisible: false });
    series.setData(data);
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [movements]);
  if (!movements.length) return <div className="aureum-chart-empty">Add portfolio transactions to build your equity chart</div>;
  return <div ref={host} className="aureum-stock-chart"/>;
}
