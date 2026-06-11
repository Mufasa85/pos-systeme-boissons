"use client"

import { useState, type FormEvent } from "react"
import { Edit3, Plus, Trash2 } from "lucide-react"
import { PosShell } from "@/components/pos-shell"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { drinks, categories } from "@/lib/data"
import type { CategoryId, Drink } from "@/lib/types"

const defaultForm = {
  id: "",
  name: "",
  description: "",
  price: 0,
  category: "coffee" as CategoryId,
  image: "/drinks/placeholder.png",
  stock: 0,
  popularity: 0,
  sizes: "S,M,L",
}

function formatSizes(sizes?: string[]) {
  return sizes?.join(", ") ?? ""
}

function parseSizes(raw: string) {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `prod-${Date.now()}`
}

export default function StockPage() {
  const [products, setProducts] = useState<Drink[]>(drinks)
  const [form, setForm] = useState({ ...defaultForm })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const low = products.filter((d) => d.stock <= 15)
  const categoryOptions = categories.filter((category) => category.id !== "all")

  function resetForm() {
    setEditingId(null)
    setForm({ ...defaultForm })
  }

  function closeDialog() {
    setDialogOpen(false)
    resetForm()
  }

  function handleEdit(product: Drink) {
    setEditingId(product.id)
    setForm({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      image: product.image,
      stock: product.stock,
      popularity: product.popularity,
      sizes: formatSizes(product.sizes),
    })
    setDialogOpen(true)
  }

  function handleDelete(id: string) {
    setProducts((prev) => prev.filter((product) => product.id !== id))
    if (editingId === id) {
      closeDialog()
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const item: Drink = {
      id: editingId ?? makeId(),
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category: form.category,
      image: form.image.trim() || "/drinks/placeholder.png",
      stock: Number(form.stock),
      popularity: Number(form.popularity),
      sizes: parseSizes(form.sizes),
    }

    if (!item.name) {
      return
    }

    setProducts((prev) => {
      if (editingId) {
        return prev.map((product) => (product.id === editingId ? item : product))
      }
      return [item, ...prev]
    })

    closeDialog()
  }

  return (
    <PosShell active="stock" title="Stock">
      <div className="glass rounded-3xl p-5 mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Gestion des produits</p>
            <p className="text-xs text-muted-foreground">
              Ouvre le formulaire au centre pour ajouter ou modifier un produit.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => { resetForm(); setDialogOpen(true) }}>
            <Plus className="h-4 w-4" /> Nouveau produit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="glass-strong rounded-3xl p-5 lg:col-span-2">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">Inventory list</p>
              <p className="text-xs text-muted-foreground">Updated today</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {products.length} products in stock
            </p>
          </div>

          <div className="space-y-2">
            {products.map((d) => {
              const pct = Math.min((d.stock / 80) * 100, 100)
              const danger = d.stock <= 15
              return (
                <div
                  key={d.id}
                  className="flex flex-col gap-2 rounded-2xl bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.category}</p>
                  </div>

                  <div className="min-w-0 flex-1 sm:px-4">
                    <p className="text-xs text-muted-foreground">
                      {d.stock} in stock
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(d)}
                      className="gap-2"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(d.id)}
                      className="gap-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <p className="text-sm font-semibold">Low stock</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Items below or equal 15
          </p>
          <div className="mt-4 space-y-2">
            {low.length === 0 ? (
              <div className="rounded-2xl bg-muted/40 p-3 text-sm text-muted-foreground">
                Everything looks good.
              </div>
            ) : (
              low.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-2xl bg-muted/40 p-3"
                >
                  <p className="text-sm font-semibold">{d.name}</p>
                  <p className="text-xs font-bold text-destructive">{d.stock}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl p-6">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier un produit" : "Ajouter un produit"}
            </DialogTitle>
            <DialogDescription>
              Remplis le formulaire pour ajouter ou mettre à jour un produit.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="product-name" className="text-sm font-medium text-muted-foreground">
                Nom du produit
              </label>
              <input
                id="product-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Nom"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="product-category" className="text-sm font-medium text-muted-foreground">
                Catégorie
              </label>
              <select
                id="product-category"
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as CategoryId }))}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="product-price" className="text-sm font-medium text-muted-foreground">Prix</label>
              <input
                id="product-price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: Number(event.target.value) }))}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="product-stock" className="text-sm font-medium text-muted-foreground">Stock</label>
              <input
                id="product-stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={(event) => setForm((prev) => ({ ...prev, stock: Number(event.target.value) }))}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="product-image" className="text-sm font-medium text-muted-foreground">Image</label>
              <input
                id="product-image"
                value={form.image}
                onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.value }))}
                placeholder="URL de l'image"
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" className="w-full justify-center">
                {editingId ? "Mettre à jour le produit" : "Ajouter le produit"}
              </Button>
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PosShell>
  )
}

