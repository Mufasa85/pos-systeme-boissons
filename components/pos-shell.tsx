"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BrandingProvider } from "@/components/branding-provider";
import { BrandingDialog } from "@/components/branding-dialog";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { NAV_PATHS, type NavKey } from "@/lib/permissions";

export function PosShell({
  active,
  title,
  children,
}: {
  active: string;
  title: string;
  queryPlaceholder?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [navLoading, setNavLoading] = useState(false);

  // Show the progress bar when the pathname changes, then hide it
  // shortly after to allow the new page's content to paint.
  useEffect(() => {
    setNavLoading(true);
    const t = setTimeout(() => setNavLoading(false), 600);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <BrandingProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Navigation progress bar */}
        {navLoading && (
          <div className="fixed left-0 top-0 z-[100] h-0.5 w-full overflow-hidden">
            <div className="h-full w-1/3 animate-[navProgress_1s_ease-in-out_infinite] rounded-full bg-[var(--brand)]" />
          </div>
        )}

        <Sidebar
          active={active}
          onChange={(id) => {
            if (id in NAV_PATHS) {
              setNavLoading(true);
              router.push(NAV_PATHS[id as NavKey]);
            }
          }}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:pl-0 overflow-hidden">
          <Topbar
            query={query}
            onQueryChange={setQuery}
            onOpenSettings={() => setSettingsOpen(true)}
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex items-baseline justify-between">
              <h1 className="text-lg font-bold">{title}</h1>
              <span className="text-sm text-muted-foreground">
                {/* keep responsive spacing consistent */}
              </span>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto">{children}</div>
          </div>
        </div>

        <BrandingDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    </BrandingProvider>
  );
}
