"use client";

import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useApi, apiPost } from "@/hooks/use-api";
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
  category?: { name: string };
  brand?: { name: string };
  variants: { id: string; color: string | null; size: string | null; sku: string }[];
  stock: { quantity: number }[];
}

export default function ProdutosPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const url = `/api/products?search=${encodeURIComponent(search)}`;
  const { data, loading, refetch } = useApi<{ products: Product[]; total: number }>(url, [search]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiPost("/api/products", {
        internalCode: fd.get("internalCode"),
        name: fd.get("name"),
        barcode: fd.get("barcode") || undefined,
        cost: parseFloat(fd.get("cost") as string) || 0,
        price: parseFloat(fd.get("price") as string) || 0,
        minStock: parseInt(fd.get("minStock") as string) || 0,
        location: fd.get("location") || undefined,
      });
      setModalOpen(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  const products = data?.products ?? [];

  return (
    <div>
      <PageHeader
        title="Produtos"
        description="Cadastro e gestão de produtos com grade de cor/tamanho"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Novo Produto
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              className="mercatto-input pl-10"
              placeholder="Buscar por nome, código ou barras..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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
                            <p className="text-xs text-gray-500">{p.variants.length} variantes</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{p.category?.name || "—"}</TableCell>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Produto">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Código Interno" name="internalCode" required />
            <Input label="Código de Barras" name="barcode" />
          </div>
          <Input label="Nome" name="name" required />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Custo (R$)" name="cost" type="number" step="0.01" required />
            <Input label="Preço (R$)" name="price" type="number" step="0.01" required />
            <Input label="Estoque Mínimo" name="minStock" type="number" defaultValue="0" />
          </div>
          <Input label="Localização" name="location" placeholder="Ex: Prateleira A3" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={saving}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
