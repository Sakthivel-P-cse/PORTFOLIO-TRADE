"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Download, Loader2, Moon, Sun, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/aureum/page-header";
import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";

export default function SettingsPage() {
  const profile = useProfile();
  const settings = useSettings();
  const updateProfile = useUpdateProfile();
  const updateSettings = useUpdateSettings();
  const [name, setName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [goalMin, setGoalMin] = useState<string | null>(null);
  const [goalTarget, setGoalTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => { if (settings.data) document.documentElement.dataset.theme = settings.data.theme === "LIGHT" ? "light" : "dark"; }, [settings.data]);
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const nextName = (name ?? profile.data?.name ?? "").trim();
    if (nextName && nextName !== profile.data?.name) await updateProfile.mutateAsync(nextName);
    const nextGoalMin = Number(goalMin ?? settings.data?.goalMinPct ?? 0);
    const nextGoalTarget = Number(goalTarget ?? settings.data?.goalTargetPct ?? 100);
    if (!Number.isFinite(nextGoalMin) || !Number.isFinite(nextGoalTarget) || nextGoalTarget <= nextGoalMin) {
      toast.error("Goal target must be greater than the goal minimum");
      return;
    }
    if (nextGoalMin !== settings.data?.goalMinPct || nextGoalTarget !== settings.data?.goalTargetPct) {
      await updateSettings.mutateAsync({ goalMinPct: nextGoalMin, goalTargetPct: nextGoalTarget });
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };
  const setTheme = (theme: "DARK" | "LIGHT") => { document.documentElement.dataset.theme = theme === "LIGHT" ? "light" : "dark"; updateSettings.mutate({ theme }); };
  const deleteAccount = async () => {
    if (!window.confirm("Permanently delete your account and all portfolio data?")) return;
    setDeleting(true);
    try { const response = await fetch("/api/account", { method: "DELETE" }); const body = await response.json(); if (!response.ok) throw new Error(body.error || "Unable to delete account"); window.location.assign("/login"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Unable to delete account"); setDeleting(false); }
  };
  if (profile.isLoading || settings.isLoading) return <div className="aureum-page"><div className="aureum-route-loading">Loading settings…</div></div>;
  if (!profile.data || !settings.data) return <div className="aureum-page"><div className="aureum-error">Unable to load settings.</div></div>;
  const displayedName = name ?? profile.data.name ?? "";
  const displayedGoalMin = goalMin ?? String(settings.data.goalMinPct);
  const displayedGoalTarget = goalTarget ?? String(settings.data.goalTargetPct);
  return <div className="aureum-page aureum-settings-page"><PageHeader eyebrow="Account / Preferences" title="Settings" description="Manage your trading environment and account preferences."/><form onSubmit={save} className="aureum-settings-layout"><nav><a href="#profile">Profile</a><a href="#goal">Return goal</a><a href="#appearance">Appearance</a><a href="#data">Data management</a><a href="#danger">Account</a></nav><div className="aureum-settings-content">
    <section id="profile" className="aureum-settings-section"><div><h2>Profile</h2><p>Personal information and Indian market preferences.</p></div><div className="aureum-avatar-row"><span>{(displayedName || profile.data.email).slice(0, 2).toUpperCase()}</span><div><strong>{displayedName || "Portfolio manager"}</strong><small>{profile.data.email}</small></div></div><div className="aureum-form-grid"><label>Full name<input value={displayedName} onChange={(event) => setName(event.target.value)}/></label><label>Email address<input readOnly type="email" value={profile.data.email}/></label><label>Primary market<select value={settings.data.primaryMarket} onChange={(event) => updateSettings.mutate({ primaryMarket: event.target.value as "NSE" | "BSE" })}><option value="NSE">NSE — National Stock Exchange</option><option value="BSE">BSE — Bombay Stock Exchange</option></select></label><label>Locale<select value="in" disabled><option value="in">India · INR · DD/MM/YYYY</option></select></label><label>Time zone<select value={settings.data.timezone} onChange={(event) => updateSettings.mutate({ timezone: event.target.value })}><option value="Asia/Kolkata">India Standard Time (IST)</option><option value="UTC">UTC</option></select></label></div></section>
    <section id="goal" className="aureum-settings-section"><div><h2>Return goal</h2><p>Set the minimum and target percentages shown on the Dashboard progress meter.</p></div><div className="aureum-form-grid"><label>Range minimum (%)<input type="number" step="0.1" value={displayedGoalMin} onChange={(event) => setGoalMin(event.target.value)}/></label><label>Goal target (%)<input type="number" step="0.1" value={displayedGoalTarget} onChange={(event) => setGoalTarget(event.target.value)}/></label></div></section>
    <section id="appearance" className="aureum-settings-section"><div><h2>Appearance</h2><p>Choose how Aureum looks on this device.</p></div><div className="aureum-theme-options"><button type="button" className={settings.data.theme === "DARK" ? "selected" : ""} onClick={() => setTheme("DARK")}><Moon/>Dark<span>Optimized for focus</span></button><button type="button" className={settings.data.theme === "LIGHT" ? "selected" : ""} onClick={() => setTheme("LIGHT")}><Sun/>Light<span>Bright and crisp</span></button></div></section>
    <section id="data" className="aureum-settings-section"><div><h2>Data management</h2><p>Download a portable copy of your transaction history.</p></div><a className="aureum-button" href="/api/export" download><Download size={17}/> Export transactions</a></section>
    <section id="danger" className="aureum-settings-section"><div><h2>Account</h2><p>Permanently remove authentication and all portfolio data.</p></div><button type="button" className="aureum-button danger" onClick={deleteAccount} disabled={deleting}>{deleting ? <Loader2 size={17} className="animate-spin"/> : <Trash2 size={17}/>} Delete account</button></section>
    <div className="aureum-save-bar"><span>{saved && <><Check size={16}/> Changes saved</>}</span><button className="aureum-button primary" type="submit" disabled={updateProfile.isPending || updateSettings.isPending}>Save changes</button></div>
  </div></form></div>;
}
