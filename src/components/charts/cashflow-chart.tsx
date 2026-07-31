"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createChart,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { TransactionDTO } from "@/types";
import { buildDailyPnlPoints } from "@/lib/calc/portfolio";
import { ChartShell, type AxisRange } from "./chart-shell";
import { toUtcTs, dedupeSortByTime, downloadCanvas } from "./chart-utils";

interface Props {
  transactions: TransactionDTO[];
}

// Color per movement type.
const COLORS = {
  PROFIT: "#22c55e", // green up
  LOSS: "#ef4444", // red down
  NEUTRAL: "#6b7280",
};

// Chart 3: daily P&L bars. Every same-day profit/loss contributes to the net bar.
export function CashflowChart({ transactions }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [empty, setEmpty] = useState(transactions.length === 0);

  const bars = useMemo(() => {
    return dedupeSortByTime(
      buildDailyPnlPoints(transactions).map(({ day, value }) => ({
        time: toUtcTs(`${day}T00:00:00.000Z`),
        value,
        color: value > 0 ? COLORS.PROFIT : value < 0 ? COLORS.LOSS : COLORS.NEUTRAL,
      })),
    );
  }, [transactions]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: "#1A1A1A" },
        textColor: "#9CA3AF",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)", autoScale: true },
      timeScale: { borderColor: "rgba(255,255,255,0.1)", timeVisible: true },
      handleScroll: true,
      handleScale: true,
      width: el.clientWidth,
      height: el.clientHeight || 360,
    });

    const series = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "price", precision: 0, minMove: 1 },
      base: 0,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight || 360 });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    series.setData(
      bars.map((b) => ({ time: b.time as Time, value: b.value, color: b.color })),
    );
    setEmpty(bars.length === 0);
    chartRef.current?.timeScale().fitContent();
  }, [bars]);

  const resetZoom = () => chartRef.current?.timeScale().fitContent();
  const exportPng = () => {
    const canvas = chartRef.current?.takeScreenshot();
    if (canvas) downloadCanvas(canvas, "cashflow.png");
  };
  const applyAxis = (range: AxisRange) => {
    if (range.min === null && range.max === null) {
      seriesRef.current?.applyOptions({ autoscaleInfoProvider: undefined });
    } else {
      seriesRef.current?.applyOptions({
        autoscaleInfoProvider: () => ({
          priceRange: { minValue: range.min ?? 0, maxValue: range.max ?? 0 },
        }),
      });
    }
  };

  return (
    <ChartShell
      title="Profit & Loss"
      onResetZoom={resetZoom}
      onExportPng={exportPng}
      onApplyAxis={applyAxis}
      overlay={
        <div className="flex gap-3 text-[10px] font-medium">
          <span className="text-[#22c55e]">● Profit</span>
          <span className="text-[#ef4444]">● Loss</span>
        </div>
      }
    >
      <div className="relative">
        <div ref={containerRef} className="h-[360px] w-full bg-[#1A1A1A]" />
        {empty && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/40">
            No cash-flow data yet.
          </div>
        )}
      </div>
    </ChartShell>
  );
}
