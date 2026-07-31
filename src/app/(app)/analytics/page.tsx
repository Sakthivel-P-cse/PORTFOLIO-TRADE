"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/aureum/page-header";
import { StockCombobox } from "@/components/aureum/stock-combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { useJournalEntries } from "@/hooks/use-journal";
import { useMetrics, useSnapshots } from "@/hooks/use-portfolio";
import { useTransactions } from "@/hooks/use-transactions";
import { stockFromEntry } from "@/lib/stocks";
import { formatCurrency } from "@/lib/format";
import type { SnapshotGranularity } from "@/types";

const EquityCurveChart = dynamic(() => import("@/components/charts/equity-curve-chart").then((module) => module.EquityCurveChart), { ssr: false, loading: () => <Skeleton className="h-[520px]"/> });
const DailyCandlestickChart = dynamic(() => import("@/components/charts/daily-candlestick-chart").then((module) => module.DailyCandlestickChart), { ssr: false, loading: () => <Skeleton className="h-[520px]"/> });

const rangeToGranularity: Record<string, SnapshotGranularity> = { "1W": "DAY", "1M": "DAY", "3M": "WEEK", YTD: "MONTH" };

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("1W");
  const [symbol, setSymbol] = useState("RELIANCE");
  const granularity = rangeToGranularity[period];
  const snapshots = useSnapshots(granularity);
  const transactions = useTransactions({ limit: 2000 });
  const journal = useJournalEntries();
  const metrics = useMetrics();
  const selectedEntries = useMemo(() => (journal.data ?? []).filter((entry) => stockFromEntry(entry.reason, entry.tags)?.ticker === symbol), [journal.data, symbol]);
  const grouped = useMemo(() => {
    const totals = new Map<string, number>();
    for (const entry of journal.data ?? []) { const ticker = stockFromEntry(entry.reason, entry.tags)?.ticker; if (ticker) totals.set(ticker, (totals.get(ticker) ?? 0) + (entry.outcome === "LOSS" ? -entry.amount : entry.outcome === "PROFIT" ? entry.amount : 0)); }
    return [...totals].sort((a, b) => b[1] - a[1]);
  }, [journal.data]);
  const rows = grouped.length ? grouped : [["No tagged trades", 0] as [string, number]];
  return <div className="aureum-page aureum-analytics-page">
    <PageHeader title="Analytics" description="Portfolio valuation and realised journal performance from your account data." actions={<div className="aureum-target"><div><span>All-time return</span><strong>{(metrics.data?.returnPct ?? 0).toFixed(1)}%</strong></div><div className="aureum-progress"><i style={{ width: `${Math.min(100, Math.max(0, metrics.data?.returnPct ?? 0))}%` }}/></div><div><small>0%</small><small>100%</small></div></div>}/>
    {(snapshots.isError || transactions.isError || journal.isError) && <div className="aureum-error" role="alert">Some analytics data could not be loaded. Please retry.</div>}
    <section className="aureum-valuation"><div className="aureum-section-bar"><h2>Asset valuation</h2><div className="aureum-period-tabs">{Object.keys(rangeToGranularity).map((value) => <button key={value} className={period === value ? "active" : ""} onClick={() => setPeriod(value)}>{value}</button>)}</div></div><div className="aureum-chart-grid"><div className="aureum-chart-panel"><strong>Daily portfolio OHLC</strong><DailyCandlestickChart transactions={transactions.data ?? []} loading={transactions.isLoading}/></div><div className="aureum-chart-panel"><strong>Equity curve</strong><EquityCurveChart data={snapshots.data ?? []} transactions={transactions.data ?? []} granularity={granularity} onGranularityChange={() => undefined} onRefresh={() => { void snapshots.refetch(); void transactions.refetch(); }}/></div></div></section>
    <section className="aureum-symbol-analysis"><div className="aureum-section-bar"><div><h2>Indian stock journal analysis</h2><p>Stock selections are persisted through the journal API as validated setup metadata.</p></div><StockCombobox compact value={symbol} onSelect={(stock) => setSymbol(stock.ticker)}/></div><div className="aureum-stock-summary"><span><small>Selected asset</small><strong>{symbol}</strong></span><span><small>Journal entries</small><strong>{selectedEntries.length}</strong></span><span><small>Realised result</small><strong>{formatCurrency(selectedEntries.reduce((sum, entry) => sum + (entry.outcome === "LOSS" ? -entry.amount : entry.outcome === "PROFIT" ? entry.amount : 0), 0))}</strong></span></div></section>
    <section className="aureum-performers"><Performance title="Top performers" rows={rows.slice(0, 5)}/><Performance title="Underperformers" rows={[...rows].reverse().slice(0, 5)}/></section>
  </div>;
}

function Performance({ title, rows }: { title: string; rows: [string, number][] }) { return <div><h2>{title}</h2><div className="aureum-performance-head"><span>Asset</span><span>Entries</span><span>Realised P&L</span></div>{rows.map(([ticker, pnl]) => <div className="aureum-performance-row" key={`${title}-${ticker}`}><strong>{ticker}</strong><span>Journal</span><b className={pnl >= 0 ? "positive" : "negative"}>{formatCurrency(pnl)}</b></div>)}</div>; }
