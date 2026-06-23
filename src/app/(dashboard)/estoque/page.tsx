"use client";

import { ArrowLeftRight, Package } from "lucide-react";
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
import { formatDateTime } from "@/lib/utils";

interface Movement {
  id: string;
  type: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  reason: string | null;
  createdAt: string;
  product: { name: string; internalCode: string };
  branch: { name: string };
}

const typeLabels: Record<string, string> = {
  PURCHASE: "Compra",
  SALE: "Venda",
  RETURN: "Devolução",
  ADJUSTMENT: "Ajuste",
  INVENTORY: "Inventário",
  TRANSFER_IN: "Transferência (entrada)",
  TRANSFER_OUT: "Transferência (saída)",
  LOSS: "Perda",
  INTERNAL_USE: "Consumo interno",
  EXCHANGE: "Troca",
};

export default function EstoquePage() {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, loading, refetch } = useApi<{ movements: Movement[] }>("/api/stock");
  const { data: branches } = useApi<{ branches: { id: string; name: string }[] }>("/api/branches");
  const { data: products } = useApi<{ products: { id: string; name: string }[] }>("/api/products?limit=100");

  async function handleAdjust(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiPost("/api/stock", {
        branchId: fd.get("branchId"),
        productId: fd.get("productId"),
        quantity: parseInt(fd.get("quantity") as string),
        type: fd.get("type"),
        reason: fd.get("reason"),
      });
      setAdjustOpen(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function handleTransfer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiPost("/api/stock/transfer", {
        fromBranchId: fd.get("fromBranchId"),
        toBranchId: fd.get("toBranchId"),
        productId: fd.get("productId"),
        quantity: parseInt(fd.get("quantity") as string),
      });
      setTransferOpen(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  const movements = data?.movements ?? [];

  return (
    <div>
      <PageHeader
        title="Estoque"
        description="Movimentações, ajustes, inventário e transferências entre filiais"
        actions={
          <>
            <Button variant="secondary" onClick={() => setTransferOpen(true)}>
              <ArrowLeftRight className="h-4 w-4" /> Transferir
            </Button>
            <Button onClick={() => setAdjustOpen(true)}>
              <Package className="h-4 w-4" /> Ajustar Estoque
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Movimentações Recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-mercatto-600 border-t-transparent" />
            </div>
          ) : movements.length === 0 ? (
            <p className="p-8 text-center text-gray-500">Nenhuma movimentação registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Antes → Depois</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">{formatDateTime(m.createdAt)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{m.product.name}</p>
                      <p className="text-xs text-gray-500">{m.product.internalCode}</p>
                    </TableCell>
                    <TableCell>{m.branch.name}</TableCell>
                    <TableCell>
                      <Badge variant={m.quantity > 0 ? "success" : "danger"}>
                        {typeLabels[m.type] || m.type}
                      </Badge>
                    </TableCell>
                    <TableCell className={m.quantity > 0 ? "text-green-600" : "text-red-600"}>
                      {m.quantity > 0 ? "+" : ""}{m.quantity}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {m.previousQty} → {m.newQty}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Ajustar Estoque">
        <form onSubmit={handleAdjust} className="space-y-4">
          <div>
            <label className="mercatto-label">Filial</label>
            <select name="branchId" className="mercatto-input" required>
              {branches?.branches?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
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
          <div>
            <label className="mercatto-label">Tipo</label>
            <select name="type" className="mercatto-input" required>
              <option value="ADJUSTMENT">Ajuste</option>
              <option value="INVENTORY">Inventário</option>
              <option value="LOSS">Perda</option>
              <option value="INTERNAL_USE">Consumo interno</option>
              <option value="RETURN">Devolução</option>
            </select>
          </div>
          <Input label="Quantidade (+/-)" name="quantity" type="number" required />
          <Input label="Motivo" name="reason" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAdjustOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>Confirmar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transferência entre Filiais">
        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="mercatto-label">Origem</label>
            <select name="fromBranchId" className="mercatto-input" required>
              {branches?.branches?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mercatto-label">Destino</label>
            <select name="toBranchId" className="mercatto-input" required>
              {branches?.branches?.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
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
          <Input label="Quantidade" name="quantity" type="number" min="1" required />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setTransferOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>Transferir</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
