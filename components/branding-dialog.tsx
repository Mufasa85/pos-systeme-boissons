"use client";

import * as React from "react";
import { Check, Loader2, RefreshCcw, Save, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useBranding } from "@/components/branding-provider";
import { presetThemes } from "@/lib/data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function BrandingDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    branding,
    setBranding,
    saveBranding,
    resetBranding,
    loading,
    saving,
    error,
    refresh,
  } = useBranding();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  // Local "saved" flag that flashes a confirmation for a few seconds
  // after a successful PUT /branding.
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // When the dialog opens, make sure the local state is in sync
  // with the server (in case another tab updated it).
  useEffect(() => {
    if (open) {
      refresh().catch(() => {
        /* surfaced via context.error */
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Auto-hide the "saved" toast after a couple of seconds.
  useEffect(() => {
    if (savedAt === null) return;
    const t = setTimeout(() => setSavedAt(null), 2500);
    return () => clearTimeout(t);
  }, [savedAt]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as string;
      setBranding({ logoImage: data });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setBranding({ logoImage: "" });
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  async function handleSave() {
    try {
      await saveBranding();
      setSavedAt(Date.now());
    } catch {
      /* error already stored in context */
    }
  }

  async function handleReset() {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        "Réinitialiser tous les paramètres de la société (logo, couleurs, infos fiscales) aux valeurs par défaut ?",
      );
      if (!ok) return;
    }
    try {
      await resetBranding();
      setFileName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setSavedAt(Date.now());
    } catch {
      /* error already stored in context */
    }
  }

  const justSaved = savedAt !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90dvh] max-h-[90dvh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-3xl sm:h-auto sm:max-h-[90vh] sm:max-w-lg">
        <DialogHeader className="shrink-0 border-b border-border pb-3">
          <DialogTitle>Paramètres de la société</DialogTitle>
          <DialogDescription>
            Personnalisez le POS pour votre entreprise. Les couleurs sont
            appliquées en temps réel, mais les modifications sont envoyées au
            serveur uniquement après avoir cliqué sur «&nbsp;Enregistrer&nbsp;».
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-1 py-4 pr-2">
          {/* Live preview */}
          <div className="glass flex items-center gap-3 rounded-2xl p-4">
            <div className="flex items-center justify-center">
              {branding.logoImage ? (
                <img
                  src={branding.logoImage}
                  alt="logo"
                  className="h-12 w-12 rounded-2xl object-cover"
                />
              ) : (
                <div className="brand-bg flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold">
                  {branding.logoText.charAt(0) || "?"}
                </div>
              )}
            </div>
            <div>
              <p className="font-bold leading-tight">
                {branding.companyName || "Nom de la société"}
              </p>
              <p className="text-xs text-muted-foreground">
                {branding.tagline || "Slogan"}
              </p>
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
            >
              {error}
            </div>
          ) : null}
          {justSaved ? (
            <div
              role="status"
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700"
            >
              Paramètres enregistrés sur le serveur.
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="company">Nom de la société</Label>
            <Input
              id="company"
              value={branding.companyName}
              onChange={(e) => setBranding({ companyName: e.target.value })}
              className="rounded-xl"
              placeholder="JOAC"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="logo">Initiale du logo</Label>
              <Input
                id="logo"
                maxLength={6}
                value={branding.logoText}
                onChange={(e) => setBranding({ logoText: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tagline">Slogan</Label>
              <Input
                id="tagline"
                value={branding.tagline}
                onChange={(e) => setBranding({ tagline: e.target.value })}
                className="rounded-xl"
                placeholder="Specialty drinks & more"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Image du logo</Label>
            <div className="glass rounded-2xl p-4">
              <div className="space-y-3">
                {branding.logoImage ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={branding.logoImage}
                      alt="logo preview"
                      className="h-16 w-16 rounded-2xl object-cover shadow-sm"
                    />
                    <p className="text-xs text-muted-foreground text-center break-all">
                      {fileName}
                    </p>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                    >
                      <X className="h-3.5 w-3.5" />
                      Supprimer le logo
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-3 py-6 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-muted/50"
                    >
                      <Upload className="h-4 w-4" />
                      Téléverser un logo
                    </button>
                    <p className="mt-2 text-xs text-muted-foreground text-center">
                      PNG, JPG, GIF jusqu'à 5MB
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                id="logoImage"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="color">Couleur principale</Label>
            <div className="flex items-center gap-3">
              <input
                id="color"
                type="color"
                value={branding.primaryColor}
                onChange={(e) => setBranding({ primaryColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-xl border border-border bg-transparent"
              />
              <Input
                value={branding.primaryColor}
                onChange={(e) => setBranding({ primaryColor: e.target.value })}
                className="rounded-xl font-mono text-sm"
              />
            </div>
          </div>

          {/* Preset themes */}
          <div className="grid gap-2">
            <Label>Thèmes prédéfinis</Label>
            <div className="grid grid-cols-3 gap-2">
              {presetThemes.map((theme) => {
                const isActive = branding.primaryColor === theme.primaryColor;
                return (
                  <button
                    key={theme.name}
                    type="button"
                    onClick={() =>
                      setBranding({
                        primaryColor: theme.primaryColor,
                        secondaryColor: theme.secondaryColor,
                      })
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2 text-xs font-medium transition-colors",
                      isActive
                        ? "border-transparent"
                        : "border-border hover:bg-muted",
                    )}
                    style={
                      isActive
                        ? {
                            backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 14%, transparent)`,
                          }
                        : undefined
                    }
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-md"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {isActive && <Check className="h-3 w-3 text-white" />}
                    </span>
                    {theme.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ============== Fiscal / receipt info ============== */}
          <div className="pt-2">
            <div className="mb-2 flex items-baseline justify-between">
              <Label className="text-sm font-semibold">
                Informations fiscales
              </Label>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Affichées sur le ticket
              </span>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="address">Adresse</Label>
                <Textarea
                  id="address"
                  rows={2}
                  value={branding.address}
                  onChange={(e) => setBranding({ address: e.target.value })}
                  className="rounded-xl"
                  placeholder="03 Avenue Mbiloa / Ngaliema"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={branding.phone}
                    onChange={(e) => setBranding({ phone: e.target.value })}
                    className="rounded-xl"
                    placeholder="+243..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={branding.email}
                    onChange={(e) => setBranding({ email: e.target.value })}
                    className="rounded-xl"
                    placeholder="contact@exemple.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="idNat">ID Nat</Label>
                  <Input
                    id="idNat"
                    value={branding.idNat}
                    onChange={(e) => setBranding({ idNat: e.target.value })}
                    className="rounded-xl font-mono text-xs"
                    placeholder="01-G4701-..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rccm">RCCM</Label>
                  <Input
                    id="rccm"
                    value={branding.rccm}
                    onChange={(e) => setBranding({ rccm: e.target.value })}
                    className="rounded-xl font-mono text-xs"
                    placeholder="CD/KNG/RCCM/..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="taxNumber">N° Impôt</Label>
                  <Input
                    id="taxNumber"
                    value={branding.taxNumber}
                    onChange={(e) => setBranding({ taxNumber: e.target.value })}
                    className="rounded-xl font-mono text-xs"
                    placeholder="A1720894F"
                  />
                </div>
              </div>
            </div>
          </div>
          {/* ============== Taux de change ============== */}
          <div className="pt-2">
            <div className="mb-2 flex items-baseline justify-between">
              <Label className="text-sm font-semibold">
                Taux de change
              </Label>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                USD → CDF
              </span>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fxRate">1 USD = ? CDF</Label>
              <Input
                id="fxRate"
                type="number"
                step="0.0001"
                min="0"
                value={branding.fxRate ?? ""}
                onChange={(e) =>
                  setBranding({
                    fxRate: e.target.value === "" ? null : parseFloat(e.target.value),
                  })
                }
                className="rounded-xl font-mono text-sm"
                placeholder="2289.3077"
              />
              <p className="text-xs text-muted-foreground">
                Taux appliqué lors de la conversion des montants en francs congolais
                sur les reçus et dans les rapports.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between sm:border-0 sm:pt-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={saving || loading}
            className="gap-2 text-muted-foreground"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Fermer
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="min-w-32"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Enregistrer
                </span>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
