"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/aureum/page-header";
import { StockCombobox } from "@/components/aureum/stock-combobox";
import { StockCandlestickChart } from "@/components/aureum/stock-candlestick-chart";
import { useJournalEntries } from "@/hooks/use-journal";
import { formatCurrency } from "@/lib/format";

const periodDays: Record<string, number | null> = { "1D": 1, "1W": 7, "1M": 30, YTD: null };

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("1W");
  const [symbols, setSymbols] = useState(["RELIANCE", "TCS", "HDFCBANK", "INFY"]);
  const journal = useJournalEntries();
  const filtered = useMemo(() => {
    const days = periodDays[period];
    if (!days) return journal.data ?? [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return (journal.data ?? []).filter((entry) => new Date(entry.date) >= cutoff);
  }, [journal.data, period]);
  const grouped = useMemo(() => {
    const totals = new Map<string, { pnl: number; quantity: number }>();
    for (const entry of journal.data ?? []) {
      const pnl = (entry.exitPrice - entry.entryPrice) * entry.quantity * (entry.side === "LONG" ? 1 : -1);
      const current = totals.get(entry.symbol) ?? { pnl: 0, quantity: 0 };
      current.pnl += pnl;
      current.quantity += entry.quantity;
      totals.set(entry.symbol, current);
    }
    return [...totals].sort((a, b) => b[1].pnl - a[1].pnl);
  }, [journal.data]);
  const rows = grouped.length ? grouped : [["No trades", { pnl: 0, quantity: 0 }] as [string, { pnl: number; quantity: number }]];
  const selectSymbol = (panel: number, symbol: string) => setSymbols((current) => current.map((value, index) => index === panel ? symbol : value));
  return <div className="aureum-page aureum-analytics-page"><PageHeader title="Analytics" description="Real-time valuation metrics and structural portfolio breakdown."/>
    {journal.isError && <div className="aureum-error">Analytics data could not be loaded.</div>}
    <section className="aureum-valuation"><div className="aureum-section-bar"><h2>Asset Valuation</h2><div className="aureum-period-tabs">{Object.keys(periodDays).map((value) => <button key={value} className={period === value ? "active" : ""} onClick={() => setPeriod(value)}>{value}</button>)}</div></div><div className="aureum-market-grid">{symbols.map((symbol, index) => <div className="aureum-market-panel" key={`${index}-${symbol}`}><div className="aureum-stock-picker"><StockCombobox compact value={symbol} label={`Select stock for panel ${index + 1}`} onSelect={(stock) => selectSymbol(index, stock.ticker)}/></div><StockCandlestickChart trades={filtered.filter((entry) => entry.symbol === symbol)}/></div>)}</div></section>
    <section className="aureum-performers"><Performance title="Top Performers" rows={rows.slice(0, 5)}/><Performance title="Underperformers" rows={[...rows].reverse().slice(0, 5)}/></section>
  </div>;
}

function Performance({ title, rows }: { title: string; rows: [string, { pnl: number; quantity: number }][] }) { return <div><h2>{title}</h2><div className="aureum-performance-head"><span>Asset</span><span>Volume</span><span>Return</span></div>{rows.map(([symbol, data]) => <div className="aureum-performance-row" key={`${title}-${symbol}`}><strong>{symbol}</strong><span>{data.quantity.toLocaleString("en-IN")}</span><b className={data.pnl >= 0 ? "positive" : "negative"}>{formatCurrency(data.pnl)}</b></div>)}</div>; }
