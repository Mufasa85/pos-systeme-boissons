"use client";

import { useRouter } from "next/navigation";
import {
  BarChart3,
  Coffee,
  FolderTree,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useMobileSidebar } from "@/components/mobile-sidebar";
import { useBranding } from "@/components/branding-provider";
import {
  canAccessNav,
  hasCapability,
  NAV_PATHS,
  type NavKey,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";

// All possible nav entries. We filter this list against the
// logged-in cashier's role at render time so a manager or a
// cashier simply doesn't see the pages they can't access.
const allNavItems: { id: NavKey; label: string; icon: typeof ShoppingBag }[] = [
  { id: "pos", label: "Point of Sale", icon: ShoppingBag },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "menu", label: "Menu", icon: Coffee },
  { id: "stock", label: "Stock", icon: Package },
  { id: "categories", label: "Catégories", icon: FolderTree },
  { id: "users", label: "Utilisateurs", icon: Users },
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
  const { open, setOpen } = useMobileSidebar();
  const router = useRouter();

  // Filter the full nav list against the connected role. If
  // something is off (no cashier yet), we fall back to the
  // safest possible list — the POS.
  const role = cashier?.role;
  const visibleNavItems = allNavItems.filter((item) =>
    canAccessNav(role, item.id),
  );

  function handleLogout() {
    logout();
    setOpen(false);
    router.replace("/login");
  }

  function handleNav(id: NavKey) {
    onChange(id);
    setOpen(false);
  }

  function handleSettings() {
    onOpenSettings();
    setOpen(false);
  }

  return (
    <>
      {/* Backdrop — mobile only, blocks interaction with the page
          underneath and closes the drawer on click. */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      />

      <aside
        className={cn(
          // Mobile: fixed slide-in drawer
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex-col p-4 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
          // Desktop: in-flow sidebar, always visible
          "lg:static lg:translate-x-0 lg:w-64 lg:max-w-none lg:flex lg:transition-none",
        )}
      >
        <div className="glass flex h-full flex-col rounded-3xl p-5">
          {/* Logo + close (mobile) */}
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex min-w-0 items-center gap-3">
              <div className="brand-bg flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-bold">
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
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-1.5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
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
            {/* Branding settings are only exposed to admins. */}
            {hasCapability(role, "manageBranding") ? (
              <button
                type="button"
                onClick={handleSettings}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Settings className="h-5 w-5" />
                Branding
              </button>
            ) : null}
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
    </>
  );
}

// Re-export so the pos-shell that builds the URL from a nav id
// doesn't have to import NAV_PATHS separately.
export { NAV_PATHS };
