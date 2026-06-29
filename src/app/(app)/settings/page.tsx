"use client";

import { useState } from "react";
import { Download, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { THEMES, DATE_RANGES } from "@/lib/validations/settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIMEZONES = ["Asia/Kolkata", "UTC", "America/New_York", "Europe/London", "Asia/Dubai", "Asia/Singapore"];

export default function SettingsPage() {
  const { data, isLoading } = useSettings();
  const update = useUpdateSettings();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Are you absolutely sure you want to delete your account? This action is irreversible. All your transactions, journal entries, snapshots, settings, and login credentials will be permanently deleted."
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete account");
      }

      toast.success("Account successfully deleted.");
      window.location.href = "/login";
    } catch (e: any) {
      toast.error(e.message || "An error occurred while deleting your account.");
      setIsDeleting(false);
    }
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Theme, currency, timezone and defaults.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label="Theme">
            <Select value={data.theme} onValueChange={(v) => update.mutate({ theme: v as typeof data.theme })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {THEMES.map((t) => (
                  <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Currency">
            <Input
              defaultValue={data.currency}
              onBlur={(e) => e.target.value !== data.currency && update.mutate({ currency: e.target.value })}
            />
          </Field>

          <Field label="Timezone">
            <Select value={data.timezone} onValueChange={(v) => update.mutate({ timezone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Default date range">
            <Select value={data.defaultRange} onValueChange={(v) => update.mutate({ defaultRange: v as typeof data.defaultRange })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Auto-refresh (seconds, 0 = off)">
            <Input
              type="number"
              min={0}
              defaultValue={data.autoRefreshSecs}
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (v !== data.autoRefreshSecs) update.mutate({ autoRefreshSecs: v });
              }}
            />
          </Field>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>Export, back up, or restore your data.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <a href="/api/export" download>
              <Download className="mr-2 size-4" />
              Export transactions (CSV)
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info("Use Import CSV from the dashboard to restore a backup.")}
          >
            <RefreshCw className="mr-2 size-4" />
            Restore from CSV
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>Irreversible actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Deleting account…
              </>
            ) : (
              <>
                <Trash2 className="mr-2 size-4" />
                Delete account
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
