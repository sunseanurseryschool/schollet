"use client";

import * as React from "react";
import { DownloadIcon, ImageIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DEFAULT_BRANDING,
  MAX_LOGO_DATA_URL_LENGTH,
  type Branding,
} from "@/lib/schemas/settings";
import { todayISO } from "@/lib/dates";

interface ExportMeta {
  table_count: number;
  total_rows: number;
  errors?: Record<string, string>;
}

const LOGO_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

export function SettingsView() {
  const [isExporting, setIsExporting] = React.useState(false);
  const [branding, setBranding] = React.useState<Branding>(DEFAULT_BRANDING);
  const [isLoadingBranding, setIsLoadingBranding] = React.useState(true);
  const [isSavingBranding, setIsSavingBranding] = React.useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/branding")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Branding | null) => {
        if (!cancelled && data) setBranding(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingBranding(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setField<K extends keyof Branding>(key: K, value: Branding[K]) {
    setBranding((prev) => ({ ...prev, [key]: value }));
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!LOGO_MIME_TYPES.includes(file.type)) {
      toast.error("Logo must be a PNG, JPEG, WebP or SVG image");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (dataUrl.length > MAX_LOGO_DATA_URL_LENGTH) {
        toast.error("Logo image is too large — please use one under ~375 KB");
        return;
      }
      setField("logo_data_url", dataUrl);
    };
    reader.readAsDataURL(file);
    // Allow re-selecting the same file later
    e.target.value = "";
  }

  async function handleSaveBranding() {
    if (isSavingBranding) return;
    if (branding.school_name.trim() === "") {
      toast.error("School name is required");
      return;
    }
    setIsSavingBranding(true);
    try {
      const res = await fetch("/api/settings/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });
      const body = (await res.json().catch(() => null)) as
        | (Branding & { error?: string })
        | null;
      if (!res.ok) {
        toast.error(body?.error ?? "Failed to save branding");
        return;
      }
      toast.success("Branding saved — receipts will use it right away");
    } catch {
      toast.error("Failed to save branding");
    } finally {
      setIsSavingBranding(false);
    }
  }

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch("/api/settings/export");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(body?.error ?? "Export failed");
        return;
      }

      const payload = (await res.json()) as { meta: ExportMeta };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `schollet-export-${todayISO()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const failedTables = Object.keys(payload.meta.errors ?? {});
      if (failedTables.length > 0) {
        toast.warning(
          `Exported with ${failedTables.length} table(s) skipped: ${failedTables.join(", ")}`
        );
      } else {
        toast.success(
          `Exported ${payload.meta.total_rows} rows from ${payload.meta.table_count} tables`
        );
      }
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>School Branding</CardTitle>
          <CardDescription>
            The school name, logo and contact details shown on printed fee
            receipts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="school_name">School Name</Label>
              <Input
                id="school_name"
                value={branding.school_name}
                onChange={(e) => setField("school_name", e.target.value)}
                placeholder="e.g. Sun Sea Nursery School"
                disabled={isLoadingBranding}
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tagline">Tagline (optional)</Label>
              <Input
                id="tagline"
                value={branding.tagline}
                onChange={(e) => setField("tagline", e.target.value)}
                placeholder="e.g. Nurturing young minds"
                disabled={isLoadingBranding}
                maxLength={160}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Address (optional)</Label>
              <Input
                id="address"
                value={branding.address}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="Street, city, PIN"
                disabled={isLoadingBranding}
                maxLength={300}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={branding.phone}
                onChange={(e) => setField("phone", e.target.value)}
                placeholder="e.g. +91 98765 43210"
                disabled={isLoadingBranding}
                maxLength={40}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Logo (optional)</Label>
            <div className="flex items-center gap-4">
              {branding.logo_data_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL preview
                <img
                  src={branding.logo_data_url}
                  alt="School logo"
                  className="h-16 w-16 rounded-lg border object-contain bg-white p-1"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed text-text-tertiary">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept={LOGO_MIME_TYPES.join(",")}
                  className="hidden"
                  onChange={handleLogoSelect}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={isLoadingBranding}
                >
                  {branding.logo_data_url ? "Change logo" : "Upload logo"}
                </Button>
                {branding.logo_data_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setField("logo_data_url", "")}
                  >
                    <Trash2Icon className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-text-tertiary">
              PNG, JPEG, WebP or SVG, up to ~375 KB. Shown on the receipt
              header.
            </p>
          </div>

          <Button
            onClick={handleSaveBranding}
            disabled={isLoadingBranding || isSavingBranding}
          >
            {isSavingBranding ? "Saving..." : "Save Branding"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Export</CardTitle>
          <CardDescription>
            Download a full backup of all school data as a single JSON file —
            students, fees, accounts, expenses, inventory, staff and audit
            logs. New tables and columns are included automatically as the
            database grows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={isExporting}>
            <DownloadIcon className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export all data (JSON)"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
