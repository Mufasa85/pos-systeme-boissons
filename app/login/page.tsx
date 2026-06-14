"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  UserCircle2,
  Wine,
} from "lucide-react";

import { ApiError } from "@/lib/api";
import { useAuth, useAuthReady } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ============================================================
// JOAC — Login page
//
// Two-column layout:
//   • Left  : branded "welcome" panel with ambient gradient
//   • Right : the actual sign-in form
//
// On mobile the left panel collapses (the form is shown full
// width with the brand mark above the form).
//
// Security notes
// --------------
// • The form is `method="post"` with `e.preventDefault()` so the
//   code + password NEVER land in the URL as query params,
//   even if React hydration is delayed.
// • The "next" redirect is stored in `sessionStorage` instead
//   of a `?next=` query param. That avoids leaking the user's
//   intended destination into the URL bar / history /
//   referrer / server logs.
// • `safeRedirectPath()` rejects anything that isn't a
//   same-origin relative path, closing the open-redirect hole.
// ============================================================

const NEXT_PATH_STORAGE_KEY = "pos-brikin:auth-next-path";

/**
 * Reads the "where to go after login" path from sessionStorage.
 * Returns "/" if nothing is stored or the stored value isn't
 * a safe same-origin path.
 */
function readNextPath(): string {
  if (typeof window === "undefined") return "/";
  try {
    const raw = window.sessionStorage.getItem(NEXT_PATH_STORAGE_KEY);
    if (!raw) return "/";
    return safeRedirectPath(raw);
  } catch {
    return "/";
  }
}

/** Writes the post-login destination to sessionStorage. */
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
    // sessionStorage may be disabled (private mode, etc.) — fail
    // silently, the user will just land on the default page.
  }
}

function clearNextPath() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(NEXT_PATH_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Returns `path` if it's a safe same-origin relative URL,
 * otherwise returns the default "/". Rejects absolute URLs
 * (`http://…`, `//evil.com/…`, `javascript:…`) and any string
 * that would resolve outside the app.
 */
function safeRedirectPath(path: string | null | undefined): string {
  if (!path || typeof path !== "string") return "/";
  // Trim whitespace and forbid protocol-relative URLs.
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return "/";
  // `//foo` would be protocol-relative (e.g. //evil.com) and
  // `/\foo` is a normal in-app path. Reject the double-slash.
  if (trimmed.startsWith("//")) return "/";
  return trimmed;
}

export default function LoginPage() {
  const router = useRouter();
  const { status, login } = useAuth();
  const ready = useAuthReady();

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the user is already authenticated, send them to their
  // intended destination (or the POS as a default).
  useEffect(() => {
    if (ready && status === "authenticated") {
      router.replace(readNextPath());
    }
  }, [ready, status, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    // Defense in depth: even before React reads the form, the
    // browser won't append code/password to the URL because
    // method="post" + this preventDefault() short-circuits any
    // native submission path.
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const trimmedCode = code.trim();
    if (!trimmedCode || !password) {
      setError("Veuillez saisir votre code et votre mot de passe.");
      return;
    }

    try {
      setSubmitting(true);

      await login(trimmedCode, password);

      // Wipe the code/password from the DOM state and route the
      // user to the page they originally wanted.
      setCode("");
      setPassword("");
      const next = readNextPath();
      clearNextPath();
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Identifiants invalides.");
      } else {
        setError("Impossible de joindre le serveur. Vérifiez votre connexion.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Ambient backdrop — soft gradient mesh tinted with the brand color.
          Kept pointer-events-none so it never blocks the form. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 15% 25%, color-mix(in srgb, var(--brand) 35%, transparent) 0%, transparent 70%)," +
            "radial-gradient(45% 45% at 85% 80%, color-mix(in srgb, var(--brand-secondary) 70%, transparent) 0%, transparent 70%)," +
            "radial-gradient(80% 80% at 50% 120%, color-mix(in srgb, var(--brand) 18%, transparent) 0%, transparent 60%)",
        }}
      />
      {/* Subtle grid overlay for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px)," +
            "linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />

      <div className="grid min-h-screen w-full lg:grid-cols-[1.05fr_1fr]">
        {/* ---------------- Left : Brand panel ---------------- */}
        <aside className="relative hidden flex-col justify-between p-10 lg:flex">
          <div className="flex items-center gap-3">
            <div
              className="brand-bg flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-bold shadow-lg"
              style={{ boxShadow: "0 12px 30px -10px var(--brand)" }}
            >
              <Wine className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight">JOAC</p>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Specialty drinks & more
              </p>
            </div>
          </div>

          <div className="max-w-md space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Connexion sécurisée
            </div>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight">
              Bienvenue chez <span className="brand-text">JOAC</span>.
              <br />
              Heureux de vous revoir.
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Connectez-vous avec votre code caissier pour accéder à la caisse,
              au tableau de bord et à la gestion du stock.
            </p>

            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
                Point de vente en temps réel
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
                Suivi des stocks et des ventes
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
                Devise USD affichée · facture en FC
              </li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} JOAC — 03 Avenue Mbiloa / Ngaliema ·
            Kinshasa
          </p>
        </aside>

        {/* ---------------- Right : Sign-in form ---------------- */}
        <main className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            {/* Mobile brand mark */}
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="brand-bg flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold">
                <Wine className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">JOAC</p>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Specialty drinks & more
                </p>
              </div>
            </div>

            <div className="glass-strong relative overflow-hidden rounded-3xl p-7 sm:p-9">
              {/* Decorative glow */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-3xl"
                style={{
                  background:
                    "color-mix(in srgb, var(--brand) 35%, transparent)",
                }}
              />

              <div className="relative space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Connexion caissier
                </p>
                <h2 className="text-2xl font-bold tracking-tight">
                  Se connecter
                </h2>
                <p className="text-sm text-muted-foreground">
                  Entrez votre code et votre mot de passe pour continuer.
                </p>
              </div>

              <form
                onSubmit={onSubmit}
                className="relative mt-7 space-y-5"
                // Force a real POST so the code + password can
                // NEVER be appended to the URL as query params
                // (the native form action with no method would
                // default to GET). Combined with e.preventDefault
                // above, this guarantees credentials travel in
                // the request body, not the address bar.
                method="post"
                action="javascript:void(0)"
                autoComplete="on"
                noValidate
              >
                <div className="space-y-2">
                  <label
                    htmlFor="code"
                    className="text-sm font-medium text-foreground/80"
                  >
                    Code caissier
                  </label>
                  <div className="relative">
                    <UserCircle2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="code"
                      name="code"
                      type="text"
                      autoComplete="username"
                      autoFocus
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Ex. AF666"
                      disabled={submitting}
                      spellCheck={false}
                      className="h-12 rounded-2xl border-transparent bg-muted/60 pl-11 text-sm tracking-wider focus-visible:ring-2"
                      style={{ outlineColor: "var(--brand)" }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-foreground/80"
                  >
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={submitting}
                      className="h-12 rounded-2xl border-transparent bg-muted/60 pl-11 pr-11 text-sm focus-visible:ring-2"
                      style={{ outlineColor: "var(--brand)" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      tabIndex={-1}
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error ? (
                  <div
                    role="alert"
                    className={cn(
                      "flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm",
                      "border-destructive/30 bg-destructive/5 text-destructive",
                    )}
                  >
                    <KeyRound className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full rounded-2xl text-sm font-semibold"
                  style={{
                    background: "var(--brand)",
                    color: "var(--brand-foreground)",
                  }}
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connexion…
                    </span>
                  ) : (
                    "Se connecter"
                  )}
                </Button>

                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  Besoin d'aide ? Contactez le{" "}
                  <span className="font-semibold text-foreground">manager</span>{" "}
                  ou l'administrateur système.
                </p>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              API:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                {process.env.NEXT_PUBLIC_API_BASE_URL ||
                  "http://localhost:4000/api"}
              </code>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Lets the rest of the app (AuthGuard, etc.) record the
 * user's intended destination without touching the URL.
 */
export function rememberNextPath(path: string) {
  writeNextPath(path);
}
