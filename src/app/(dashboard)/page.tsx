"use client";

import {
  AlertTriangle,
  Cake,
  Calendar,
  CreditCard,
  DollarSign,
  Receipt,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface DashboardData {
  today: { revenue: number; profit: number; salesCount: number };
  month: { revenue: number; profit: number; salesCount: number };
  payables: { total: number; count: number };
  receivables: { total: number; count: number };
  lowStock: { id: string; name: string; minStock: number; current: number }[];
  birthdays: { id: string; name: string; birthDate: string }[];
  appointments: {
    id: string;
    title: string;
    startAt: string;
    customer?: { name: string };
    user?: { name: string };
  }[];
  sellerRanking: { name: string; total: number; count: number }[];
  cashFlow: { date: string; inflow: number; outflow: number; balance: number }[];
}

export default function DashboardPage() {
  const { data, loading, error } = useApi<DashboardData>("/api/dashboard");

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-mercatto-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-600">
        {error || "Erro ao carregar dashboard. Configure o banco de dados e execute o seed."}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral da sua loja em tempo real"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Faturamento Hoje"
          value={formatCurrency(data.today.revenue)}
          icon={DollarSign}
        />
        <StatCard
          title="Lucro Estimado Hoje"
          value={formatCurrency(data.today.profit)}
          icon={TrendingUp}
        />
        <StatCard
          title="Vendas do Mês"
          value={formatCurrency(data.month.revenue)}
          icon={Receipt}
        />
        <StatCard
          title="Vendas Hoje"
          value={String(data.today.salesCount)}
          icon={Users}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fluxo de Caixa (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={data.cashFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Area
                  type="monotone"
                  dataKey="inflow"
                  name="Entradas"
                  stroke="#16a34a"
                  fill="#dcfce7"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="outflow"
                  name="Saídas"
                  stroke="#ef4444"
                  fill="#fee2e2"
                  stackId="2"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-mercatto-600" />
              Ranking de Vendedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.sellerRanking.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma venda registrada.</p>
            ) : (
              <ul className="space-y-3">
                {data.sellerRanking.map((seller, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-mercatto-100 text-xs font-bold text-mercatto-700">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium">{seller.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-mercatto-700">
                      {formatCurrency(seller.total)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4 text-red-500" />
              Contas a Pagar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.payables.total)}</p>
            <p className="text-sm text-gray-500">{data.payables.count} título(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-blue-500" />
              Contas a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(data.receivables.total)}</p>
            <p className="text-sm text-gray-500">{data.receivables.count} título(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.lowStock.length === 0 ? (
              <p className="text-sm text-gray-500">Estoque OK</p>
            ) : (
              <ul className="space-y-1">
                {data.lowStock.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex justify-between text-sm">
                    <span className="truncate">{item.name}</span>
                    <Badge variant="warning">{item.current} un</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cake className="h-4 w-4 text-pink-500" />
              Aniversariantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.birthdays.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum hoje</p>
            ) : (
              <ul className="space-y-1">
                {data.birthdays.map((c) => (
                  <li key={c.id} className="text-sm font-medium">
                    🎂 {c.name}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-mercatto-600" />
            Agendamentos de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.appointments.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum agendamento para hoje.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.appointments.map((apt) => (
                <div key={apt.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{apt.title}</p>
                    <p className="text-sm text-gray-500">
                      {apt.customer?.name || "Sem cliente"} • {formatDateTime(apt.startAt)}
                    </p>
                  </div>
                  <Badge variant="success">Agendado</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
