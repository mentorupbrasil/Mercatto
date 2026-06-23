import { UserRole } from "@prisma/client";

export type Permission =
  | "dashboard.view"
  | "products.view"
  | "products.manage"
  | "stock.view"
  | "stock.manage"
  | "purchases.view"
  | "purchases.manage"
  | "pdv.access"
  | "sales.view"
  | "finance.view"
  | "finance.manage"
  | "customers.view"
  | "customers.manage"
  | "suppliers.view"
  | "suppliers.manage"
  | "agenda.view"
  | "agenda.manage"
  | "employees.view"
  | "employees.manage"
  | "goals.view"
  | "goals.manage"
  | "reports.view"
  | "loyalty.view"
  | "loyalty.manage"
  | "settings.view"
  | "settings.manage"
  | "audit.view"
  | "users.manage";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "dashboard.view", "products.view", "products.manage",
    "stock.view", "stock.manage", "purchases.view", "purchases.manage",
    "pdv.access", "sales.view", "finance.view", "finance.manage",
    "customers.view", "customers.manage", "suppliers.view", "suppliers.manage",
    "agenda.view", "agenda.manage", "employees.view", "employees.manage",
    "goals.view", "goals.manage", "reports.view", "loyalty.view", "loyalty.manage",
    "settings.view", "settings.manage", "audit.view", "users.manage",
  ],
  MANAGER: [
    "dashboard.view", "products.view", "products.manage",
    "stock.view", "stock.manage", "purchases.view", "purchases.manage",
    "pdv.access", "sales.view", "finance.view", "finance.manage",
    "customers.view", "customers.manage", "suppliers.view", "suppliers.manage",
    "agenda.view", "agenda.manage", "employees.view", "goals.view",
    "goals.manage", "reports.view", "loyalty.view", "loyalty.manage",
    "settings.view", "audit.view",
  ],
  CASHIER: [
    "dashboard.view", "products.view", "pdv.access", "sales.view",
    "customers.view", "customers.manage", "agenda.view",
  ],
  STOCKIST: [
    "dashboard.view", "products.view", "products.manage",
    "stock.view", "stock.manage", "purchases.view", "purchases.manage",
    "suppliers.view",
  ],
  VIEWER: [
    "dashboard.view", "products.view", "stock.view", "sales.view",
    "reports.view",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function requirePermission(role: UserRole, permission: Permission) {
  if (!hasPermission(role, permission)) {
    throw new Error("FORBIDDEN");
  }
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  CASHIER: "Caixa",
  STOCKIST: "Estoquista",
  VIEWER: "Visualizador",
};
