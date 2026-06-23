"use client";

import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useApi, apiPost, apiPatch } from "@/hooks/use-api";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Payable {
  id: string;
  description: string;
  category: string | null;
  amount: string;
  dueDate: string;
  status: string;
  supplier?: { name: string };
}

const statusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" }> = {
  OPEN: { label: "Aberto", variant: "warning" },
  PAID: { label: "Pago", variant: "success" },
  OVERDUE: { label: "Atrasado", variant: "danger" },
  CANCELLED: { label: "Cancelado", variant: "default" },
};

export default function ContasPagarPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, loading, refetch } = useApi<{ payables: Payable[] }>("/api/payables");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiPost("/api/payables", {
        description: fd.get("description"),
        category: fd.get("category"),
        amount: parseFloat(fd.get("amount") as string),
        dueDate: fd.get("dueDate"),
        costCenter: fd.get("costCenter") || undefined,
      });
      setModalOpen(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(id: string) {
    try {
      await apiPatch("/api/payables", { id, status: "PAID" });
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    }
  }

  const payables = data?.payables ?? [];

  return (
    <div>
      <PageHeader
        title="Contas a Pagar"
        description="Controle de despesas e vencimentos"
        actions={<Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Nova Conta</Button>}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-mercatto-600 border-t-transparent" />
            </div>
          ) : payables.length === 0 ? (
            <p className="p-8 text-center text-gray-500">Nenhuma conta a pagar.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">{p.description}</p>
                      {p.supplier && <p className="text-xs text-gray-500">{p.supplier.name}</p>}
                    </TableCell>
                    <TableCell>{p.category || "—"}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(parseFloat(p.amount))}</TableCell>
                    <TableCell>{formatDate(p.dueDate)}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[p.status]?.variant || "default"}>
                        {statusMap[p.status]?.label || p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.status === "OPEN" && (
                        <Button size="sm" variant="ghost" onClick={() => markPaid(p.id)}>
                          <Check className="h-4 w-4" /> Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Conta a Pagar">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Descrição" name="description" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Categoria" name="category" placeholder="Ex: Aluguel" />
            <Input label="Centro de Custo" name="costCenter" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Valor (R$)" name="amount" type="number" step="0.01" required />
            <Input label="Vencimento" name="dueDate" type="date" required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
