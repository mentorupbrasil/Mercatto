"use client";

import { Shield } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { formatDateTime } from "@/lib/utils";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user?: { name: string; email: string };
}

export default function AuditoriaPage() {
  const { data, loading } = useApi<{ logs: AuditLog[] }>("/api/audit");

  const logs = data?.logs ?? [];

  return (
    <div>
      <PageHeader title="Auditoria" description="Registro completo de ações no sistema" />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-mercatto-600 border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">Nenhum registro de auditoria ainda.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell>{log.user?.name || "Sistema"}</TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>{log.entity}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-gray-500">
                      {log.newValue ? log.newValue.slice(0, 80) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
