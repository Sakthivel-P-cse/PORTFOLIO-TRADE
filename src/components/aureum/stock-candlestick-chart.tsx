"use client";

import { useEffect, useMemo, useRef } from "react";
import { CandlestickSeries, ColorType, CrosshairMode, createChart, type CandlestickData, type Time } from "lightweight-charts";
import type { JournalEntryDTO } from "@/types";

export function StockCandlestickChart({ trades }: { trades: JournalEntryDTO[] }) {
  const host = useRef<HTMLDivElement>(null);
  const candles = useMemo(() => {
    const days = new Map<string, CandlestickData<Time>>();
    for (const trade of [...trades].sort((a, b) => a.date.localeCompare(b.date))) {
      const time = trade.date.slice(0, 10) as Time;
      const close = trade.status === "OPEN" ? trade.entryPrice : trade.exitPrice;
      const current = days.get(String(time));
      if (current) {
        current.high = Math.max(current.high, trade.entryPrice, close);
        current.low = Math.min(current.low, trade.entryPrice, close);
        current.close = close;
      } else {
        days.set(String(time), { time, open: trade.entryPrice, high: Math.max(trade.entryPrice, close), low: Math.min(trade.entryPrice, close), close });
      }
    }
    return [...days.values()];
  }, [trades]);
  useEffect(() => {
    if (!host.current || !candles.length) return;
    const styles = getComputedStyle(document.documentElement);
    const chart = createChart(host.current, { autoSize: true, layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: styles.getPropertyValue("--a-muted").trim(), attributionLogo: false }, grid: { vertLines: { color: "transparent" }, horzLines: { color: styles.getPropertyValue("--a-line-soft").trim() } }, crosshair: { mode: CrosshairMode.Normal }, rightPriceScale: { borderColor: styles.getPropertyValue("--a-line").trim() }, timeScale: { borderColor: styles.getPropertyValue("--a-line").trim(), rightOffset: 1, barSpacing: 12 }, localization: { locale: "en-IN", priceFormatter: (price: number) => `₹${price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` } });
    const series = chart.addSeries(CandlestickSeries, { upColor: styles.getPropertyValue("--a-gold").trim(), downColor: styles.getPropertyValue("--a-red").trim(), borderUpColor: styles.getPropertyValue("--a-gold").trim(), borderDownColor: styles.getPropertyValue("--a-red").trim(), wickUpColor: styles.getPropertyValue("--a-gold").trim(), wickDownColor: styles.getPropertyValue("--a-red").trim(), priceLineVisible: false });
    series.setData(candles);
    chart.timeScale().fitContent();
    return () => chart.remove();
  }, [candles]);
  if (!candles.length) return <div className="aureum-chart-empty">No trades for this stock</div>;
  return <div ref={host} className="aureum-stock-chart"/>;
}
