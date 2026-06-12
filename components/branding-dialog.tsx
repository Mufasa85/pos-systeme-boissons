"use client"

import { Check, Upload, X } from "lucide-react"
import { useRef, useState } from "react"
import { useBranding } from "@/components/branding-provider"
import { presetThemes } from "@/lib/data"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function BrandingDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { branding, setBranding } = useBranding()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string>("")

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const data = reader.result as string
      setBranding({ logoImage: data })
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveLogo = () => {
    setBranding({ logoImage: "" })
    setFileName("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Branding settings</DialogTitle>
          <DialogDescription>
            Personalize the POS for your business. Colors update instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2 max-h-[70vh] overflow-y-auto pr-1">

          {/* Live preview */}
          <div className="glass flex items-center gap-3 rounded-2xl p-4">
            <div className="flex items-center justify-center">
              {branding.logoImage ? (
                <img
                  src={branding.logoImage}
                  alt="logo"
                  className="h-12 w-12 rounded-2xl object-cover"
                />
              ) : (
                <div className="brand-bg flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold">
                  {branding.logoText.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="font-bold leading-tight">{branding.companyName}</p>
              <p className="text-xs text-muted-foreground">{branding.tagline}</p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="company">Company name</Label>
            <Input
              id="company"
              value={branding.companyName}
              onChange={(e) => setBranding({ companyName: e.target.value })}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="logo">Logo initial</Label>
              <Input
                id="logo"
                maxLength={6}
                value={branding.logoText}
                onChange={(e) => setBranding({ logoText: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={branding.tagline}
                onChange={(e) => setBranding({ tagline: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Logo image</Label>
            <div className="glass rounded-2xl p-4">
              <div className="space-y-3">
                {/* Preview ou upload area */}
                {branding.logoImage ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={branding.logoImage}
                      alt="logo preview"
                      className="h-16 w-16 rounded-2xl object-cover shadow-sm"
                    />
                    <p className="text-xs text-muted-foreground text-center break-all">{fileName}</p>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove logo
                    </button>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-3 py-6 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-muted/50"
                    >
                      <Upload className="h-4 w-4" />
                      Upload logo
                    </button>
                    <p className="mt-2 text-xs text-muted-foreground text-center">PNG, JPG, GIF jusqu'à 5MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                id="logoImage"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="color">Primary color</Label>
            <div className="flex items-center gap-3">
              <input
                id="color"
                type="color"
                value={branding.primaryColor}
                onChange={(e) => setBranding({ primaryColor: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-xl border border-border bg-transparent"
              />
              <Input
                value={branding.primaryColor}
                onChange={(e) => setBranding({ primaryColor: e.target.value })}
                className="rounded-xl font-mono text-sm"
              />
            </div>
          </div>

          {/* Preset themes */}
          <div className="grid gap-2">
            <Label>Preset themes</Label>
            <div className="grid grid-cols-3 gap-2">
              {presetThemes.map((theme) => {
                const isActive = branding.primaryColor === theme.primaryColor
                return (
                  <button
                    key={theme.name}
                    type="button"
                    onClick={() =>
                      setBranding({
                        primaryColor: theme.primaryColor,
                        secondaryColor: theme.secondaryColor,
                      })
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2 text-xs font-medium transition-colors",
                      isActive
                        ? "border-transparent"
                        : "border-border hover:bg-muted",
                    )}
                    style={
                      isActive
                        ? {
                            backgroundColor: `color-mix(in srgb, ${theme.primaryColor} 14%, transparent)`,
                          }
                        : undefined
                    }
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded-md"
                      style={{ backgroundColor: theme.primaryColor }}
                    >
                      {isActive && <Check className="h-3 w-3 text-white" />}
                    </span>
                    {theme.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
