"use client";

import { Plus, Search, User } from "lucide-react";
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
import { useApi, apiPost } from "@/hooks/use-api";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  cpfCnpj: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  birthDate: string | null;
  totalSpent: string;
  visitCount: number;
  loyaltyPoints: number;
  active: boolean;
}

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, loading, refetch } = useApi<{ customers: Customer[] }>(
    `/api/customers?search=${encodeURIComponent(search)}`,
    [search]
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiPost("/api/customers", {
        name: fd.get("name"),
        cpfCnpj: fd.get("cpfCnpj") || undefined,
        email: fd.get("email") || undefined,
        phone: fd.get("phone") || undefined,
        whatsapp: fd.get("whatsapp") || undefined,
        birthDate: fd.get("birthDate") || undefined,
      });
      setModalOpen(false);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  }

  const customers = data?.customers ?? [];

  return (
    <div>
      <PageHeader
        title="Clientes (CRM)"
        description="Cadastro, histórico de compras e ticket médio"
        actions={<Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Novo Cliente</Button>}
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input className="mercatto-input pl-10" placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-mercatto-600 border-t-transparent" />
            </div>
          ) : customers.length === 0 ? (
            <p className="p-8 text-center text-gray-500">Nenhum cliente cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Total Gasto</TableHead>
                  <TableHead>Visitas</TableHead>
                  <TableHead>Pontos</TableHead>
                  <TableHead>Aniversário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mercatto-100">
                          <User className="h-4 w-4 text-mercatto-700" />
                        </div>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.cpfCnpj || "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{c.phone || c.whatsapp || "—"}</p>
                      <p className="text-xs text-gray-500">{c.email || ""}</p>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(parseFloat(c.totalSpent))}</TableCell>
                    <TableCell>{c.visitCount}</TableCell>
                    <TableCell><Badge variant="info">{c.loyaltyPoints} pts</Badge></TableCell>
                    <TableCell>{c.birthDate ? formatDate(c.birthDate) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Cliente">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Nome" name="name" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="CPF/CNPJ" name="cpfCnpj" />
            <Input label="E-mail" name="email" type="email" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Telefone" name="phone" />
            <Input label="WhatsApp" name="whatsapp" />
          </div>
          <Input label="Data de Nascimento" name="birthDate" type="date" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
