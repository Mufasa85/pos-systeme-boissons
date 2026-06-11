"use client"

import type { CategoryId } from "@/lib/types"
import { categories } from "@/lib/data"
import { cn } from "@/lib/utils"

export function CategoryTabs({
  active,
  onChange,
}: {
  active: CategoryId
  onChange: (id: CategoryId) => void
}) {
  return (
    <div className="w-full max-w-sm">
      <label
        htmlFor="category-select"
        className="mb-2 block text-sm font-medium text-muted-foreground"
      >
        Category
      </label>
      <select
        id="category-select"
        value={active}
        onChange={(event) => onChange(event.target.value as CategoryId)}
        className="w-full rounded-2xl border border-border bg-muted/60 px-4 py-3 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
      >
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.label}
          </option>
        ))}
      </select>
    </div>
  )
}
