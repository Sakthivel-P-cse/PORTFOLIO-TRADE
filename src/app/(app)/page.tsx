"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CalendarDays, WalletCards } from "lucide-react";
import { PageHeader } from "@/components/aureum/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetrics } from "@/hooks/use-portfolio";
import { useTransactions } from "@/hooks/use-transactions";
import { useUIStore } from "@/stores/ui-store";
import { formatCurrency, formatDate } from "@/lib/format";

const DailyCandlestickChart = dynamic(() => import("@/components/charts/daily-candlestick-chart").then((module) => module.DailyCandlestickChart), { ssr: false, loading: () => <Skeleton className="h-[285px]"/> });

export default function DashboardPage() {
  const metrics = useMetrics();
  const transactions = useTransactions({ limit: 50 });
  const openModal = useUIStore((state) => state.openModal);
  const data = transactions.data ?? [];
  const value = metrics.data;
  return <div className="aureum-page">
    <PageHeader eyebrow="NSE / BSE Portfolio" title="Portfolio overview" description="Your capital, realised performance, and latest account activity in one place." actions={<><button className="aureum-button" onClick={() => openModal({ type: "transaction", txnType: "DEPOSIT" })}>Add funds</button><button className="aureum-button primary" onClick={() => openModal({ type: "journal" })}>New trade</button></>}/>
    {metrics.isError && <div className="aureum-error" role="alert">Unable to load portfolio metrics. {metrics.error.message}</div>}
    <section className="aureum-metric-grid">
      <Metric label="Portfolio value" value={formatCurrency(value?.currentValue ?? 0)} trend={`${(value?.returnPct ?? 0).toFixed(2)}% all time`} icon={<WalletCards/>}/>
      <Metric label="Net P&L" value={formatCurrency(value?.netPnl ?? 0)} trend={`${(value?.monthlyPnl ?? 0) >= 0 ? "+" : ""}${formatCurrency(value?.monthlyPnl ?? 0)} this month`} positive={(value?.netPnl ?? 0) >= 0}/>
      <Metric label="Net deposits" value={formatCurrency((value?.totalDeposits ?? 0) - (value?.totalWithdrawals ?? 0))} trend={`${formatCurrency(value?.totalWithdrawals ?? 0)} withdrawn`}/>
      <Metric label="Win rate" value={`${(value?.winRate ?? 0).toFixed(1)}%`} trend={`${data.filter((item) => item.type === "PROFIT").length} profitable entries`} positive/>
    </section>
    <section className="aureum-dashboard-grid">
      <article className="aureum-panel wide"><PanelHead title="Portfolio equity" meta="Daily transaction-derived OHLC"/><div className="aureum-dashboard-chart"><DailyCandlestickChart transactions={data} loading={transactions.isLoading}/></div></article>
      <article className="aureum-panel"><PanelHead title="Trading quality" meta="Current statistics"/><div className="aureum-stat-list"><span><small>Profit factor</small><strong>{value?.profitFactor?.toFixed(2) ?? "—"}</strong></span><span><small>Risk / reward</small><strong>{value?.riskRewardRatio?.toFixed(2) ?? "—"}</strong></span><span><small>Max drawdown</small><strong>{(value?.maxDrawdownPct ?? 0).toFixed(2)}%</strong></span><span><small>Recovery factor</small><strong>{value?.recoveryFactor?.toFixed(2) ?? "—"}</strong></span></div></article>
      <article className="aureum-panel wide"><PanelHead title="Recent activity" meta="Latest portfolio movements"/>{transactions.isError ? <div className="aureum-empty">{transactions.error.message}</div> : transactions.isLoading ? <Skeleton className="h-52"/> : <div>{data.slice(0, 5).map((item) => { const up = item.type === "PROFIT" || item.type === "DEPOSIT"; return <div className="aureum-activity" key={item.id}><span className={up ? "up" : "down"}>{up ? <ArrowUpRight/> : <ArrowDownRight/>}</span><span><strong>{item.type}</strong><small>{item.reason || "Portfolio transaction"}</small></span><time><strong className={up ? "positive" : "negative"}>{formatCurrency(item.amount)}</strong><small>{formatDate(item.date)}</small></time></div>; })}{!data.length && <div className="aureum-empty">No transactions yet.</div>}</div>}</article>
      <article className="aureum-panel aureum-insight"><CalendarDays/><p className="aureum-eyebrow">Review process</p><h3>Keep your journal current</h3><p>Record the setup, result, mistake, and lesson while the decision is fresh.</p><Link href="/journal">Open journal →</Link></article>
    </section>
  </div>;
}

function Metric({ label, value, trend, positive, icon }: { label: string; value: string; trend: string; positive?: boolean; icon?: React.ReactNode }) { return <article className="aureum-metric"><div><span>{label}</span>{icon}</div><strong>{value}</strong><small className={positive ? "positive" : ""}>{trend}</small></article>; }
function PanelHead({ title, meta }: { title: string; meta: string }) { return <div className="aureum-panel-head"><h2>{title}</h2><span>{meta}</span></div>; }
