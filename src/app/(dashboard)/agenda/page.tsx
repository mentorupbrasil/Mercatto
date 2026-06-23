"use client";

import { Calendar, Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useApi, apiPost } from "@/hooks/use-api";
import { formatDateTime } from "@/lib/utils";

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  type: string;
  startAt: string;
  endAt: string;
  status: string;
  customer?: { name: string };
  user?: { name: string };
}

const typeLabels: Record<string, string> = {
  GENERAL: "Geral", FITTING: "Prova", VIP: "VIP", EXAM: "Exame",
  GROOMING: "Banho/Tosa", DELIVERY: "Entrega", REPAIR: "Reparo", CONSULTATION: "Consulta",
};

const statusVariant: Record<string, "success" | "warning" | "info" | "danger" | "default"> = {
  SCHEDULED: "info", CONFIRMED: "success", COMPLETED: "default",
  CANCELLED: "danger", NO_SHOW: "warning",
};

export default function AgendaPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, loading, refetch } = useApi<{ appointments: Appointment[] }>("/api/appointments");
  const { data: customers } = useApi<{ customers: { id: string; name: string }[] }>("/api/customers");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const date = fd.get("date") as string;
    const startTime = fd.get("startTime") as string;
    const endTime = fd.get("endTime") as string;
    try {
      await apiPost("/api/appointments", {
        title: fd.get("title"),
        type: fd.get("type"),
        customerId: fd.get("customerId") || undefined,
        description: fd.get("description") || undefined,
        startAt: `${date}T${startTime}:00`,
        endAt: `${date}T${endTime}:00`,
      });
      setModalOpen(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  const appointments = data?.appointments ?? [];

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Provas, atendimentos VIP, exames e entregas"
        actions={<Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Agendar</Button>}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-mercatto-600 border-t-transparent" />
            </div>
          ) : appointments.length === 0 ? (
            <p className="p-8 text-center text-gray-500">Nenhum agendamento.</p>
          ) : (
            <div className="divide-y">
              {appointments.map((a) => (
                <div key={a.id} className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mercatto-50">
                    <Calendar className="h-5 w-5 text-mercatto-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-sm text-gray-500">
                      {formatDateTime(a.startAt)} — {a.customer?.name || "Sem cliente"}
                    </p>
                  </div>
                  <Badge variant="info">{typeLabels[a.type] || a.type}</Badge>
                  <Badge variant={statusVariant[a.status] || "default"}>{a.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Agendamento">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Título" name="title" required />
          <div>
            <label className="mercatto-label">Tipo</label>
            <select name="type" className="mercatto-input">
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mercatto-label">Cliente</label>
            <select name="customerId" className="mercatto-input">
              <option value="">Sem cliente</option>
              {customers?.customers?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Input label="Data" name="date" type="date" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Início" name="startTime" type="time" required />
            <Input label="Fim" name="endTime" type="time" required />
          </div>
          <Input label="Descrição" name="description" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>Agendar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
