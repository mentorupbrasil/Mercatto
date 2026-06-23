"use client";

import { Brain, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useApi, apiPost } from "@/hooks/use-api";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Purchase {
  id: string;
  number: string;
  status: string;
  total: string;
  expectedDate: string | null;
  createdAt: string;
  supplier: { name: string };
}

interface Prediction {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  avgDailySales: number;
  daysUntilStockout: number;
  suggestedQty: number;
  urgency: "critical" | "high" | "medium" | "low";
}

const statusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "info" }> = {
  PENDING: { label: "Pendente", variant: "warning" },
  ORDERED: { label: "Pedido", variant: "info" },
  PARTIAL: { label: "Parcial", variant: "warning" },
  RECEIVED: { label: "Recebido", variant: "success" },
  CANCELLED: { label: "Cancelado", variant: "default" },
};

const urgencyMap = {
  critical: { label: "Crítico", variant: "danger" as const },
  high: { label: "Alto", variant: "warning" as const },
  medium: { label: "Médio", variant: "info" as const },
  low: { label: "Baixo", variant: "default" as const },
};

export default function ComprasPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, loading, refetch } = useApi<{ purchases: Purchase[] }>("/api/purchases");
  const { data: predictions } = useApi<Prediction[]>("/api/analytics/predictions");
  const { data: suppliers } = useApi<{ suppliers: { id: string; name: string }[] }>("/api/suppliers");
  const { data: products } = useApi<{ products: { id: string; name: string }[] }>("/api/products?limit=100");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiPost("/api/purchases", {
        supplierId: fd.get("supplierId"),
        items: [{
          productId: fd.get("productId"),
          quantity: parseInt(fd.get("quantity") as string),
          unitCost: parseFloat(fd.get("unitCost") as string),
        }],
        notes: fd.get("notes") || undefined,
      });
      setModalOpen(false);
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
        title="Compras"
        description="Pedidos, cotações e previsão inteligente de reposição"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Nova Compra
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-mercatto-600" />
            Previsão de Compras (IA)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!predictions || predictions.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">Sem sugestões no momento.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Média/dia</TableHead>
                  <TableHead>Dias p/ zerar</TableHead>
                  <TableHead>Sugestão</TableHead>
                  <TableHead>Urgência</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {predictions.slice(0, 10).map((p) => (
                  <TableRow key={p.productId}>
                    <TableCell className="font-medium">{p.productName}</TableCell>
                    <TableCell>{p.currentStock} / min {p.minStock}</TableCell>
                    <TableCell>{p.avgDailySales}</TableCell>
                    <TableCell>{p.daysUntilStockout === 999 ? "—" : p.daysUntilStockout}d</TableCell>
                    <TableCell className="font-semibold text-mercatto-700">{p.suggestedQty} un</TableCell>
                    <TableCell>
                      <Badge variant={urgencyMap[p.urgency].variant}>
                        {urgencyMap[p.urgency].label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Pedidos de Compra
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-mercatto-600 border-t-transparent" />
            </div>
          ) : !data?.purchases?.length ? (
            <p className="p-8 text-center text-gray-500">Nenhuma compra registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Previsão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono">{p.number}</TableCell>
                    <TableCell>{p.supplier.name}</TableCell>
                    <TableCell>{formatCurrency(parseFloat(p.total))}</TableCell>
                    <TableCell>{p.expectedDate ? formatDate(p.expectedDate) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[p.status]?.variant || "default"}>
                        {statusMap[p.status]?.label || p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Compra">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="mercatto-label">Fornecedor</label>
            <select name="supplierId" className="mercatto-input" required>
              {suppliers?.suppliers?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mercatto-label">Produto</label>
            <select name="productId" className="mercatto-input" required>
              {products?.products?.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Quantidade" name="quantity" type="number" min="1" required />
            <Input label="Custo Unitário (R$)" name="unitCost" type="number" step="0.01" required />
          </div>
          <Input label="Observações" name="notes" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>Criar Pedido</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
