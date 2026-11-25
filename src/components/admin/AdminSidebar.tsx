"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Users,
  X,
} from "lucide-react";
import { BROKER_INFO } from "@/lib/format";
import { signOutAdmin } from "@/app/admin/login/actions";

interface AdminSidebarProps {
  userEmail: string;
}

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/admin/imoveis",
    label: "Imóveis",
    icon: Building2,
    exact: false,
  },
  {
    href: "/admin/leads",
    label: "Leads (Mini-CRM)",
    icon: MessageSquareText,
    exact: false,
  },
  {
    href: "/admin/proprietarios",
    label: "Proprietários",
    icon: Users,
    exact: false,
  },
];

export function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const navContent = (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-5 py-5">
        <Link
          href="/admin"
          onClick={() => setMobileOpen(false)}
          className="block"
        >
          <p className="font-serif text-lg font-semibold leading-tight text-primary">
            {BROKER_INFO.shortBrandName}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Painel Admin • CRECI {BROKER_INFO.creci}
          </p>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Menu do painel">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-primary text-white shadow-sm"
                  : "text-foreground hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-border p-4">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-lg border border-border bg-admin-bg px-3 py-2 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <span>Abrir Vitrine Pública</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>

        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="truncate text-xs font-medium text-foreground">
            {userEmail}
          </p>
          <p className="text-[11px] text-muted">Sessão autenticada</p>
        </div>

        <form action={signOutAdmin}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair do Painel
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Topbar Mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-white px-4 py-3 lg:hidden">
        <Link href="/admin" className="font-serif text-base font-semibold text-primary">
          {BROKER_INFO.shortBrandName} • Admin
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="rounded-lg border border-border p-2 text-foreground hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Drawer Mobile */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-4 rounded-lg p-1.5 text-muted hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
            {navContent}
          </aside>
        </div>
      ) : null}

      {/* Sidebar Desktop Fixa */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:block">
        {navContent}
      </aside>
    </>
  );
}
