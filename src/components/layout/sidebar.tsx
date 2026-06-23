"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Archive,
  BarChart3,
  Calendar,
  ChevronLeft,
  ClipboardList,
  CreditCard,
  FileText,
  Gift,
  LayoutDashboard,
  Menu,
  Package,
  Receipt,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Store,
  Target,
  Truck,
  UserCog,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Produtos", href: "/produtos", icon: Package },
  { label: "Estoque", href: "/estoque", icon: Archive },
  { label: "Compras", href: "/compras", icon: ShoppingCart },
  { label: "PDV", href: "/pdv", icon: Store },
  { label: "Fluxo de Caixa", href: "/fluxo-de-caixa", icon: Wallet },
  { label: "Contas a Pagar", href: "/contas-a-pagar", icon: CreditCard },
  { label: "Contas a Receber", href: "/contas-a-receber", icon: Receipt },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Fidelidade", href: "/fidelidade", icon: Gift },
  { label: "Fornecedores", href: "/fornecedores", icon: Truck },
  { label: "Agenda", href: "/agenda", icon: Calendar },
  { label: "Funcionários", href: "/funcionarios", icon: UserCog },
  { label: "Metas", href: "/metas", icon: Target },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { label: "DRE", href: "/dre", icon: FileText },
  { label: "Auditoria", href: "/auditoria", icon: Shield },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setMobileOpen(false)}>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mercatto-600">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <span className="text-lg font-bold text-gray-900">Mercatto</span>
              <p className="text-xs text-gray-500">Gestão de Lojas</p>
            </div>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:block"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <ChevronLeft
            className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")}
          />
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 lg:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveRoute(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "sidebar-link",
                    active && "sidebar-link-active",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", active && "text-mercatto-600")} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {!collapsed && (
        <div className="border-t border-gray-200 p-4">
          <div className="rounded-lg bg-mercatto-50 p-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-mercatto-600" />
              <p className="text-xs font-medium text-mercatto-800">Plano Profissional</p>
            </div>
            <p className="mt-1 text-xs text-mercatto-700/80">
              Acesse todos os módulos da plataforma.
            </p>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-lg border border-gray-200 bg-white p-2 shadow-sm lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5 text-gray-700" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
