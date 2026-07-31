"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { StockCombobox } from "@/components/aureum/stock-combobox";
import { createClient } from "@/lib/supabase/client";
import { fromJournalEntry, toJournalInput, type TradeDraft } from "@/lib/trades";
import { useCreateJournalEntry, useUpdateJournalEntry } from "@/hooks/use-journal";
import type { JournalEntryDTO } from "@/types";

const emptyTrade = (): TradeDraft => ({ symbol: "", company: "", exchange: "NSE", side: "LONG", entryPrice: 0, exitPrice: 0, quantity: 0, date: new Date().toISOString().slice(0, 10), status: "CLOSED", notes: "", screenshotUrl: "" });

export function TradeModal({ open, initialTrade, onClose }: { open: boolean; initialTrade?: JournalEntryDTO | null; onClose: () => void }) {
  if (!open) return null;
  return <TradeModalContent key={initialTrade?.id ?? "new"} initialTrade={initialTrade} onClose={onClose} />;
}

function TradeModalContent({ initialTrade, onClose }: { initialTrade?: JournalEntryDTO | null; onClose: () => void }) {
  const [form, setForm] = useState<TradeDraft>(() => initialTrade ? fromJournalEntry(initialTrade) : emptyTrade());
  const [uploading, setUploading] = useState(false);
  const create = useCreateJournalEntry();
  const update = useUpdateJournalEntry();
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => { const close = (event: KeyboardEvent) => event.key === "Escape" && onClose(); document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [onClose]);
  const field = <K extends keyof TradeDraft>(key: K, value: TradeDraft[K]) => setForm((current) => ({ ...current, [key]: value }));
  const imageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Use a JPG, PNG, or WEBP image");
    if (file.size > 2_500_000) return toast.error("Image must be smaller than 2.5 MB");
    setUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `screenshots/${crypto.randomUUID()}.${extension}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("journal").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("journal").getPublicUrl(path);
      field("screenshotUrl", data.publicUrl);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.symbol) return toast.error("Select an Indian stock");
    if (form.entryPrice <= 0 || form.exitPrice <= 0 || form.quantity <= 0) return toast.error("Enter valid prices and quantity");
    const input = toJournalInput(form);
    if (initialTrade) await update.mutateAsync({ id: initialTrade.id, input });
    else await create.mutateAsync(input);
    onClose();
  };
  const saving = create.isPending || update.isPending;
  return <div className="aureum-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="aureum-modal" role="dialog" aria-modal="true" aria-labelledby="trade-title"><div className="aureum-modal-head"><div><p className="aureum-eyebrow">Journal entry</p><h2 id="trade-title">{initialTrade ? "Edit trade" : "Record a trade"}</h2></div><button className="aureum-icon-button" onClick={onClose} aria-label="Close"><X size={20}/></button></div><form onSubmit={submit} className="aureum-trade-form"><StockCombobox value={form.symbol} onSelect={(stock) => setForm((current) => ({ ...current, symbol: stock.ticker, company: stock.name, exchange: stock.exchange }))}/><label>Exchange<input readOnly value={form.exchange}/></label><label>Direction<select value={form.side} onChange={(event) => field("side", event.target.value as TradeDraft["side"])}><option value="LONG">Long</option><option value="SHORT">Short</option></select></label><label>Entry price (₹)<input required min="0.01" step="any" type="number" value={form.entryPrice || ""} onChange={(event) => field("entryPrice", Number(event.target.value))}/></label><label>Exit price (₹)<input required min="0.01" step="any" type="number" value={form.exitPrice || ""} onChange={(event) => field("exitPrice", Number(event.target.value))}/></label><label>Quantity<input required min="1" step="1" type="number" value={form.quantity || ""} onChange={(event) => field("quantity", Number(event.target.value))}/></label><label>Date<input required type="date" value={form.date} onChange={(event) => field("date", event.target.value)}/></label><label>Status<select value={form.status} onChange={(event) => field("status", event.target.value as TradeDraft["status"])}><option value="CLOSED">Closed</option><option value="OPEN">Open</option></select></label><label className="full">Notes<textarea rows={3} value={form.notes} onChange={(event) => field("notes", event.target.value)} placeholder="Setup, thesis, risk and lessons…"/></label><div className="aureum-image-field full"><span>Chart screenshot or setup image</span><input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={imageChange}/>{form.screenshotUrl ? <div className="aureum-image-preview"><Image unoptimized width={140} height={94} src={form.screenshotUrl} alt="Trade journal preview"/><div><button type="button" className="aureum-button" onClick={() => fileInput.current?.click()}><Upload size={15}/> Replace</button><button type="button" className="aureum-button danger" onClick={() => field("screenshotUrl", "")}><Trash2 size={15}/> Remove</button></div></div> : <button type="button" className="aureum-image-drop" onClick={() => fileInput.current?.click()}><ImagePlus size={22}/><span>Upload JPG, PNG or WEBP</span><small>Maximum 2.5 MB</small></button>}</div><div className="aureum-form-actions full"><button type="button" className="aureum-button" onClick={onClose}>Cancel</button><button className="aureum-button primary" type="submit" disabled={saving || uploading}>{saving || uploading ? <Loader2 size={16} className="animate-spin"/> : null}{initialTrade ? "Save changes" : "Save trade"}</button></div></form></section></div>;
}
