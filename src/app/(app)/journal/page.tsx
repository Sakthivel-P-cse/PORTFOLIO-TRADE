"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ImageIcon, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/aureum/page-header";
import { TradeModal } from "@/components/aureum/trade-modal";
import { useDeleteJournalEntry, useJournalEntries } from "@/hooks/use-journal";
import { useUIStore } from "@/stores/ui-store";
import { formatCurrency, formatDate } from "@/lib/format";
import type { JournalEntryDTO } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function JournalPage() {
  const { data = [], isLoading, isError, error } = useJournalEntries();
  const remove = useDeleteJournalEntry();
  const openModal = useUIStore((state) => state.openModal);
  const [query, setQuery] = useState("");
  const [side, setSide] = useState("All");
  const [editing, setEditing] = useState<JournalEntryDTO | null>(null);
  const visible = useMemo(() => data.filter((entry) => {
    const term = query.toLowerCase();
    const matchesQuery = [entry.symbol, entry.company, entry.exchange, entry.notes].some((value) => value?.toLowerCase().includes(term));
    const entrySide = entry.side === "SHORT" ? "Short" : "Long";
    return matchesQuery && (side === "All" || side === entrySide);
  }), [data, query, side]);
  return <div className="aureum-page">
    <PageHeader eyebrow="Journal / Trades" title="Trading journal" description="Review decisions, track outcomes, and sharpen your process." actions={<button className="aureum-button primary" onClick={() => openModal({ type: "journal" })}><Plus size={17}/> Record trade</button>}/>
    <div className="aureum-toolbar"><label className="aureum-search"><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search trades"/></label><div className="aureum-segmented">{["All", "Long", "Short"].map((value) => <button className={side === value ? "active" : ""} onClick={() => setSide(value)} key={value}>{value}</button>)}</div><span>{visible.length} entries</span></div>
    {isError && <div className="aureum-error" role="alert">Unable to load journal. {error.message}</div>}
    <article className="aureum-panel aureum-table-card">{isLoading ? <Skeleton className="h-80"/> : <div className="aureum-trade-table"><div className="aureum-trade-row head"><span>Setup</span><span>Date</span><span>Stock</span><span>Side</span><span>Entry / Exit</span><span>Qty.</span><span>P&amp;L</span><span/></div>{visible.map((entry) => { const pnl = (entry.exitPrice - entry.entryPrice) * entry.quantity * (entry.side === "LONG" ? 1 : -1); return <div className="aureum-trade-row" key={entry.id}><span className="aureum-trade-image">{entry.screenshotUrl ? <Image unoptimized width={42} height={42} src={entry.screenshotUrl} alt={`${entry.symbol} setup`}/> : <ImageIcon size={16}/>}</span><time>{formatDate(entry.date)}</time><span className="aureum-trade-stock"><strong>{entry.symbol}</strong><small>{entry.company} · {entry.exchange}</small></span><span><i className={`aureum-side ${entry.side.toLowerCase()}`}>{entry.side === "LONG" ? "Long" : "Short"}</i></span><span className="font-mono">₹{entry.entryPrice.toLocaleString("en-IN")} → ₹{entry.exitPrice.toLocaleString("en-IN")}</span><span className="font-mono">{entry.quantity.toLocaleString("en-IN")}</span><strong className={pnl >= 0 ? "positive" : "negative"}>{formatCurrency(pnl)}</strong><span className="aureum-row-actions"><button onClick={() => setEditing(entry)} aria-label={`Edit ${entry.symbol} trade`}><Pencil size={16}/></button><button onClick={() => { if (window.confirm("Delete this journal entry?")) remove.mutate(entry.id); }} disabled={remove.isPending} aria-label={`Delete ${entry.symbol} trade`}><Trash2 size={16}/></button></span>{entry.notes && <p>{entry.notes}</p>}</div>; })}</div>}{!isLoading && !visible.length && <div className="aureum-empty"><h3>No trades found</h3><p>Adjust your filters or record a new NSE/BSE position.</p></div>}</article>
    <TradeModal open={!!editing} initialTrade={editing} onClose={() => setEditing(null)}/>
  </div>;
}
