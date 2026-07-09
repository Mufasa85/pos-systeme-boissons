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
  DollarSign,
  Edit3,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Ruler,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import Image from "next/image";
import { PosShell } from "@/components/pos-shell";
import { Button } from "@/components/ui/button";

// Resolve a (possibly relative) image path coming from the API into
// an absolute URL the browser can load. The API stores `imageUrl`
// as a path like `/uploads/drinks/xxx.jpg`; we prepend the API
// origin (read from `NEXT_PUBLIC_API_BASE_URL`) so the <img>
// resolves to the real cloudflare / localhost server.
function resolveImageUrl(path: string | null | undefined): string {
  if (!path) return "/drinks/placeholder.png";
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
  createProduct,
  deleteProduct,
  updateProduct,
  uploadProductImage,
  type ApiCategory,
  type ApiProduct,
} from "@/lib/api";
import { useCatalog } from "@/lib/use-catalog";
import { cn } from "@/lib/utils";

// ----------------------------------------------------------------
// Stock form shape (front-end local). `category` is a *slug*
// (`CategoryId` like "whiskies", "vins", …) because the rest of
// the front-end uses slugs to filter and label products. The
// slug → `categoryId` (numeric) translation happens at submit
// time using the API categories list.
// ----------------------------------------------------------------

const FALLBACK_FORM_CATEGORY = "all" as const;

type StockForm = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  popularity: number;
  sizes: string;
};

const defaultForm: StockForm = {
  id: "",
  name: "",
  description: "",
  price: 0,
  category: FALLBACK_FORM_CATEGORY,
  image: "/drinks/placeholder.png",
  stock: 0,
  popularity: 0,
  sizes: "S,M,L",
};

function parseSizes(raw: string) {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export default function StockPage() {
  // `apiCategories` is the raw API list (with `id` and `slug`)
  // — what we need to map the form's slug → numeric `categoryId`.
  const { apiProducts, apiCategories, drinks, loading, error, refetch } =
    useCatalog();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [form, setForm] = useState<StockForm>({ ...defaultForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync the API catalog into local editable state. We use the
  // raw API products (not the local mapped `drinks`) so the table
  // has access to `categoryId`, `imageUrl`, `stockQuantity` etc.
  useEffect(() => {
    setProducts(apiProducts);
  }, [apiProducts]);

  const low = useMemo(
    () => products.filter((d) => d.stockQuantity <= 15),
    [products],
  );
  const categoryOptions = useMemo(
    () => apiCategories.filter((category) => category.slug !== "all"),
    [apiCategories],
  );

  // The dropdown must always have a valid value — pick the first
  // available API category as the default slug when the form is
  // reset.
  const firstCategorySlug = categoryOptions[0]?.slug ?? FALLBACK_FORM_CATEGORY;

  // ------- Image preview handling -------
  // Whenever the user picks a file, we create a local object URL
  // so the preview updates immediately. We revoke the previous URL
  // on cleanup to avoid leaking memory.
  useEffect(() => {
    if (!imageFile) {
      setImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function resetForm() {
    setEditingId(null);
    setForm({ ...defaultForm, category: firstCategorySlug });
    setFormError(null);
    setImageFile(null);
    setUploadProgress(null);
  }

  function closeDialog() {
    setDialogOpen(false);
    resetForm();
  }

  function handleEdit(product: ApiProduct) {
    setEditingId(product.id);
    setForm({
      id: String(product.id),
      name: product.name,
      description: product.description ?? "",
      price: Number(product.price) || 0,
      category:
        product.category?.slug ??
        categoryOptions.find((c) => c.id === product.categoryId)?.slug ??
        firstCategorySlug,
      image: resolveImageUrl(product.imageUrl) || "/drinks/placeholder.png",
      stock: product.stockQuantity ?? 0,
      popularity: product.popularity ?? 0,
      sizes: (product.sizes ?? []).map((s) => s.label).join(", "),
    });
    setImageFile(null);
    setUploadProgress(null);
    setDialogOpen(true);
  }

  async function handleDelete(id: number) {
    if (deletingId === id) return;
    setDeletingId(id);
    setFormError(null);
    try {
      await deleteProduct(id);
      setProducts((prev) => prev.filter((product) => product.id !== id));
      if (editingId === id) {
        closeDialog();
      }
      setSuccessMessage("Produit supprimé avec succès.");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Impossible de supprimer ce produit.";
      setFormError(message);
    } finally {
      setDeletingId(null);
    }
  }

  function pickImageFile() {
    fileInputRef.current?.click();
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Le fichier doit être une image (jpg, png, webp, …).");
      return;
    }
    setFormError(null);
    setImageFile(file);
  }

  function clearImageFile() {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadImageIfNeeded(): Promise<string | undefined> {
    if (!imageFile) return undefined;
    setUploadProgress(0);
    try {
      const result = await uploadProductImage(imageFile, (percent) => {
        setUploadProgress(percent);
      });
      setUploadProgress(null);
      return result.url;
    } catch (err) {
      setUploadProgress(null);
      const message =
        err instanceof ApiError ? err.message : "Échec de l'upload de l'image.";
      throw new Error(message);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setFormError(null);

    const name = form.name.trim();
    if (!name) {
      setFormError("Le nom du produit est obligatoire.");
      return;
    }
    const category = apiCategories.find((c) => c.slug === form.category);
    if (!category) {
      setFormError("Catégorie invalide. Recharge la page et réessaie.");
      return;
    }

    setSaving(true);
    try {
      // 1. Upload the image first if a new file was picked.
      let imageUrl: string | undefined = form.image;
      try {
        const uploaded = await uploadImageIfNeeded();
        if (uploaded) imageUrl = uploaded;
      } catch (err) {
        setSaving(false);
        setFormError(err instanceof Error ? err.message : "Échec de l'upload.");
        return;
      }

      const sizes = parseSizes(form.sizes).map((label) => ({
        label,
        priceExtra: 0,
      }));

      const payload = {
        name,
        description: form.description.trim() || "",
        price: Number(form.price) || 0,
        categoryId: category.id,
        imageUrl: imageUrl || "/drinks/placeholder.png",
        stockQuantity: Number(form.stock) || 0,
        popularidad: Number(form.popularity) || 0,
        isActive: true,
        sizes,
      };

      if (editingId !== null) {
        const updated = await updateProduct(editingId, payload);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingId ? updated : p)),
        );
        setSuccessMessage(`« ${updated.name} » mis à jour avec succès.`);
      } else {
        const created = await createProduct(payload);
        setProducts((prev) => [created, ...prev]);
        setSuccessMessage(`« ${created.name} » ajouté au catalogue.`);
      }

      // Force a refetch of the global catalog so the POS / Menu
      // pages see the change instantly.
      refetch();

      setTimeout(() => setSuccessMessage(null), 3000);
      closeDialog();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Impossible d'enregistrer le produit.";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  const previewSrc = imagePreview ?? form.image;

  return (
    <PosShell active="stock" title="Stock">
      <div className="glass mb-4 rounded-3xl p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Gestion des produits</p>
            <p className="text-xs text-muted-foreground">
              {loading
                ? "Synchronisation avec l'API…"
                : "Données chargées depuis l'API Express."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Recharger
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
              disabled={loading && drinks.length === 0}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Nouveau produit
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

      {error ? (
        <div className="glass flex flex-col items-center gap-3 rounded-3xl p-10 text-center text-sm text-muted-foreground">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="font-semibold text-foreground">Stock indisponible</p>
          <p className="max-w-sm">{error}</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Réessayer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="glass-strong lg:col-span-2 rounded-3xl p-5">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Liste d'inventaire</p>
                <p className="text-xs text-muted-foreground">
                  Mis à jour depuis l'API
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {products.length} produits en stock
              </p>
            </div>

            {loading && products.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-2xl bg-muted/40"
                    aria-hidden
                  />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-2xl bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                Aucun produit. Clique sur « Nouveau produit » pour commencer.
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((d) => {
                  const danger = d.stockQuantity <= 15;
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 rounded-2xl bg-muted/40 p-2"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-card">
                        {d.imageUrl ? (
                          <Image
                            src={resolveImageUrl(d.imageUrl)}
                            alt={d.name}
                            width={48}
                            height={48}
                            unoptimized
                            className="h-12 w-12 object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {d.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.category?.slug ?? d.categoryId} ·{" "}
                          {Number(d.price).toLocaleString("fr-CD")} FC · {d.stockQuantity} en
                          stock
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          onClick={() => handleEdit(d)}
                          aria-label="Modifier le produit"
                          title="Modifier le produit"
                          className="sm:size-auto sm:gap-2 sm:px-2.5"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Modifier</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon-sm"
                          disabled={deletingId === d.id}
                          onClick={() => handleDelete(d.id)}
                          aria-label="Supprimer le produit"
                          title="Supprimer le produit"
                          className="sm:size-auto sm:gap-2 sm:px-2.5"
                        >
                          {deletingId === d.id ? (
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

          <div className="glass rounded-3xl p-5">
            <p className="text-sm font-semibold">Stock bas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Produits ≤ 15 unités
            </p>
            <div className="mt-4 space-y-2">
              {low.length === 0 ? (
                <div className="rounded-2xl bg-muted/40 p-3 text-sm text-muted-foreground">
                  Tout va bien.
                </div>
              ) : (
                low.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-2xl bg-muted/40 p-3"
                  >
                    <p className="truncate text-sm font-semibold">{d.name}</p>
                    <p className="text-xs font-bold text-destructive">
                      {d.stockQuantity}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}
      >
        <DialogContent className="flex h-[90dvh] max-h-[90dvh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-3xl border shadow-lg p-0 sm:h-auto sm:max-h-[calc(100vh-1rem)] sm:max-w-3xl">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
            <DialogTitle>
              {editingId !== null ? "Modifier le produit" : "Nouveau produit"}
            </DialogTitle>
            <DialogDescription>
              Les modifications sont envoyées à l'API Express (table{" "}
              <code>products</code>). L'image est uploadée séparément sur{" "}
              <code>/api/uploads/image</code>.
            </DialogDescription>
          </DialogHeader>

          <form
            className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/20 px-5 py-4"
            onSubmit={handleSubmit}
          >
            {/* ============================================================
                CARD 1 — Image du produit
                ============================================================ */}
            <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <header className="mb-3 flex items-center gap-2">
                <span className="brand-soft flex h-8 w-8 items-center justify-center rounded-xl">
                  <ImageIcon className="brand-text h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Photo du produit</p>
                  <p className="text-[11px] text-muted-foreground">
                    JPEG, PNG ou WebP · affichée sur le POS et le menu
                  </p>
                </div>
              </header>

              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                <div
                  className="relative flex h-40 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-muted/30 sm:h-32 sm:w-32"
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer.files?.[0];
                    if (!file) return;
                    if (!file.type.startsWith("image/")) {
                      setFormError(
                        "Le fichier doit être une image (jpg, png, webp, …).",
                      );
                      return;
                    }
                    setFormError(null);
                    setImageFile(file);
                  }}
                >
                  {previewSrc ? (
                    previewSrc.startsWith("blob:") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewSrc}
                        alt="Aperçu"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={previewSrc}
                        alt="Aperçu"
                        fill
                        unoptimized
                        sizes="8rem"
                        className="object-cover"
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <UploadCloud className="h-7 w-7" />
                      <span className="text-[10px] uppercase tracking-wider">
                        Glisser / cliquer
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={pickImageFile}
                      className="gap-2"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      {imageFile ? "Changer l'image" : "Téléverser une image"}
                    </Button>
                    {imageFile ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearImageFile}
                        className="gap-2 text-muted-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                        Retirer
                      </Button>
                    ) : null}
                  </div>
                  {imageFile ? (
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {imageFile.name}
                      </span>{" "}
                      · {(imageFile.size / 1024).toFixed(1)} Ko
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Glisse une image ici ou utilise le bouton. L'URL est
                      envoyée à{" "}
                      <code className="rounded bg-muted px-1 py-0.5">
                        /api/uploads/image
                      </code>
                      .
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

            {/* ============================================================
                CARD 2 — Informations générales
                ============================================================ */}
            <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <header className="mb-3 flex items-center gap-2">
                <span className="brand-soft flex h-8 w-8 items-center justify-center rounded-xl">
                  <Tag className="brand-text h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Informations</p>
                  <p className="text-[11px] text-muted-foreground">
                    Nom, description et catégorie
                  </p>
                </div>
              </header>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="product-name"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Nom du produit
                  </label>
                  <div className="relative">
                    <Package className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="product-name"
                      value={form.name}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Ex. Hennessy VS"
                      required
                      className="h-11 w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="product-description"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Description
                  </label>
                  <div className="relative">
                    <FileText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <textarea
                      id="product-description"
                      value={form.description}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Description affichée dans le menu…"
                      rows={2}
                      className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label
                    htmlFor="product-category"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Catégorie
                  </label>
                  <div className="relative">
                    <Layers className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <select
                      id="product-category"
                      value={form.category}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          category: event.target.value,
                        }))
                      }
                      disabled={categoryOptions.length === 0}
                      className="h-11 w-full appearance-none rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-50"
                    >
                      {categoryOptions.length > 0 ? (
                        categoryOptions.map((category) => (
                          <option key={category.id} value={category.slug}>
                            {category.label}
                          </option>
                        ))
                      ) : (
                        <option value={FALLBACK_FORM_CATEGORY} disabled>
                          Chargement des catégories…
                        </option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* ============================================================
                CARD 3 — Prix, stock & tailles
                ============================================================ */}
            <section className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <header className="mb-3 flex items-center gap-2">
                <span className="brand-soft flex h-8 w-8 items-center justify-center rounded-xl">
                  <DollarSign className="brand-text h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Prix, stock </p>
                  <p className="text-[11px] text-muted-foreground">
                    Tarification, inventaire et variantes disponibles
                  </p>
                </div>
              </header>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="product-price"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Prix (FC)
                  </label>
                  <div className="relative">
                    <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="product-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          price: Number(event.target.value),
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="product-stock"
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Stock disponible
                  </label>
                  <div className="relative">
                    <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="product-stock"
                      type="number"
                      min="0"
                      value={form.stock}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          stock: Number(event.target.value),
                        }))
                      }
                      className="h-11 w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* ============================================================
                Erreur + bouton de soumission
                ============================================================ */}
            {formError ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}

            <div className="sticky bottom-0 -mx-5 border-t border-border bg-background px-5 py-3">
              <Button
                type="submit"
                className="h-12 w-full justify-center text-sm font-semibold shadow-sm"
                disabled={saving || categoryOptions.length === 0}
              >
                {saving ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {imageFile ? "Upload + enregistrement…" : "Enregistrement…"}
                  </span>
                ) : editingId !== null ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Enregistrer les modifications
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer le produit
                  </>
                )}
              </Button>
            </div>
          </form>

          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/40 px-5 py-3 sm:justify-end"></DialogFooter>
        </DialogContent>
      </Dialog>
    </PosShell>
  );
}
