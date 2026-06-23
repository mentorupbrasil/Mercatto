"use client";

import { Plus, UserCog } from "lucide-react";
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
import { SelectField } from "@/components/ui/select-field";
import { useCatalog, toNameOptions } from "@/hooks/use-catalog";
import { useApi, apiPost } from "@/hooks/use-api";
import { formatCurrency } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  role: string | null;
  commissionRate: string;
  salary: string | null;
  active: boolean;
  user?: { email: string; role: string };
}

export default function FuncionariosPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, loading, refetch } = useApi<{ employees: Employee[] }>("/api/employees");
  const { data: catalog } = useCatalog();

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiPost("/api/employees", {
        name: fd.get("name"),
        role: fd.get("role") || undefined,
        commissionRate: parseFloat(fd.get("commissionRate") as string) || 0,
        salary: parseFloat(fd.get("salary") as string) || undefined,
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
        title="Funcionários"
        description="Cargos, comissões, escalas e ranking de vendas"
        actions={<Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Novo Funcionário</Button>}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-mercatto-600 border-t-transparent" />
            </div>
          ) : !data?.employees?.length ? (
            <p className="p-8 text-center text-gray-500">Nenhum funcionário cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Salário</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.employees.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{e.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{e.role || "—"}</TableCell>
                    <TableCell>{parseFloat(e.commissionRate)}%</TableCell>
                    <TableCell>{e.salary ? formatCurrency(parseFloat(e.salary)) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={e.active ? "success" : "default"}>
                        {e.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Funcionário">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Nome" name="name" required />
          <SelectField
            label="Cargo"
            name="role"
            options={toNameOptions(catalog?.employeeRoles ?? [])}
            placeholder="Selecione o cargo"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Comissão (%)" name="commissionRate" type="number" step="0.1" defaultValue="0" />
            <Input label="Salário (R$)" name="salary" type="number" step="0.01" />
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
