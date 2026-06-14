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
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  User as UserIcon,
  UserPlus,
  X,
} from "lucide-react";
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
  ApiCustomer,
  ApiError,
  createCustomer,
  fetchCustomers,
  type CustomerPayload,
} from "@/lib/api";
import { cn } from "@/lib/utils";

// ============================================================
// CustomerDialog — shown in the cart just before validating
// the sale. It lets the cashier:
//
//   • pick an existing customer (search/select from the DB)
//   • create a new customer on the fly
//   • skip the customer entirely (anonymous walk-in)
//
// On confirm, the dialog returns the resolved `ApiCustomer` (or
// `null` for anonymous). The parent uses that value to attach
// the customer to the order and to print their info on the
// final receipt.
// ============================================================

type Mode = "choose" | "select" | "create";

const defaultForm: CustomerPayload = {
  type: "person",
  name: "",
  phone: "",
  email: "",
  taxId: "",
  address: "",
};

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function CustomerDialog({
  open,
  onOpenChange,
  onConfirm,
  onSkip,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called when the cashier picked an existing customer or
   * just created a new one. The customer will be linked to
   * the order and shown on the printed invoice.
   */
  onConfirm: (customer: ApiCustomer) => void;
  /**
   * Called when the cashier wants to skip the customer step
   * (anonymous sale). Equivalent to `onConfirm(null)` from
   * the parent's point of view.
   */
  onSkip: () => void;
}) {
  const [mode, setMode] = useState<Mode>("choose");
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApiCustomer | null>(null);
  const [form, setForm] = useState<CustomerPayload>({ ...defaultForm });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset everything when the dialog opens / closes so the next
  // sale starts from a clean slate.
  useEffect(() => {
    if (open) {
      setMode("choose");
      setSearch("");
      setSelected(null);
      setForm({ ...defaultForm });
      setFormError(null);
      setError(null);
    }
  }, [open]);

  // Load the customer list the first time we switch to the
  // "select" tab. We don't preload on dialog open to keep the
  // initial render snappy.
  const loadCustomers = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchCustomers(q ? { q } : {});
      setCustomers(rows);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Impossible de charger les clients.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== "select") return;
    // Debounce search to avoid hammering the API on every keystroke.
    const handle = window.setTimeout(() => {
      loadCustomers(search);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [mode, search, loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.phone ?? "", c.email ?? "", c.taxId ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [customers, search]);

  function close() {
    if (saving) return;
    onOpenChange(false);
  }

  function pickExisting(customer: ApiCustomer) {
    setSelected(customer);
    onConfirm(customer);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setFormError(null);

    const name = form.name.trim();
    if (!name) {
      setFormError("Le nom du client est obligatoire.");
      return;
    }
    setSaving(true);
    try {
      const payload: CustomerPayload = {
        type: form.type ?? "person",
        name,
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        taxId: form.taxId?.trim() || null,
        address: form.address?.trim() || null,
      };
      const created = await createCustomer(payload);
      onConfirm(created);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Impossible d'enregistrer le client.";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(true) : close())}
    >
      <DialogContent className="flex max-h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:max-h-[calc(100vh-1rem)] sm:max-w-xl sm:rounded-2xl sm:border sm:shadow-lg">
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Informations client
          </DialogTitle>
          <DialogDescription>
            Sélectionne un client existant, crée-en un nouveau, ou continue sans
            client (vente anonyme).
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {mode === "choose" ? (
            <ChooseMode
              onSelectExisting={() => setMode("select")}
              onCreateNew={() => setMode("create")}
              onSkip={onSkip}
            />
          ) : mode === "select" ? (
            <SelectMode
              search={search}
              onSearchChange={setSearch}
              customers={filteredCustomers}
              loading={loading}
              error={error}
              onRetry={() => loadCustomers(search)}
              onPick={pickExisting}
              onBack={() => setMode("choose")}
            />
          ) : (
            <CreateMode
              form={form}
              onChange={setForm}
              formError={formError}
              saving={saving}
              onSubmit={handleCreate}
              onBack={() => setMode("choose")}
            />
          )}
        </div>

        <DialogFooter className="border-t border-border bg-muted/40 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={mode === "choose" ? close : () => setMode("choose")}
            disabled={saving}
          >
            {mode === "choose" ? (
              <>
                <X className="mr-1.5 h-4 w-4" /> Annuler
              </>
            ) : (
              "Retour"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Sub-views
// ============================================================

function ChooseMode({
  onSelectExisting,
  onCreateNew,
  onSkip,
}: {
  onSelectExisting: () => void;
  onCreateNew: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={onSelectExisting}
        className="group flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-left transition-colors hover:bg-muted"
      >
        <div className="brand-soft flex h-10 w-10 items-center justify-center rounded-2xl">
          <Search className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Client existant</p>
          <p className="text-xs text-muted-foreground">
            Recherche dans la base par nom, téléphone ou email.
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onCreateNew}
        className="group flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-left transition-colors hover:bg-muted"
      >
        <div className="brand-soft flex h-10 w-10 items-center justify-center rounded-2xl">
          <UserPlus className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Nouveau client</p>
          <p className="text-xs text-muted-foreground">
            Enregistre un client à la volée (personne ou société).
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onSkip}
        className="group flex items-center gap-3 rounded-2xl border border-dashed border-border bg-background p-4 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <X className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Vente anonyme</p>
          <p className="text-xs text-muted-foreground">
            Continue sans associer de client à cette facture.
          </p>
        </div>
      </button>
    </div>
  );
}

function SelectMode({
  search,
  onSearchChange,
  customers,
  loading,
  error,
  onRetry,
  onPick,
  onBack,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  customers: ApiCustomer[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onPick: (customer: ApiCustomer) => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-2xl bg-muted/40 px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un client…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          autoFocus
        />
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
        {loading && customers.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-2xl bg-muted/40"
                aria-hidden
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <p>{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="text-xs font-semibold underline underline-offset-4"
            >
              Réessayer
            </button>
          </div>
        ) : customers.length === 0 ? (
          <div className="rounded-2xl bg-muted/40 p-4 text-center text-sm text-muted-foreground">
            Aucun client trouvé. Passe à l'onglet « Nouveau client » pour en
            créer un.
          </div>
        ) : (
          customers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c)}
              className="flex w-full items-center gap-3 rounded-2xl bg-muted/40 p-3 text-left transition-colors hover:bg-muted"
            >
              <div className="brand-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold">
                {c.type === "company" ? (
                  <Building2 className="h-4 w-4" />
                ) : (
                  initialsOf(c.name)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.type === "company" ? "Société" : "Personne"}
                  {c.phone ? ` · ${c.phone}` : ""}
                  {c.email ? ` · ${c.email}` : ""}
                </p>
              </div>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        ← Retour aux options
      </button>
    </div>
  );
}

function CreateMode({
  form,
  onChange,
  formError,
  saving,
  onSubmit,
  onBack,
}: {
  form: CustomerPayload;
  onChange: (next: CustomerPayload) => void;
  formError: string | null;
  saving: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
}) {
  return (
    <form className="grid gap-3" onSubmit={onSubmit}>
      <div className="flex items-center gap-1 rounded-2xl bg-muted/40 p-1">
        {(
          [
            { value: "person", label: "Personne", icon: UserIcon },
            {
              value: "company",
              label: "Société",
              icon: Building2,
            },
          ] as const
        ).map((opt) => {
          const Icon = opt.icon;
          const active = (form.type ?? "person") === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...form, type: opt.value })}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          id="customer-name"
          label="Nom *"
          value={form.name}
          onChange={(v) => onChange({ ...form, name: v })}
          placeholder="Ex. Marie Kalume"
          required
        />
        <Field
          id="customer-phone"
          label="Téléphone"
          icon={Phone}
          value={form.phone ?? ""}
          onChange={(v) => onChange({ ...form, phone: v })}
          placeholder="+243 …"
        />
        <Field
          id="customer-email"
          label="Email"
          icon={Mail}
          type="email"
          value={form.email ?? ""}
          onChange={(v) => onChange({ ...form, email: v })}
          placeholder="client@exemple.com"
        />
        <Field
          id="customer-tax"
          label="N° Impôt / ID Nat"
          value={form.taxId ?? ""}
          onChange={(v) => onChange({ ...form, taxId: v })}
          placeholder="Optionnel"
        />
      </div>

      <Field
        id="customer-address"
        label="Adresse"
        icon={MapPin}
        value={form.address ?? ""}
        onChange={(v) => onChange({ ...form, address: v })}
        placeholder="Adresse complète (optionnel)"
      />

      {formError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          ← Retour aux options
        </button>
        <Button type="submit" disabled={saving} className="min-w-40">
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Enregistrement…
            </span>
          ) : (
            <>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Valider et continuer
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  icon: Icon,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ComponentType<{ className?: string }>;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-xs font-semibold text-muted-foreground"
      >
        {label}
      </label>
      <div className="relative">
        {Icon ? (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        ) : null}
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          type={type}
          className={cn(
            "w-full rounded-2xl border border-border bg-background py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20",
            Icon ? "pl-9 pr-3" : "px-3",
          )}
        />
      </div>
    </div>
  );
}
