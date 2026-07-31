"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { Check, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { type IndianStock } from "@/lib/stocks";
import { api } from "@/lib/fetcher";

export function StockCombobox({ value, onSelect, label = "Indian stock", compact = false }: { value?: string; onSelect: (stock: IndianStock) => void; label?: string; compact?: boolean }) {
  const id = useId();
  const [query, setQuery] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const stocks = useQuery({ queryKey: ["stocks"], queryFn: () => api<IndianStock[]>("/api/stocks"), staleTime: 24 * 60 * 60 * 1000 });
  const options = useMemo(() => stocks.data ?? [], [stocks.data]);
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || options.some((stock) => stock.ticker === query)) return options;
    return options.filter((stock) => [stock.name, stock.ticker, stock.bse, stock.exchange].some((item) => item?.toLowerCase().includes(term)));
  }, [options, query]);
  const choose = (stock: IndianStock) => { onSelect(stock); setQuery(stock.ticker); setOpen(false); setActive(0); };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((index) => Math.min(index + 1, matches.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
    if (event.key === "Enter" && open && matches[active]) { event.preventDefault(); choose(matches[active]); }
    if (event.key === "Escape") setOpen(false);
  };
  return <div className={`aureum-stock-combobox ${compact ? "is-compact" : ""}`} onBlur={() => window.setTimeout(() => setOpen(false), 120)}>
    {!compact && <span className="aureum-stock-label">{label}</span>}
    <div className="aureum-stock-input"><Search size={compact ? 12 : 15}/><input id={id} role="combobox" aria-label={label} aria-expanded={open} aria-controls={`${id}-listbox`} autoComplete="off" value={query} placeholder="Company, NSE/BSE symbol…" onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value.toUpperCase()); setOpen(true); setActive(0); }} onKeyDown={onKeyDown}/></div>
    {open && <div className="aureum-stock-options" id={`${id}-listbox`} role="listbox">{stocks.isLoading ? <p>Loading Indian stocks…</p> : stocks.isError ? <p>Unable to load stocks</p> : matches.length ? matches.map((stock, index) => <button type="button" role="option" aria-selected={value === stock.ticker} className={active === index ? "active" : ""} key={stock.ticker} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(stock)}><span><strong>{stock.name}</strong><small>{stock.exchange}: {stock.ticker}{stock.bse ? ` · BSE ${stock.bse}` : ""}</small></span>{value === stock.ticker && <Check size={15}/>}</button>) : <p>No Indian stocks found</p>}</div>}
  </div>;
}
