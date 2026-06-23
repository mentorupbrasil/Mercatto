"use client";

import { useApi } from "./use-api";

export interface CatalogData {
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  models: { id: string; name: string; brandId: string | null; brand?: { id: string; name: string } }[];
  colors: { id: string; name: string; hexCode?: string | null }[];
  sizes: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  expenseCategories: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  units: { value: string; label: string }[];
  employeeRoles: string[];
  appointmentTypes: { value: string; label: string }[];
}

export function useCatalog() {
  return useApi<CatalogData>("/api/catalog/options");
}

export function toOptions(items: { id: string; name: string }[]) {
  return items.map((i) => ({ value: i.id, label: i.name }));
}

export function toNameOptions(items: string[]) {
  return items.map((name) => ({ value: name, label: name }));
}
