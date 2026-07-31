"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LogicalRange,
  type MouseEventParams,
  type Time,
  type WhitespaceData,
} from "lightweight-charts";
import { ZoomIn, ZoomOut } from "lucide-react";
import type { DailyPortfolioCandle, TransactionDTO } from "@/types";
import { buildDailyPortfolioCandles } from "@/lib/calc/portfolio";
import { formatCurrency, formatDate, formatSignedCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ChartShell } from "./chart-shell";
import { downloadCanvas } from "./chart-utils";
import {
  HYBRID_CANDLE_COLORS,
  HybridCandlestickSeries,
  type HybridCandleData,
} from "./hybrid-candlestick-series";

interface Props {
  transactions: TransactionDTO[];
  loading?: boolean;
}

interface TooltipState {
  candle: DailyPortfolioCandle;
  left: number;
  top: number;
}

type HybridSeriesApi = ISeriesApi<
  "Custom",
  Time,
  HybridCandleData | WhitespaceData<Time>,
  ReturnType<HybridCandlestickSeries["defaultOptions"]>
>;

const LEGEND = [
  ["DEPOSIT", "Deposit"],
  ["PROFIT", "Profit"],
  ["LOSS", "Loss"],
  ["WITHDRAWAL", "Withdrawal"],
] as const;

export function DailyCandlestickChart({ transactions, loading = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<HybridSeriesApi | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const candles = useMemo(
    () => buildDailyPortfolioCandles(transactions),
    [transactions],
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const chart = createChart(element, {
      layout: {
        background: { type: ColorType.Solid, color: "#FFFFFF" },
        textColor: "#334155",
        attributionLogo: false,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#E2E8F0", style: LineStyle.Dashed },
        horzLines: { color: "#E2E8F0", style: LineStyle.Dashed },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#94A3B8", style: LineStyle.Dashed },
        horzLine: { color: "#94A3B8", style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderColor: "#CBD5E1",
        autoScale: true,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#CBD5E1",
        timeVisible: false,
        fixLeftEdge: false,
        fixRightEdge: false,
        rightOffset: 2,
        barSpacing: 16,
        minBarSpacing: 3,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      width: element.clientWidth,
      height: element.clientHeight || 500,
    });

    const series = chart.addCustomSeries(new HybridCandlestickSeries());
    chartRef.current = chart;
    seriesRef.current = series;

    const handleCrosshair = (param: MouseEventParams<Time>) => {
      if (!param.point || !param.time) {
        setTooltip(null);
        return;
      }

      const item = param.seriesData.get(series) as HybridCandleData | undefined;
      if (!item || !("open" in item)) {
        setTooltip(null);
        return;
      }

      const tooltipWidth = 235;
      const left =
        param.point.x + tooltipWidth + 20 > element.clientWidth
          ? param.point.x - tooltipWidth - 12
          : param.point.x + 12;
      setTooltip({
        candle: { ...item, time: String(item.time) },
        left: Math.max(8, left),
        top: Math.max(8, Math.min(param.point.y + 12, element.clientHeight - 250)),
      });
    };
    chart.subscribeCrosshairMove(handleCrosshair);

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: element.clientWidth,
        height: element.clientHeight || 500,
      });
    });
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
      chart.unsubscribeCrosshairMove(handleCrosshair);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;

    series.setData(
      candles.map((candle) => {
        const lastType = candle.segments.at(-1)?.type ?? "PROFIT";
        return {
          ...candle,
          time: candle.time as Time,
          color: HYBRID_CANDLE_COLORS[lastType],
        };
      }),
    );
    series.priceScale().setAutoScale(true);
    chart.timeScale().fitContent();
    setTooltip(null);
  }, [candles]);

  function zoomBy(factor: number) {
    const timeScale = chartRef.current?.timeScale();
    const range = timeScale?.getVisibleLogicalRange();
    if (!timeScale || !range) return;

    const center = (range.from + range.to) / 2;
    const half = ((range.to - range.from) / 2) * factor;
    timeScale.setVisibleLogicalRange({
      from: center - half,
      to: center + half,
    } as LogicalRange);
  }

  const resetZoom = () => {
    seriesRef.current?.priceScale().setAutoScale(true);
    chartRef.current?.timeScale().fitContent();
  };

  const exportPng = () => {
    const canvas = chartRef.current?.takeScreenshot();
    if (canvas) downloadCanvas(canvas, "daily-portfolio-candles.png");
  };

  return (
    <ChartShell
      title="Daily Portfolio Candles · 1D"
      onResetZoom={resetZoom}
      onExportPng={exportPng}
      controls={
        <>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => zoomBy(0.7)}
            title="Zoom in"
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => zoomBy(1.4)}
            title="Zoom out"
          >
            <ZoomOut className="size-4" />
          </Button>
        </>
      }
    >
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-2 rounded-lg bg-white/90 px-2 py-1.5 text-[10px] font-medium shadow-sm ring-1 ring-slate-200">
          {LEGEND.map(([type, label]) => (
            <span key={type} className="flex items-center gap-1 text-slate-700">
              <span
                className="size-2 rounded-sm"
                style={{ backgroundColor: HYBRID_CANDLE_COLORS[type] }}
              />
              {label}
            </span>
          ))}
        </div>

        <div
          ref={containerRef}
          className="h-[460px] min-h-[360px] w-full bg-white sm:h-[520px]"
        />

        {tooltip && (
          <CandleTooltip
            candle={tooltip.candle}
            left={tooltip.left}
            top={tooltip.top}
          />
        )}

        {!loading && candles.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Add a transaction to create the first daily candle.
          </div>
        )}
      </div>
    </ChartShell>
  );
}

function CandleTooltip({
  candle,
  left,
  top,
}: {
  candle: DailyPortfolioCandle;
  left: number;
  top: number;
}) {
  const netChange = candle.close - candle.open;
  return (
    <div
      className="pointer-events-none absolute z-20 w-[235px] rounded-lg border border-slate-200 bg-white/95 p-3 text-xs text-slate-700 shadow-xl backdrop-blur"
      style={{ left, top }}
    >
      <p className="mb-2 font-semibold text-slate-950">{formatDate(candle.time)}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 tabular-nums">
        <Value label="Open" value={candle.open} />
        <Value label="High" value={candle.high} />
        <Value label="Low" value={candle.low} />
        <Value label="Close" value={candle.close} />
      </div>
      <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 tabular-nums">
        {candle.deposits > 0 && (
          <Movement label="Deposits" value={candle.deposits} type="DEPOSIT" />
        )}
        {candle.profit > 0 && (
          <Movement label="Profit" value={candle.profit} type="PROFIT" />
        )}
        {candle.loss > 0 && (
          <Movement label="Loss" value={-candle.loss} type="LOSS" />
        )}
        {candle.withdrawals > 0 && (
          <Movement
            label="Withdrawals"
            value={-candle.withdrawals}
            type="WITHDRAWAL"
          />
        )}
        <div className="flex justify-between border-t border-slate-100 pt-1 font-semibold text-slate-950">
          <span>Net change</span>
          <span>{formatSignedCurrency(netChange)}</span>
        </div>
      </div>
    </div>
  );
}

function Value({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}

function Movement({
  label,
  value,
  type,
}: {
  label: string;
  value: number;
  type: keyof typeof HYBRID_CANDLE_COLORS;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span
        className="font-medium"
        style={{ color: HYBRID_CANDLE_COLORS[type] }}
      >
        {formatSignedCurrency(value)}
      </span>
    </div>
  );
}
