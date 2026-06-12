"use client"

import { Bell, Search, Settings, SlidersHorizontal } from "lucide-react"
import { useBranding } from "@/components/branding-provider"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Topbar({
  query,
  onQueryChange,
  onOpenSettings,
  onOpenSidebarMobile,
}: {
  query: string
  onQueryChange: (value: string) => void
  onOpenSettings: () => void
  onOpenSidebarMobile: () => void
}) {
  const { branding } = useBranding()

  return (
    <header className="glass flex items-center gap-3 rounded-3xl p-3 sm:gap-4 sm:p-4">
      {/* Mobile logo */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex items-center justify-center">
          {branding.logoImage ? (
            <img src={branding.logoImage} alt="logo" className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            <div className="brand-bg flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold">
              {branding.logoText.charAt(0)}
            </div>
          )}
        </div>
      </div>

      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search drinks..."
          className="h-11 rounded-2xl border-transparent bg-muted/60 pl-11 text-sm focus-visible:ring-2"
          style={{ outlineColor: "var(--brand)" }}
          aria-label="Search drinks"
        />
      </div>

      <Button
        variant="ghost"
        className="hidden h-11 gap-2 rounded-2xl bg-muted/60 px-4 text-sm font-medium sm:flex"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filter
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11 rounded-2xl bg-muted/60"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenSettings}
        className="h-11 w-11 rounded-2xl bg-muted/60 lg:hidden"
        aria-label="Branding settings"
      >
        <Settings className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-3 pl-1 pr-1">
        <Avatar className="h-10 w-10 border border-border">
          <AvatarImage src="/cashier-avatar.png" alt="Cashier" />
          <AvatarFallback className="brand-soft text-sm font-semibold">
            AF
          </AvatarFallback>
        </Avatar>
        <div className="hidden text-sm leading-tight md:block">
          <p className="font-semibold">Albert Flores</p>
          <p className="text-xs text-muted-foreground">Cashier</p>
        </div>
      </div>
    </header>
  )
}
