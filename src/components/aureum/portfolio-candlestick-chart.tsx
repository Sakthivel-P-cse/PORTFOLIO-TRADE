"use client";

import { useEffect, useMemo, useRef } from "react";
import { CandlestickSeries, ColorType, CrosshairMode, createChart, type CandlestickData, type Time } from "lightweight-charts";
import { buildDailyPortfolioCandles } from "@/lib/calc/portfolio";
import type { TransactionDTO } from "@/types";

export function PortfolioCandlestickChart({ transactions }: { transactions: TransactionDTO[] }) {
  const host = useRef<HTMLDivElement>(null);
  const data = useMemo(() => buildDailyPortfolioCandles(transactions).map((candle) => ({ time: candle.time as Time, open: candle.open, high: candle.high, low: candle.low, close: candle.close } satisfies CandlestickData<Time>)), [transactions]);
  useEffect(() => {
    if (!host.current || !data.length) return;
    const styles = getComputedStyle(document.documentElement);
    const chart = createChart(host.current, { autoSize: true, layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: styles.getPropertyValue("--a-muted").trim(), attributionLogo: false }, grid: { vertLines: { color: "transparent" }, horzLines: { color: styles.getPropertyValue("--a-line-soft").trim() } }, crosshair: { mode: CrosshairMode.Normal }, rightPriceScale: { borderColor: styles.getPropertyValue("--a-line").trim() }, timeScale: { borderColor: styles.getPropertyValue("--a-line").trim() }, localization: { locale: "en-IN", priceFormatter: (price: number) => `₹${price.toLocaleString("en-IN")}` } });
    const series = chart.addSeries(CandlestickSeries, { upColor: styles.getPropertyValue("--a-gold").trim(), downColor: styles.getPropertyValue("--a-red").trim(), borderUpColor: styles.getPropertyValue("--a-gold").trim(), borderDownColor: styles.getPropertyValue("--a-red").trim(), wickUpColor: styles.getPropertyValue("--a-gold").trim(), wickDownColor: styles.getPropertyValue("--a-red").trim(), priceLineVisible: false });
    series.setData(data);
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [data]);
  if (!data.length) return <div className="aureum-chart-empty">Add portfolio transactions to build your equity chart</div>;
  return <div ref={host} className="aureum-stock-chart"/>;
}
