"use client";

import { AuthGuard } from "@/components/auth-guard";
import { MobileSidebarProvider } from "@/components/mobile-sidebar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <MobileSidebarProvider>{children}</MobileSidebarProvider>
    </AuthGuard>
  );
}
