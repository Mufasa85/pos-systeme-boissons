"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  FolderTree,
  Hash,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { PosShell } from "@/components/pos-shell";
import { Button } from "@/components/ui/button";
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
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
  type ApiCategory,
  type CategoryPayload,
} from "@/lib/api";
import { useCatalog } from "@/lib/use-catalog";
import { cn } from "@/lib/utils";

// ============================================================
// Categories page — full CRUD over the `categories` table.
//
// Categories are simple { id, label, slug } rows that drive the
// POS / Menu / Stock filters. Slugs are *unique* and used by the
// back-end to filter products, so the form auto-derives a slug
// from the label and validates it before submit.
// ============================================================

const defaultForm: CategoryPayload = { label: "", slug: "" };

// Convert a free-form string into a URL-friendly slug.
function toSlug(raw: string) {
  return (
    raw
      .toLowerCase()
      .normalize("NFD")
      // strip diacritics
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50)
  );
}

function initialsOf(label: string) {
  return (
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export default function CategoriesPage() {
  // The page owns its own editable list so that creates /
  // updates / deletes feel instant. The global `useCatalog`
  // hook is refetched on every successful mutation so the POS
  // and Menu pages see the new category immediately.
  const { refetch, apiCategories, apiProducts } = useCatalog();
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [formTouched, setFormTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ---------- Data loading ----------

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchCategories();
      setCategories(rows);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Impossible de charger les catégories.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Keep local state in sync with the shared catalog cache
    // (e.g. after the Stock page creates a new category and
    // refetches). We only update when the upstream list
    // *changes* to avoid clobbering optimistic updates.
    setCategories(apiCategories);
  }, [apiCategories]);

  useEffect(() => {
    if (apiCategories.length === 0 && !loading) {
      load();
    }
  }, [apiCategories.length, loading, load]);

  // ---------- Derived data ----------

  const productCountByCategory = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of apiProducts) {
      map.set(p.categoryId, (map.get(p.categoryId) ?? 0) + 1);
    }
    return map;
  }, [apiProducts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .filter((c) => c.slug !== "all")
      .filter((c) => {
        if (q === "") return true;
        return (
          c.label.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [categories, query]);

  // ---------- Form helpers ----------

  function resetForm() {
    setEditingId(null);
    setForm({ ...defaultForm });
    setFormTouched(false);
    setFormError(null);
  }

  function closeDialog() {
    setDialogOpen(false);
    resetForm();
  }

  function openCreate() {
    resetForm();
    setDialogOpen(true);
  }

  function openEdit(category: ApiCategory) {
    setEditingId(category.id);
    setForm({ label: category.label, slug: category.slug });
    setFormTouched(true);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleDelete(category: ApiCategory) {
    if (deletingId === category.id) return;
    const used = productCountByCategory.get(category.id) ?? 0;
    if (used > 0) {
      setFormError(
        `Impossible de supprimer « ${category.label} » : ${used} produit(s) l'utilisent encore.`,
      );
      return;
    }
    if (!window.confirm(`Supprimer la catégorie « ${category.label} » ?`)) {
      return;
    }
    setDeletingId(category.id);
    setFormError(null);
    try {
      await deleteCategory(category.id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      setSuccessMessage(`Catégorie « ${category.label} » supprimée.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      // Keep the shared cache fresh as well.
      refetch();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Impossible de supprimer cette catégorie.";
      setFormError(message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setFormError(null);

    const label = form.label.trim();
    if (!label) {
      setFormError("Le libellé est obligatoire.");
      return;
    }
    const slug = (form.slug || toSlug(label)).trim();
    if (!slug) {
      setFormError("Le slug est obligatoire.");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setFormError(
        "Le slug ne peut contenir que des lettres minuscules, chiffres et tirets.",
      );
      return;
    }
    // Client-side duplicate check — the API will reject too,
    // but showing the error here is friendlier.
    const duplicate = categories.find(
      (c) => c.slug === slug && c.id !== editingId,
    );
    if (duplicate) {
      setFormError(`Une catégorie utilise déjà le slug « ${slug} ».`);
      return;
    }

    setSaving(true);
    try {
      if (editingId !== null) {
        const updated = await updateCategory(editingId, { label, slug });
        setCategories((prev) =>
          prev.map((c) => (c.id === editingId ? updated : c)),
        );
        setSuccessMessage(`Catégorie « ${updated.label} » mise à jour.`);
      } else {
        const created = await createCategory({ label, slug });
        setCategories((prev) => [...prev, created]);
        setSuccessMessage(`Catégorie « ${created.label} » créée.`);
      }
      // Make sure the POS / Menu / Stock pages pick up the
      // change without a manual reload.
      refetch();
      setTimeout(() => setSuccessMessage(null), 3000);
      closeDialog();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Impossible d'enregistrer la catégorie.";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PosShell active="categories" title="Catégories">
      {/* Top action bar */}
      <div className="glass mb-4 rounded-3xl p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Gestion des catégories</p>
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Synchronisation avec l'API…"
                : `${filtered.length} catégorie${filtered.length > 1 ? "s" : ""} affichée${filtered.length > 1 ? "s" : ""} · ${categories.length} au total`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                load();
                refetch();
              }}
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
              <Plus className="h-4 w-4" /> Nouvelle catégorie
            </Button>
          </div>
        </div>
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
          className="mb-4 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      {/* Search */}
      <div className="glass mb-4 rounded-3xl p-4">
        <div className="flex flex-1 items-center gap-2 rounded-2xl bg-muted/40 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher (libellé ou slug)…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* List */}
      {error ? (
        <div className="glass flex flex-col items-center gap-3 rounded-3xl p-10 text-center text-sm text-muted-foreground">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-semibold text-foreground">
            Catégories indisponibles
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
      ) : loading && categories.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="glass h-28 animate-pulse rounded-3xl"
              aria-hidden
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">
          <FolderTree className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
          <p className="font-semibold text-foreground">Aucune catégorie</p>
          <p className="mt-1">
            Clique sur « Nouvelle catégorie » pour commencer à organiser ton
            catalogue.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const productCount = productCountByCategory.get(c.id) ?? 0;
            return (
              <div
                key={c.id}
                className="glass-strong flex flex-col gap-3 rounded-3xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="brand-bg flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
                    {initialsOf(c.label)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.label}</p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Hash className="h-3 w-3" />
                      <span className="font-mono">{c.slug}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">Produits</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                      productCount > 0
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {productCount}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(c)}
                    className="flex-1 gap-2"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Modifier
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingId === c.id}
                    onClick={() => handleDelete(c)}
                    className="gap-2"
                  >
                    {deletingId === c.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null
                ? "Modifier la catégorie"
                : "Nouvelle catégorie"}
            </DialogTitle>
            <DialogDescription>
              Le slug est utilisé pour identifier la catégorie dans l'API (ex.{" "}
              <code className="rounded bg-muted px-1">whiskies</code>).
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label
                htmlFor="category-label"
                className="text-sm font-medium text-muted-foreground"
              >
                Libellé
              </label>
              <input
                id="category-label"
                value={form.label}
                onChange={(e) => {
                  const nextLabel = e.target.value;
                  setForm((prev) => {
                    // Auto-derive the slug from the label *until*
                    // the user edits the slug manually — at which
                    // point we stop overriding their input.
                    const next: CategoryPayload = { ...prev, label: nextLabel };
                    if (!formTouched) next.slug = toSlug(nextLabel);
                    return next;
                  });
                }}
                placeholder="Ex. Whiskies"
                required
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="category-slug"
                className="text-sm font-medium text-muted-foreground"
              >
                Slug
              </label>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="category-slug"
                  value={form.slug}
                  onChange={(e) => {
                    setFormTouched(true);
                    setForm((prev) => ({ ...prev, slug: e.target.value }));
                  }}
                  placeholder="whiskies"
                  required
                  className="w-full rounded-2xl border border-border bg-background py-3 pl-9 pr-4 font-mono text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Lettres minuscules, chiffres et tirets uniquement. Généré
                automatiquement à partir du libellé.
              </p>
            </div>

            {formError ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full justify-center"
              disabled={saving}
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement…
                </span>
              ) : editingId !== null ? (
                "Enregistrer les modifications"
              ) : (
                "Créer la catégorie"
              )}
            </Button>
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={saving}
            >
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PosShell>
  );
}
