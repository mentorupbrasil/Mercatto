"use client";

import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { FilterChips } from "@/components/ui/filter-chips";
import { SelectField } from "@/components/ui/select-field";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useApi, apiPost } from "@/hooks/use-api";
import { useCatalog, toOptions, toNameOptions } from "@/hooks/use-catalog";
import { formatCurrency, calcMargin } from "@/lib/utils";

interface Product {
  id: string;
  internalCode: string;
  barcode: string | null;
  name: string;
  cost: string;
  price: string;
  minStock: number;
  hasVariants: boolean;
  active: boolean;
  category?: { id: string; name: string };
  brand?: { id: string; name: string };
  model?: { id: string; name: string };
  variants: { id: string; color: string | null; size: string | null; sku: string }[];
  stock: { quantity: number }[];
}

export default function ProdutosPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [brandId, setBrandId] = useState("all");
  const [modelId, setModelId] = useState("all");
  const [color, setColor] = useState("all");
  const [size, setSize] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasVariants, setHasVariants] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState("");

  const { data: catalog } = useCatalog();

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (categoryId !== "all") p.set("categoryId", categoryId);
    if (brandId !== "all") p.set("brandId", brandId);
    if (modelId !== "all") p.set("modelId", modelId);
    if (color !== "all") p.set("color", color);
    if (size !== "all") p.set("size", size);
    p.set("limit", "100");
    return `/api/products?${p.toString()}`;
  }, [search, categoryId, brandId, modelId, color, size]);

  const { data, loading, refetch } = useApi<{ products: Product[]; total: number }>(
    query,
    [query]
  );

  const products = data?.products ?? [];

  const filteredModels = useMemo(() => {
    if (!catalog?.models) return [];
    if (!selectedBrand) return catalog.models;
    return catalog.models.filter((m) => m.brandId === selectedBrand);
  }, [catalog?.models, selectedBrand]);

  const categoryChips = useMemo(
    () => [
      { id: "all", label: "Todos", count: data?.total },
      ...(catalog?.categories.map((c) => ({
        id: c.id,
        label: c.name,
        count: products.filter((p) => p.category?.id === c.id).length || undefined,
      })) ?? []),
    ],
    [catalog?.categories, data?.total, products]
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const brand = fd.get("brandId") as string;
    const model = fd.get("modelId") as string;
    const colorVal = fd.get("color") as string;
    const sizeVal = fd.get("size") as string;
    const internalCode = fd.get("internalCode") as string;
    const name = fd.get("name") as string;

    const variants =
      hasVariants && colorVal && sizeVal
        ? [{
            sku: `${internalCode}-${sizeVal}-${colorVal}`.toUpperCase().replace(/\s/g, "-"),
            color: colorVal,
            size: sizeVal,
            cost: parseFloat(fd.get("cost") as string) || 0,
            price: parseFloat(fd.get("price") as string) || 0,
          }]
        : undefined;

    try {
      await apiPost("/api/products", {
        internalCode,
        name,
        barcode: fd.get("barcode") || undefined,
        categoryId: fd.get("categoryId") || undefined,
        brandId: brand || undefined,
        modelId: model || undefined,
        supplierId: fd.get("supplierId") || undefined,
        unit: fd.get("unit") || "UN",
        cost: parseFloat(fd.get("cost") as string) || 0,
        price: parseFloat(fd.get("price") as string) || 0,
        minStock: parseInt(fd.get("minStock") as string) || 0,
        location: fd.get("location") || undefined,
        hasVariants: !!variants?.length,
        variants,
      });
      setModalOpen(false);
      setHasVariants(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Produtos"
        description={`${data?.total ?? 0} produto(s) cadastrado(s)`}
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Novo Produto
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="space-y-4 p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="mercatto-input pl-10"
              placeholder="Buscar por nome, código ou barras..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Categoria
            </p>
            <FilterChips items={categoryChips} activeId={categoryId} onChange={setCategoryId} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Marca
              </p>
              <FilterChips
                items={[
                  { id: "all", label: "Todas" },
                  ...(catalog?.brands.map((b) => ({ id: b.id, label: b.name })) ?? []),
                ]}
                activeId={brandId}
                onChange={setBrandId}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Modelo
              </p>
              <FilterChips
                items={[
                  { id: "all", label: "Todos" },
                  ...(catalog?.models.map((m) => ({ id: m.id, label: m.name })) ?? []),
                ]}
                activeId={modelId}
                onChange={setModelId}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Cor
              </p>
              <FilterChips
                items={[
                  { id: "all", label: "Todas" },
                  ...(catalog?.colors.map((c) => ({ id: c.name, label: c.name })) ?? []),
                ]}
                activeId={color}
                onChange={setColor}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Tamanho
              </p>
              <FilterChips
                items={[
                  { id: "all", label: "Todos" },
                  ...(catalog?.sizes.map((s) => ({ id: s.name, label: s.name })) ?? []),
                ]}
                activeId={size}
                onChange={setSize}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-mercatto-600 border-t-transparent" />
            </div>
          ) : products.length === 0 ? (
            <p className="p-8 text-center text-gray-500">Nenhum produto encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Marca / Modelo</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Margem</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => {
                  const stock = p.stock.reduce((s, st) => s + st.quantity, 0);
                  const cost = parseFloat(p.cost);
                  const price = parseFloat(p.price);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">{p.internalCode}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{p.name}</p>
                          {p.hasVariants && (
                            <p className="text-xs text-gray-500">
                              {p.variants.map((v) => [v.size, v.color].filter(Boolean).join(" / ")).join(", ") || `${p.variants.length} variantes`}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{p.category?.name || "—"}</TableCell>
                      <TableCell>
                        <p className="text-sm">{p.brand?.name || "—"}</p>
                        <p className="text-xs text-gray-500">{p.model?.name || ""}</p>
                      </TableCell>
                      <TableCell>{formatCurrency(cost)}</TableCell>
                      <TableCell>{formatCurrency(price)}</TableCell>
                      <TableCell>{calcMargin(cost, price).toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge variant={stock <= p.minStock ? "warning" : "success"}>
                          {stock} un
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.active ? "success" : "default"}>
                          {p.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Produto" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Código Interno (SKU)" name="internalCode" required placeholder="Ex: CAM001" />
            <Input label="Código de Barras" name="barcode" placeholder="EAN/GTIN" />
          </div>
          <Input label="Nome do Produto" name="name" required />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Categoria"
              name="categoryId"
              options={toOptions(catalog?.categories ?? [])}
              placeholder="Selecione a categoria"
            />
            <SelectField
              label="Marca"
              name="brandId"
              options={toOptions(catalog?.brands ?? [])}
              placeholder="Selecione a marca"
              onChange={setSelectedBrand}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Modelo / Linha"
              name="modelId"
              options={toOptions(filteredModels)}
              placeholder="Selecione o modelo"
            />
            <SelectField
              label="Fornecedor"
              name="supplierId"
              options={toOptions(catalog?.suppliers ?? [])}
              placeholder="Selecione o fornecedor"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              label="Unidade"
              name="unit"
              options={catalog?.units ?? [{ value: "UN", label: "Unidade" }]}
            />
            <SelectField
              label="Localização"
              name="location"
              options={toNameOptions(catalog?.locations.map((l) => l.name) ?? [])}
              placeholder="Onde fica no estoque"
            />
            <Input label="Estoque Mínimo" name="minStock" type="number" defaultValue="0" />
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={(e) => setHasVariants(e.target.checked)}
                className="rounded border-gray-300 text-mercatto-600"
              />
              <span className="text-sm font-medium text-gray-700">
                Produto com grade (cor e tamanho)
              </span>
            </label>
            {hasVariants && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Cor"
                  name="color"
                  required
                  options={toNameOptions(catalog?.colors.map((c) => c.name) ?? [])}
                />
                <SelectField
                  label="Tamanho"
                  name="size"
                  required
                  options={toNameOptions(catalog?.sizes.map((s) => s.name) ?? [])}
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Custo (R$)" name="cost" type="number" step="0.01" required />
            <Input label="Preço de Venda (R$)" name="price" type="number" step="0.01" required />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>Salvar Produto</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
