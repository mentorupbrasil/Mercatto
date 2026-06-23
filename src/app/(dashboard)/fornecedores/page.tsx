"use client";

import { Plus, Truck } from "lucide-react";
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

interface Supplier {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  deliveryDays: number | null;
  active: boolean;
}

export default function FornecedoresPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, loading, refetch } = useApi<{ suppliers: Supplier[] }>("/api/suppliers");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await apiPost("/api/suppliers", {
        name: fd.get("name"),
        cnpj: fd.get("cnpj") || undefined,
        email: fd.get("email") || undefined,
        phone: fd.get("phone") || undefined,
        deliveryDays: parseInt(fd.get("deliveryDays") as string) || undefined,
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
        title="Fornecedores"
        description="Cadastro, contratos e histórico de compras"
        actions={<Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Novo Fornecedor</Button>}
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-mercatto-600 border-t-transparent" />
            </div>
          ) : !data?.suppliers?.length ? (
            <p className="p-8 text-center text-gray-500">Nenhum fornecedor cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Prazo Entrega</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{s.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{s.cnpj || "—"}</TableCell>
                    <TableCell>
                      <p className="text-sm">{s.phone || "—"}</p>
                      <p className="text-xs text-gray-500">{s.email || ""}</p>
                    </TableCell>
                    <TableCell>{s.deliveryDays ? `${s.deliveryDays} dias` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={s.active ? "success" : "default"}>
                        {s.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Fornecedor">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Nome" name="name" required />
          <Input label="CNPJ" name="cnpj" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="E-mail" name="email" type="email" />
            <Input label="Telefone" name="phone" />
          </div>
          <Input label="Prazo de Entrega (dias)" name="deliveryDays" type="number" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
