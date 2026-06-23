"use client";

import { Plus, Target } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useApi, apiPost } from "@/hooks/use-api";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Goal {
  id: string;
  name: string;
  type: string;
  target: string;
  current: string;
  periodStart: string;
  periodEnd: string;
  employee?: { name: string };
}

export default function MetasPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, loading, refetch } = useApi<{ goals: Goal[] }>("/api/goals");
  const { data: employees } = useApi<{ employees: { id: string; name: string }[] }>("/api/employees");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiPost("/api/goals", {
        name: fd.get("name"),
        type: fd.get("type"),
        target: parseFloat(fd.get("target") as string),
        employeeId: fd.get("employeeId") || undefined,
        periodStart: fd.get("periodStart"),
        periodEnd: fd.get("periodEnd"),
      });
      setModalOpen(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  const goals = data?.goals ?? [];

  return (
    <div>
      <PageHeader
        title="Metas"
        description="Metas por loja, setor e vendedor com projeção"
        actions={<Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Nova Meta</Button>}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-mercatto-600 border-t-transparent" />
          </div>
        ) : goals.length === 0 ? (
          <p className="col-span-full p-8 text-center text-gray-500">Nenhuma meta definida.</p>
        ) : (
          goals.map((g) => {
            const target = parseFloat(g.target);
            const current = parseFloat(g.current);
            const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
            return (
              <Card key={g.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{g.name}</p>
                      <p className="text-sm text-gray-500">{g.employee?.name || "Loja"}</p>
                    </div>
                    <Target className="h-5 w-5 text-mercatto-600" />
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm">
                      <span>{formatCurrency(current)}</span>
                      <span className="text-gray-500">de {formatCurrency(target)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-mercatto-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-2 flex justify-between">
                      <Badge variant={pct >= 100 ? "success" : pct >= 50 ? "info" : "warning"}>
                        {pct.toFixed(0)}% atingido
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {formatDate(g.periodStart)} — {formatDate(g.periodEnd)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Meta">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Nome da Meta" name="name" required />
          <div>
            <label className="mercatto-label">Tipo</label>
            <select name="type" className="mercatto-input">
              <option value="REVENUE">Faturamento</option>
              <option value="SALES">Vendas</option>
              <option value="TICKET">Ticket Médio</option>
              <option value="ITEMS">Itens Vendidos</option>
            </select>
          </div>
          <div>
            <label className="mercatto-label">Funcionário (opcional)</label>
            <select name="employeeId" className="mercatto-input">
              <option value="">Meta da Loja</option>
              {employees?.employees?.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <Input label="Valor Alvo (R$)" name="target" type="number" step="0.01" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Início" name="periodStart" type="date" required />
            <Input label="Fim" name="periodEnd" type="date" required />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>Criar Meta</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
