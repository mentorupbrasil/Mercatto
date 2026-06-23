"use client";

import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { formatCurrency } from "@/lib/utils";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

interface ABCCurve {
  productId: string;
  name: string;
  revenue: number;
  quantity: number | null;
  cumulativePct: number;
  curve: string;
}

interface DashboardData {
  month: { revenue: number; salesCount: number };
  today: { revenue: number; salesCount: number };
}

export default function RelatoriosPage() {
  const { data: abc, loading: abcLoading } = useApi<ABCCurve[]>("/api/analytics/abc");
  const { data: dash } = useApi<DashboardData>("/api/dashboard");

  const ticketMedio = dash?.month?.salesCount
    ? dash.month.revenue / dash.month.salesCount
    : 0;

  const curveColors: Record<string, "success" | "warning" | "default"> = {
    A: "success", B: "warning", C: "default",
  };

  return (
    <div>
      <PageHeader title="Relatórios" description="Análises comerciais, estoque e financeiras" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Faturamento do Mês</p>
            <p className="text-2xl font-bold">{formatCurrency(dash?.month?.revenue ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Vendas do Mês</p>
            <p className="text-2xl font-bold">{dash?.month?.salesCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Ticket Médio</p>
            <p className="text-2xl font-bold">{formatCurrency(ticketMedio)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Curva ABC de Produtos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {abcLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-mercatto-600 border-t-transparent" />
            </div>
          ) : !abc?.length ? (
            <p className="text-sm text-gray-500">Sem dados de vendas para análise.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={250} className="mb-6">
                <BarChart data={abc.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Receita</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>% Acumulado</TableHead>
                    <TableHead>Curva</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abc.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{formatCurrency(item.revenue)}</TableCell>
                      <TableCell>{item.quantity ?? 0}</TableCell>
                      <TableCell>{item.cumulativePct}%</TableCell>
                      <TableCell>
                        <Badge variant={curveColors[item.curve] || "default"}>
                          Curva {item.curve}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
