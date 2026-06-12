"use client";

import { useRouter } from "next/navigation";
import {
  BarChart3,
  Coffee,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useBranding } from "@/components/branding-provider";
import { cn } from "@/lib/utils";

const navItems = [
  { id: "pos", label: "Point of Sale", icon: ShoppingBag },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "menu", label: "Menu", icon: Coffee },
  { id: "stock", label: "Stock", icon: Package },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "history", label: "History", icon: History },
];

export function Sidebar({
  active,
  onChange,
  onOpenSettings,
}: {
  active: string;
  onChange: (id: string) => void;
  onOpenSettings: () => void;
}) {
  const { branding } = useBranding();
  const { cashier, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <aside className="hidden w-64 shrink-0 flex-col p-4 lg:flex">
      <div className="glass flex h-full flex-col rounded-3xl p-5">
        {/* Logo */}
        <div className="flex items-center gap-3 px-1">
          <div className="brand-bg flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold">
            {branding.logoText.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold leading-tight">
              {branding.companyName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {branding.tagline}
            </p>
          </div>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChange(item.id)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "brand-soft"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-4">
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
            Branding
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            Se déconnecter
          </button>
          {cashier ? (
            <div className="mt-2 flex items-center gap-3 rounded-2xl bg-muted/40 px-3 py-2.5">
              <div className="brand-bg flex h-8 w-8 items-center justify-center rounded-xl text-xs font-bold">
                {cashier.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">
                  {cashier.fullName}
                </p>
                <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                  {cashier.code} · {cashier.role}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
