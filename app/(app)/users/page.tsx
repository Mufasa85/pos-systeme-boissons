"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  UploadCloud,
  User as UserIcon,
  UserX,
  X,
} from "lucide-react";
import { PosShell } from "@/components/pos-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ApiError,
  createCashier,
  deleteCashier,
  fetchCashiers,
  updateCashier,
  uploadImage,
  type Cashier,
  type CashierPayload,
} from "@/lib/api";
import { cn } from "@/lib/utils";

// ============================================================
// Users page — full CRUD over the `cashiers` table.
//
// "Users" in this app are the cashiers / managers / admins that
// log in to the POS. The backend exposes /api/cashiers (CRUD
// + login). The page mirrors the design language of the Stock
// page: glass cards, modal dialog, optimistic list updates,
// and visible success / error feedback.
// ============================================================

type Role = Cashier["role"];

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "cashier", label: "Caissier" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Administrateur" },
];

const defaultForm: CashierPayload & { isActive: boolean; avatarUrl: string } = {
  code: "",
  fullName: "",
  email: "",
  phone: "",
  role: "cashier",
  password: "",
  isActive: true,
  avatarUrl: "",
};

function roleBadgeClass(role: Role) {
  switch (role) {
    case "admin":
      return "bg-violet-500/15 text-violet-700 dark:text-violet-300";
    case "manager":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
    default:
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
  }
}

function roleIcon(role: Role) {
  if (role === "admin") return ShieldCheck;
  if (role === "manager") return Shield;
  return UserIcon;
}

function roleLabel(role: Role) {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

// Resolve a (possibly relative) avatar path coming from the API
// into an absolute URL the browser can load. Mirrors the logic
// in `app/(app)/stock/page.tsx` for product images.
function resolveAvatarUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const base =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL) ||
    "";
  if (!base) return path;
  if (path.startsWith("/")) {
    try {
      return new URL(base).origin + path;
    } catch {
      return path;
    }
  }
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function UsersPage() {
  const [users, setUsers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all");
  const [showInactive, setShowInactive] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ------- Avatar upload state -------
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ------- Avatar preview handling -------
  // Whenever the user picks a new avatar file, create a local
  // object URL so the preview updates immediately. We revoke
  // the previous URL on cleanup to avoid leaking memory.
  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  // ---------- Data loading ----------

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchCashiers({ includeInactive: true });
      setUsers(rows);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Impossible de charger les utilisateurs.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- Derived data ----------

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => (showInactive ? true : u.isActive))
      .filter((u) => (roleFilter === "all" ? true : u.role === roleFilter))
      .filter((u) => {
        if (q === "") return true;
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.code.toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.phone ?? "").toLowerCase().includes(q)
        );
      });
  }, [users, query, roleFilter, showInactive]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const inactive = total - active;
    const admins = users.filter((u) => u.role === "admin").length;
    const managers = users.filter((u) => u.role === "manager").length;
    return { total, active, inactive, admins, managers };
  }, [users]);

  // ---------- Form helpers ----------

  function resetForm() {
    setEditingId(null);
    setForm({ ...defaultForm });
    setFormError(null);
    setAvatarFile(null);
    setUploadProgress(null);
  }

  function closeDialog() {
    setDialogOpen(false);
    resetForm();
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(user: Cashier) {
    setEditingId(user.id);
    setForm({
      code: user.code,
      fullName: user.fullName,
      email: user.email ?? "",
      phone: user.phone ?? "",
      role: user.role,
      password: "",
      isActive: user.isActive,
      avatarUrl: user.avatarUrl ?? "",
    });
    setFormError(null);
    setAvatarFile(null);
    setDialogOpen(true);
  }

  // ---------- Avatar file handling ----------

  function pickAvatarFile() {
    fileInputRef.current?.click();
  }

  function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Le fichier doit être une image (jpg, png, webp, …).");
      return;
    }
    setFormError(null);
    setAvatarFile(file);
  }

  function clearAvatarFile() {
    setAvatarFile(null);
    setForm((prev) => ({ ...prev, avatarUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadAvatarIfNeeded(): Promise<string | undefined> {
    if (!avatarFile) return undefined;
    setUploadProgress(0);
    try {
      const result = await uploadImage(avatarFile, (percent) => {
        setUploadProgress(percent);
      });
      setUploadProgress(null);
      return result.url;
    } catch (err) {
      setUploadProgress(null);
      const message =
        err instanceof ApiError
          ? err.message
          : "Échec de l'upload de la photo.";
      throw new Error(message);
    }
  }

  // ---------- Delete / toggle ----------

  async function handleDelete(user: Cashier) {
    if (deletingId === user.id) return;
    if (!window.confirm(`Supprimer définitivement « ${user.fullName} » ?`)) {
      return;
    }
    setDeletingId(user.id);
    setFormError(null);
    try {
      await deleteCashier(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setSuccessMessage(`« ${user.fullName} » a été supprimé.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Impossible de supprimer cet utilisateur.";
      setFormError(message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleActive(user: Cashier) {
    setFormError(null);
    try {
      const updated = await updateCashier(user.id, {
        isActive: !user.isActive,
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setSuccessMessage(
        updated.isActive
          ? `« ${updated.fullName} » a été réactivé.`
          : `« ${updated.fullName} » a été désactivé.`,
      );
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Impossible de modifier le statut de cet utilisateur.";
      setFormError(message);
    }
  }

  // ---------- Submit ----------

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setFormError(null);

    const code = form.code.trim();
    const fullName = form.fullName.trim();
    if (!code) {
      setFormError("Le code est obligatoire.");
      return;
    }
    if (!fullName) {
      setFormError("Le nom complet est obligatoire.");
      return;
    }
    if (editingId === null && !form.password) {
      setFormError(
        "Le mot de passe est obligatoire pour un nouvel utilisateur.",
      );
      return;
    }

    setSaving(true);
    try {
      // 1. Upload the avatar first if a new file was picked.
      let avatarUrl: string | null = form.avatarUrl?.trim() || null;
      try {
        const uploaded = await uploadAvatarIfNeeded();
        if (uploaded) avatarUrl = uploaded;
      } catch (err) {
        setSaving(false);
        setFormError(err instanceof Error ? err.message : "Échec de l'upload.");
        return;
      }

      if (editingId !== null) {
        const payload: Partial<CashierPayload> = {
          code,
          fullName,
          email: form.email?.trim() || null,
          phone: form.phone?.trim() || null,
          role: form.role,
          isActive: form.isActive,
          avatarUrl,
        };
        if (form.password) payload.password = form.password;
        const updated = await updateCashier(editingId, payload);
        setUsers((prev) => prev.map((u) => (u.id === editingId ? updated : u)));
        setSuccessMessage(`« ${updated.fullName} » a été mis à jour.`);
      } else {
        const payload: CashierPayload = {
          code,
          fullName,
          email: form.email?.trim() || null,
          phone: form.phone?.trim() || null,
          role: form.role,
          password: form.password,
          isActive: form.isActive,
          avatarUrl,
        };
        const created = await createCashier(payload);
        setUsers((prev) => [created, ...prev]);
        setSuccessMessage(`« ${created.fullName} » a été créé.`);
      }
      setTimeout(() => setSuccessMessage(null), 3000);
      closeDialog();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Impossible d'enregistrer l'utilisateur.";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PosShell active="users" title="Utilisateurs">
      {/* Top action bar */}
      <div className="glass mb-4 rounded-3xl p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Gestion des utilisateurs</p>
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Synchronisation avec l'API…"
                : `${stats.total} utilisateurs · ${stats.active} actifs`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
              Recharger
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={openCreate}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Nouvel utilisateur
            </Button>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Actifs" value={stats.active} tone="emerald" />
        <StatCard label="Managers" value={stats.managers} tone="amber" />
        <StatCard label="Admins" value={stats.admins} tone="violet" />
      </div>

      {successMessage ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {successMessage}
        </div>
      ) : null}

      {formError ? (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      {/* Filters */}
      <div className="glass mb-4 flex flex-col gap-3 rounded-3xl p-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2 rounded-2xl bg-muted/40 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (nom, code, email, téléphone)…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-2xl bg-muted/40 p-1">
            {(
              [
                { value: "all", label: "Tous" },
                { value: "cashier", label: "Caissiers" },
                { value: "manager", label: "Managers" },
                { value: "admin", label: "Admins" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRoleFilter(opt.value as "all" | Role)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors",
                  roleFilter === opt.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-2xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-3.5 w-3.5 accent-current"
            />
            Inclure désactivés
          </label>
        </div>
      </div>

      {/* List */}
      {error ? (
        <div className="glass flex flex-col items-center gap-3 rounded-3xl p-10 text-center text-sm text-muted-foreground">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-semibold text-foreground">
            Utilisateurs indisponibles
          </p>
          <p className="max-w-sm">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Réessayer
          </button>
        </div>
      ) : (
        <div className="glass-strong rounded-3xl p-5">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold">Liste des utilisateurs</p>
            <p className="text-xs text-muted-foreground">
              {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
            </p>
          </div>

          {loading && users.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-2xl bg-muted/40"
                  aria-hidden
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
              Aucun utilisateur ne correspond à votre recherche.
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((u) => {
                const RoleIcon = roleIcon(u.role);
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-2xl bg-muted/40 p-2"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card ring-1 ring-border">
                      {u.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolveAvatarUrl(u.avatarUrl)}
                          alt={u.fullName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="brand-soft flex h-full w-full items-center justify-center text-sm font-semibold">
                          {initialsOf(u.fullName) || (
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          {u.fullName}
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            roleBadgeClass(u.role),
                          )}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {roleLabel(u.role)}
                        </span>
                        {!u.isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                            <UserX className="h-3 w-3" /> Désactivé
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {u.code}
                        {u.email ? ` · ${u.email}` : ""}
                        {u.phone ? ` · ${u.phone}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => openEdit(u)}
                        aria-label="Modifier l'utilisateur"
                        title="Modifier l'utilisateur"
                        className="sm:size-auto sm:gap-2 sm:px-2.5"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Modifier</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        disabled={deletingId === u.id}
                        onClick={() => handleDelete(u)}
                        aria-label="Supprimer l'utilisateur"
                        title="Supprimer l'utilisateur"
                        className="sm:size-auto sm:gap-2 sm:px-2.5"
                      >
                        {deletingId === u.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline">Supprimer</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}
      >
        <DialogContent className="flex h-[90dvh] max-h-[90dvh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-xl">
          <DialogHeader className="shrink-0 p-6 pb-4">
            <DialogTitle>
              {editingId !== null
                ? "Modifier l'utilisateur"
                : "Nouvel utilisateur"}
            </DialogTitle>
            <DialogDescription>
              {editingId !== null
                ? "Mets à jour les informations de ce membre de l'équipe. Laisse le mot de passe vide pour le conserver."
                : "Crée un nouveau compte pour un caissier, un manager ou un administrateur."}
            </DialogDescription>
          </DialogHeader>

          <form
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0"
            onSubmit={handleSubmit}
          >
            {/* ============================================================
                AVATAR UPLOAD (full-width on both mobile and desktop)
                ============================================================ */}
            <section className="md:col-span-2 space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Photo de profil
              </Label>
              <div className="flex flex-col items-stretch gap-4 rounded-2xl border border-border bg-background p-4 shadow-sm sm:flex-row sm:items-center">
                <div className="relative mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-border bg-muted/30 sm:mx-0">
                  {avatarPreview || form.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview ?? resolveAvatarUrl(form.avatarUrl)}
                      alt="Aperçu avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <UserIcon className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onAvatarChange}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={pickAvatarFile}
                      className="gap-2"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      {avatarFile || form.avatarUrl
                        ? "Changer la photo"
                        : "Téléverser une photo"}
                    </Button>
                    {avatarFile || form.avatarUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearAvatarFile}
                        className="gap-2 text-muted-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                        Retirer
                      </Button>
                    ) : null}
                  </div>
                  {avatarFile ? (
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {avatarFile.name}
                      </span>{" "}
                      · {(avatarFile.size / 1024).toFixed(1)} Ko
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Optionnel. PNG, JPG ou WebP. Affichée dans la barre
                      supérieure et la liste des utilisateurs.
                    </p>
                  )}
                  {uploadProgress !== null ? (
                    <div className="space-y-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full brand-bg transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Upload {uploadProgress}%
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <div className="space-y-2">
              <label
                htmlFor="user-code"
                className="text-sm font-medium text-muted-foreground"
              >
                Code
              </label>
              <input
                id="user-code"
                value={form.code}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, code: e.target.value }))
                }
                placeholder="Ex. BRIK001"
                required
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="user-fullname"
                className="text-sm font-medium text-muted-foreground"
              >
                Nom complet
              </label>
              <input
                id="user-fullname"
                value={form.fullName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fullName: e.target.value }))
                }
                placeholder="Ex. Marie Kalume"
                required
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="user-email"
                className="text-sm font-medium text-muted-foreground"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="user-email"
                  type="email"
                  value={form.email ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="marie@pos.brikin"
                  className="w-full rounded-2xl border border-border bg-background py-3 pl-9 pr-4 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="user-phone"
                className="text-sm font-medium text-muted-foreground"
              >
                Téléphone
              </label>
              <input
                id="user-phone"
                value={form.phone ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+243 …"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="user-role"
                className="text-sm font-medium text-muted-foreground"
              >
                Rôle
              </label>
              <select
                id="user-role"
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    role: e.target.value as Role,
                  }))
                }
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="user-password"
                className="text-sm font-medium text-muted-foreground"
              >
                Mot de passe
                {editingId !== null ? (
                  <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    (optionnel)
                  </span>
                ) : null}
              </label>
              <input
                id="user-password"
                type="password"
                value={form.password ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
                placeholder={
                  editingId !== null
                    ? "Laisser vide pour ne pas changer"
                    : "Minimum 6 caractères"
                }
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            {editingId !== null ? (
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Statut
                </label>
                <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-3">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, isActive: true }))
                    }
                    className={cn(
                      "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                      form.isActive
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Actif
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, isActive: false }))
                    }
                    className={cn(
                      "flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                      !form.isActive
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Désactivé
                  </button>
                </div>
              </div>
            ) : null}

            {formError ? (
              <div
                role="alert"
                className="md:col-span-2 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}
          </form>

          <DialogFooter className="shrink-0 flex flex-col-reverse gap-2 border-t border-border bg-muted/30 p-4 sm:flex-row sm:justify-end sm:gap-2 sm:border-0 sm:bg-transparent sm:p-6">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={saving}
              className="sm:order-1"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={saving} className="sm:order-2">
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {avatarFile ? "Upload + enregistrement…" : "Enregistrement…"}
                </span>
              ) : editingId !== null ? (
                "Enregistrer les modifications"
              ) : (
                "Créer l'utilisateur"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PosShell>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "emerald" | "amber" | "violet";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-300"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-300"
        : tone === "violet"
          ? "text-violet-600 dark:text-violet-300"
          : "text-foreground";
  return (
    <div className="glass rounded-3xl p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-bold", toneClass)}>{value}</p>
    </div>
  );
}
