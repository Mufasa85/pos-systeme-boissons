"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";

import { useAuth, useAuthReady } from "@/components/auth-provider";
import { canAccessNav, PATH_TO_NAV, type NavKey } from "@/lib/permissions";

const NEXT_PATH_STORAGE_KEY = "pos-brikin:auth-next-path";

// ============================================================
// AuthGuard — protects client-side routes that require a
// logged-in cashier. While the AuthProvider is hydrating we
// show a neutral loader to avoid flashing the login page
// for users that have a valid persisted session.
//
// The guard is *not* a security boundary on the server —
// that requires a real session cookie. It simply redirects
// unauthenticated clients to the login page, and routes
// the user away from a page they don't have permission
// to access (e.g. a cashier trying to open /users directly).
//
// Security notes
// --------------
// • When the guard bounces an unauthenticated user, the
//   intended destination is stored in `sessionStorage`
//   instead of a `?next=` query param. That keeps the URL
//   bar / history / referrer / server logs clean of
//   anything user-specific.
// • A strict `safeRedirectPath` filter is applied so an
//   attacker can't craft a URL like `/login?next=//evil.com`
//   to bounce the user to an external domain after login.
// ============================================================

/** Safely resolve the current pathname to a nav key, if any. */
function pathToNavKey(pathname: string | null): NavKey | null {
  if (!pathname) return null;
  // Exact match first.
  if (pathname in PATH_TO_NAV) {
    return PATH_TO_NAV[pathname];
  }
  // Fallback: the longest matching prefix wins. Useful for
  // nested routes like /users/42.
  let bestKey: NavKey | null = null;
  let bestLen = -1;
  for (const [path, key] of Object.entries(PATH_TO_NAV)) {
    if (path !== "/" && pathname.startsWith(path) && path.length > bestLen) {
      bestKey = key;
      bestLen = path.length;
    }
  }
  return bestKey;
}

function safeRedirectPath(path: string | null | undefined): string {
  if (!path || typeof path !== "string") return "/";
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return "/";
  if (trimmed.startsWith("//")) return "/";
  return trimmed;
}

function writeNextPath(path: string) {
  if (typeof window === "undefined") return;
  try {
    const safe = safeRedirectPath(path);
    if (safe === "/") {
      window.sessionStorage.removeItem(NEXT_PATH_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(NEXT_PATH_STORAGE_KEY, safe);
    }
  } catch {
    // sessionStorage may be disabled — fail silently.
  }
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const { status, cashier } = useAuth();
  const ready = useAuthReady();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (status === "unauthenticated") {
      // Remember where the user was trying to go, then
      // send them to the login screen — without leaking
      // the destination into the URL.
      if (pathname) writeNextPath(pathname);
      router.replace("/login");
    }
  }, [ready, status, router, pathname]);

  // Hydration in progress — show a neutral loader.
  if (!ready) {
    return <FullScreenLoader label="Chargement…" />;
  }

  if (status === "authenticated") {
    // Role-based access: if the current route is not in the
    // cashier's allow-list, send them to the safest default
    // (the POS) and show a "denied" screen until the redirect
    // happens.
    const navKey = pathToNavKey(pathname);
    if (navKey && !canAccessNav(cashier?.role, navKey)) {
      // Defer the redirect to the next paint so the user
      // gets a visible explanation first.
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          router.replace("/");
        }, 1500);
      }
      return <ForbiddenScreen role={cashier?.role} />;
    }
    return <>{children}</>;
  }

  // Will redirect as soon as the effect runs.
  return <FullScreenLoader label="Redirection…" />;
}

function FullScreenLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}

function ForbiddenScreen({ role }: { role?: string | undefined }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
      <div className="glass-strong flex max-w-sm flex-col items-center gap-3 rounded-3xl p-8 text-center">
        <ShieldAlert className="h-8 w-8 text-destructive" />
        <h2 className="text-lg font-semibold">Accès refusé</h2>
        <p className="text-sm text-muted-foreground">
          {role
            ? `Votre rôle (${role}) ne vous donne pas accès à cette page.`
            : "Vous n'avez pas les droits nécessaires pour accéder à cette page."}
        </p>
        <p className="text-xs text-muted-foreground">
          Redirection vers le point de vente…
        </p>
      </div>
    </div>
  );
}

/**
 * UnauthenticatedGuard — inverse of AuthGuard. Renders its
 * children only when the user is *not* authenticated. Useful
 * on the login page to bounce already-logged-in users.
 */
export function UnauthenticatedGuard({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const ready = useAuthReady();

  if (!ready) {
    return <FullScreenLoader label="Chargement…" />;
  }
  if (status === "unauthenticated") return <>{children}</>;
  // Will redirect from the login page effect.
  return <FullScreenLoader label="Redirection…" />;
}

/**
 * A small inline lock screen used by client components that
 * have been rendered without the guard (e.g. a wrong import).
 */
export function LockedScreen() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6">
      <div className="glass-strong flex max-w-sm flex-col items-center gap-3 rounded-3xl p-8 text-center">
        <ShieldAlert className="h-8 w-8 text-destructive" />
        <h2 className="text-lg font-semibold">Session requise</h2>
        <p className="text-sm text-muted-foreground">
          Vous devez être connecté pour accéder à cette page.
        </p>
      </div>
    </div>
  );
}
