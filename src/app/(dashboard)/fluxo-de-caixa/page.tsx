"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

interface DashboardData {
  cashFlow: { date: string; inflow: number; outflow: number; balance: number }[];
  payables: { total: number };
  receivables: { total: number };
  today: { revenue: number };
  month: { revenue: number };
}

export default function FluxoCaixaPage() {
  const { data, loading } = useApi<DashboardData>("/api/dashboard");

  if (loading) {
    return <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-mercatto-600 border-t-transparent" />
    </div>;
  }

  const totalInflow = data?.cashFlow?.reduce((s, d) => s + d.inflow, 0) ?? 0;
  const totalOutflow = data?.cashFlow?.reduce((s, d) => s + d.outflow, 0) ?? 0;
  const balance = totalInflow - totalOutflow;

  return (
    <div>
      <PageHeader title="Fluxo de Caixa" description="Entradas, saídas e saldo consolidado" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Entradas (30 dias)</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalInflow)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Saídas (30 dias)</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutflow)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-gray-500">Saldo</p>
            <p className={`text-2xl font-bold ${balance >= 0 ? "text-mercatto-700" : "text-red-600"}`}>
              {formatCurrency(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Evolução Diária</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={data?.cashFlow ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={formatDate} />
              <Area type="monotone" dataKey="inflow" name="Entradas" stroke="#16a34a" fill="#dcfce7" />
              <Area type="monotone" dataKey="outflow" name="Saídas" stroke="#ef4444" fill="#fee2e2" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
