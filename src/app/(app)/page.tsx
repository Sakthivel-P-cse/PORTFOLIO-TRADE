"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CalendarDays, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/aureum/page-header";
import { PortfolioCandlestickChart } from "@/components/aureum/portfolio-candlestick-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useJournalEntries } from "@/hooks/use-journal";
import { useMetrics } from "@/hooks/use-portfolio";
import { useSettings } from "@/hooks/use-settings";
import { useTransactions } from "@/hooks/use-transactions";
import { useUIStore } from "@/stores/ui-store";
import { formatCurrency, formatDate } from "@/lib/format";

export default function DashboardPage() {
  const metrics = useMetrics();
  const transactions = useTransactions({ limit: 2000 });
  const journal = useJournalEntries();
  const settings = useSettings();
  const openModal = useUIStore((state) => state.openModal);
  const trades = journal.data ?? [];
  const value = metrics.data;
  const returnPct = value?.returnPct ?? 0;
  const goalAmount = settings.data?.goalAmount ?? 1_000_000;
  const currentValue = value?.currentValue ?? 0;
  const goalProgress = Math.min(100, Math.max(0, (currentValue / goalAmount) * 100));
  return <div className="aureum-page"><PageHeader eyebrow="NSE / BSE Portfolio" title="Portfolio overview" description="Your Indian equity portfolio, realised performance, and latest trading activity." actions={<div className="aureum-dashboard-header-actions"><div className="aureum-target"><div><span>Portfolio goal</span><strong>{goalProgress.toFixed(1)}%</strong></div><div className="aureum-progress"><i style={{ width: `${goalProgress}%` }}/></div><div><small>₹0</small><small>{formatCurrency(goalAmount)}</small></div></div><div><button className="aureum-button" onClick={() => openModal({ type: "transaction", txnType: "DEPOSIT" })}>Add funds</button><button className="aureum-button" onClick={() => openModal({ type: "transaction", txnType: "WITHDRAWAL" })}>Withdraw funds</button><button className="aureum-button primary" onClick={() => openModal({ type: "journal" })}>New trade</button></div></div>}/>
    {(metrics.isError || transactions.isError || journal.isError || settings.isError) && <div className="aureum-error">Some portfolio data could not be loaded.</div>}
    <section className="aureum-metric-grid"><Metric label="Portfolio value" value={formatCurrency(value?.currentValue ?? 0)} trend={`${(value?.returnPct ?? 0).toFixed(2)}% all time`} icon={<WalletCards/>}/><Metric label="Net P&L" value={formatCurrency(value?.netPnl ?? 0)} trend={`${formatCurrency(value?.monthlyPnl ?? 0)} this month`} positive={(value?.netPnl ?? 0) >= 0}/><Metric label="Available cash" value={formatCurrency((value?.totalDeposits ?? 0) - (value?.totalWithdrawals ?? 0))} trend="Net capital allocation"/><Metric label="Win rate" value={`${(value?.winRate ?? 0).toFixed(1)}%`} trend={`${trades.filter((trade) => trade.outcome === "PROFIT").length} profitable trades`} positive/></section>
    <section className="aureum-dashboard-grid"><article className="aureum-panel wide"><PanelHead title="Portfolio equity" meta="Transaction-derived valuation"/><div className="aureum-dashboard-chart">{transactions.isLoading ? <Skeleton className="h-full"/> : <PortfolioCandlestickChart transactions={transactions.data ?? []}/>}</div></article><article className="aureum-panel"><PanelHead title="This month" meta="Realised trading P&L"/><div className="aureum-stat-list"><span><small>Monthly P&L</small><strong className={(value?.monthlyPnl ?? 0) >= 0 ? "positive" : "negative"}>{formatCurrency(value?.monthlyPnl ?? 0)}</strong></span><span><small>Profit factor</small><strong>{value?.profitFactor?.toFixed(2) ?? "—"}</strong></span><span><small>Max drawdown</small><strong>{(value?.maxDrawdownPct ?? 0).toFixed(2)}%</strong></span><span><small>Risk / reward</small><strong>{value?.riskRewardRatio?.toFixed(2) ?? "—"}</strong></span></div></article>
      <article className="aureum-panel wide"><PanelHead title="Recent activity" meta="Latest NSE/BSE positions"/>{journal.isLoading ? <Skeleton className="h-52"/> : <div>{trades.slice(0, 5).map((trade) => { const pnl = (trade.exitPrice - trade.entryPrice) * trade.quantity * (trade.side === "LONG" ? 1 : -1); return <div className="aureum-activity" key={trade.id}><span>{pnl >= 0 ? <ArrowUpRight/> : <ArrowDownRight/>}</span><span><strong>{trade.symbol} · {trade.exchange}</strong><small>{trade.side === "LONG" ? "Long" : "Short"} · {trade.quantity.toLocaleString("en-IN")} shares</small></span><time><strong className={pnl >= 0 ? "positive" : "negative"}>{formatCurrency(pnl)}</strong><small>{formatDate(trade.date)}</small></time></div>; })}{!trades.length && <div className="aureum-empty">No trades yet.</div>}</div>}</article>
      <article className="aureum-panel aureum-insight"><CalendarDays/><p className="aureum-eyebrow">Review process</p><h3>Keep your journal current</h3><p>Record the setup, result, and lesson while the decision is fresh.</p><Link href="/journal">Open journal →</Link></article></section>
  </div>;
}

function Metric({ label, value, trend, positive, icon }: { label: string; value: string; trend: string; positive?: boolean; icon?: React.ReactNode }) { return <article className="aureum-metric"><div><span>{label}</span>{icon}</div><strong>{value}</strong><small className={positive ? "positive" : ""}>{trend}</small></article>; }
function PanelHead({ title, meta }: { title: string; meta: string }) { return <div className="aureum-panel-head"><h2>{title}</h2><span>{meta}</span></div>; }
