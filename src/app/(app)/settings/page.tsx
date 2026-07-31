"use client";

import { useEffect, useState } from "react";
import { Check, Download, Loader2, Moon, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/aureum/page-header";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";

export default function SettingsPage() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (!settings.data) return; document.documentElement.dataset.theme = settings.data.theme === "LIGHT" ? "light" : "dark"; }, [settings.data]);
  const save = async (input: Parameters<typeof update.mutateAsync>[0]) => { await update.mutateAsync(input); setSaved(true); window.setTimeout(() => setSaved(false), 1800); };
  const deleteAccount = async () => {
    if (!window.confirm("Permanently delete your account and all portfolio data?")) return;
    setDeleting(true);
    try { const response = await fetch("/api/account", { method: "DELETE" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Unable to delete account"); window.location.assign("/login"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to delete account"); setDeleting(false); }
  };
  if (settings.isLoading) return <div className="aureum-page"><div className="aureum-route-loading">Loading settings…</div></div>;
  if (settings.isError || !settings.data) return <div className="aureum-page"><div className="aureum-error" role="alert">Unable to load settings. {settings.error?.message}</div></div>;
  const data = settings.data;
  return <div className="aureum-page aureum-settings-page"><PageHeader eyebrow="Account / Preferences" title="Settings" description="Manage your trading environment, exports, and account."/>
    <div className="aureum-settings-layout"><nav><a href="#preferences">Preferences</a><a href="#appearance">Appearance</a><a href="#data">Data management</a><a href="#danger">Account</a></nav><div className="aureum-settings-content">
      <section id="preferences" className="aureum-settings-section"><div><h2>Preferences</h2><p>Indian market display and portfolio defaults.</p></div><div className="aureum-form-grid"><label>Currency<input defaultValue={data.currency} maxLength={8} onBlur={(event) => event.target.value !== data.currency && void save({ currency: event.target.value })}/></label><label>Time zone<select value={data.timezone} onChange={(event) => void save({ timezone: event.target.value })}><option value="Asia/Kolkata">India Standard Time (IST)</option><option value="UTC">UTC</option><option value="Asia/Singapore">Singapore</option></select></label><label>Default date range<select value={data.defaultRange} onChange={(event) => void save({ defaultRange: event.target.value as typeof data.defaultRange })}>{["1W", "1M", "3M", "6M", "1Y", "ALL"].map((range) => <option key={range}>{range}</option>)}</select></label><label>Auto-refresh seconds<input type="number" min={0} max={3600} defaultValue={data.autoRefreshSecs} onBlur={(event) => Number(event.target.value) !== data.autoRefreshSecs && void save({ autoRefreshSecs: Number(event.target.value) })}/></label></div></section>
      <section id="appearance" className="aureum-settings-section"><div><h2>Appearance</h2><p>Choose how Aureum looks on this device.</p></div><div className="aureum-theme-options"><button className={data.theme === "DARK" ? "selected" : ""} onClick={() => void save({ theme: "DARK" })}><Moon/>Dark<span>Optimized for focus</span></button><button className={data.theme === "LIGHT" ? "selected" : ""} onClick={() => void save({ theme: "LIGHT" })}><Sun/>Light<span>Bright and crisp</span></button></div></section>
      <section id="data" className="aureum-settings-section"><div><h2>Data management</h2><p>Download a portable CSV copy of your transaction history.</p></div><a className="aureum-button" href="/api/export" download><Download size={17}/> Export transactions</a></section>
      <section id="danger" className="aureum-settings-section"><div><h2>Account</h2><p>Account deletion permanently removes authentication and all portfolio records.</p></div><button className="aureum-button danger" onClick={deleteAccount} disabled={deleting}>{deleting ? <Loader2 className="animate-spin" size={17}/> : <Trash2 size={17}/>} Delete account</button></section>
      <div className="aureum-save-bar"><span>{saved && <><Check size={16}/> Changes saved</>}</span></div>
    </div></div>
  </div>;
}
