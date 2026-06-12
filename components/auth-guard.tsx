"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";

import { useAuth, useAuthReady } from "@/components/auth-provider";

// ============================================================
// AuthGuard — protects client-side routes that require a
// logged-in cashier. While the AuthProvider is hydrating we
// show a neutral loader to avoid flashing the login page
// for users that have a valid persisted session.
//
// Usage:
//   <AuthGuard> ... </AuthGuard>
//
// The guard is *not* a security boundary on the server —
// that requires a real session cookie. It simply redirects
// unauthenticated clients to the login page.
// ============================================================

export function AuthGuard({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const ready = useAuthReady();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (status === "unauthenticated") {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }
  }, [ready, status, router, pathname]);

  // Hydration in progress — show a neutral loader.
  if (!ready) {
    return <FullScreenLoader label="Chargement…" />;
  }

  // Authenticated or in transition.
  if (status === "authenticated") {
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
