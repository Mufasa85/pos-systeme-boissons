"use client";

import { Bell, Search, Settings, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useBranding } from "@/components/branding-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ROLE_LABELS: Record<string, string> = {
  cashier: "Caissier",
  manager: "Manager",
  admin: "Administrateur",
};

export function Topbar({
  query,
  onQueryChange,
  onOpenSettings,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenSettings: () => void;
}) {
  const { branding } = useBranding();
  const { cashier } = useAuth();

  const initials = cashier
    ? cashier.fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s.charAt(0).toUpperCase())
        .join("")
    : "—";

  const roleLabel = cashier ? (ROLE_LABELS[cashier.role] ?? cashier.role) : "";

  return (
    <header className="glass flex items-center gap-3 rounded-3xl p-3 sm:gap-4 sm:p-4">
      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="brand-bg flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold">
          {branding.logoText.charAt(0)}
        </div>
      </div>

      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Rechercher une boisson..."
          className="h-11 rounded-2xl border-transparent bg-muted/60 pl-11 text-sm focus-visible:ring-2"
          style={{ outlineColor: "var(--brand)" }}
          aria-label="Rechercher une boisson"
        />
      </div>

      <Button
        variant="ghost"
        className="hidden h-11 gap-2 rounded-2xl bg-muted/60 px-4 text-sm font-medium sm:flex"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filtres
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 rounded-2xl bg-muted/60"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSettings}
        className="h-11 w-11 rounded-2xl bg-muted/60 lg:hidden"
        aria-label="Paramètres de branding"
      >
        <Settings className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-3 pl-1 pr-1">
        <Avatar className="h-10 w-10 border border-border">
          <AvatarImage
            src={cashier?.avatarUrl ?? "/cashier-avatar.png"}
            alt={cashier?.fullName ?? "Caissier"}
          />
          <AvatarFallback className="brand-soft text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden text-sm leading-tight md:block">
          <p className="font-semibold">{cashier?.fullName ?? "Non connecté"}</p>
          <p className="text-xs text-muted-foreground">
            {cashier ? `${roleLabel} · ${cashier.code}` : "En attente..."}
          </p>
        </div>
      </div>
    </header>
  );
}
