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

interface Receivable {
  id: string;
  description: string;
  installment: number;
  totalInstallments: number;
  amount: string;
  dueDate: string;
  status: string;
  customer?: { name: string };
}

const statusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" }> = {
  OPEN: { label: "Aberto", variant: "warning" },
  PAID: { label: "Recebido", variant: "success" },
  OVERDUE: { label: "Atrasado", variant: "danger" },
  CANCELLED: { label: "Cancelado", variant: "default" },
};

export default function ContasReceberPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, loading, refetch } = useApi<{ receivables: Receivable[] }>("/api/receivables");
  const { data: customers } = useApi<{ customers: { id: string; name: string }[] }>("/api/customers");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiPost("/api/receivables", {
        customerId: fd.get("customerId") || undefined,
        description: fd.get("description"),
        amount: parseFloat(fd.get("amount") as string),
        dueDate: fd.get("dueDate"),
        installment: parseInt(fd.get("installment") as string) || 1,
        totalInstallments: parseInt(fd.get("totalInstallments") as string) || 1,
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
      await apiPatch("/api/receivables", { id, status: "PAID" });
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div>
      <PageHeader
        title="Contas a Receber"
        description="Recebimentos e vendas a prazo"
        actions={<Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Novo Recebível</Button>}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-mercatto-600 border-t-transparent" />
            </div>
          ) : !data?.receivables?.length ? (
            <p className="p-8 text-center text-gray-500">Nenhuma conta a receber.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.receivables.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.description}</TableCell>
                    <TableCell>{r.customer?.name || "—"}</TableCell>
                    <TableCell>{r.installment}/{r.totalInstallments}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(parseFloat(r.amount))}</TableCell>
                    <TableCell>{formatDate(r.dueDate)}</TableCell>
                    <TableCell>
                      <Badge variant={statusMap[r.status]?.variant || "default"}>
                        {statusMap[r.status]?.label || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.status === "OPEN" && (
                        <Button size="sm" variant="ghost" onClick={() => markPaid(r.id)}>
                          <Check className="h-4 w-4" /> Receber
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Conta a Receber">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Descrição" name="description" required />
          <div>
            <label className="mercatto-label">Cliente</label>
            <select name="customerId" className="mercatto-input">
              <option value="">Sem cliente</option>
              {customers?.customers?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Valor (R$)" name="amount" type="number" step="0.01" required />
            <Input label="Parcela" name="installment" type="number" defaultValue="1" />
            <Input label="Total Parcelas" name="totalInstallments" type="number" defaultValue="1" />
          </div>
          <Input label="Vencimento" name="dueDate" type="date" required />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
