import type { Metadata } from "next";
import { requireAdminUser } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { BROKER_INFO } from "@/lib/format";

export const metadata: Metadata = {
  title: "Painel Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await requireAdminUser();

  return (
    <div className="min-h-screen bg-admin-bg text-foreground">
      <AdminSidebar userEmail={user.email ?? BROKER_INFO.email} />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
