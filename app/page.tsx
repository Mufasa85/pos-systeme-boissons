import { BrandingProvider } from "@/components/branding-provider"
import { PosApp } from "@/components/pos-app"

export default function Page() {
  return (
    <BrandingProvider>
      <PosApp />
    </BrandingProvider>
  )
}
