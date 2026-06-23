"use client";

import { FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { formatCurrency } from "@/lib/utils";

interface DRE {
  grossRevenue: number;
  discounts: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  operatingProfit: number;
  margin: number;
}

function DRELine({ label, value, bold, negative }: { label: string; value: number; bold?: boolean; negative?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-gray-100 py-3 ${bold ? "font-bold text-gray-900" : "text-gray-700"}`}>
      <span>{label}</span>
      <span className={negative && value > 0 ? "text-red-600" : ""}>
        {negative && value > 0 ? "(-) " : ""}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

export default function DREPage() {
  const { data, loading } = useApi<DRE>("/api/analytics/dre");

  if (loading) {
    return <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-mercatto-600 border-t-transparent" />
    </div>;
  }

  const dre = data ?? {
    grossRevenue: 0, discounts: 0, netRevenue: 0, cogs: 0,
    grossProfit: 0, expenses: 0, operatingProfit: 0, margin: 0,
  };

  return (
    <div>
      <PageHeader title="DRE Gerencial" description="Demonstração do Resultado do Exercício" />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              DRE — Mês Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DRELine label="Receita Bruta" value={dre.grossRevenue} bold />
            <DRELine label="Descontos" value={dre.discounts} negative />
            <DRELine label="Receita Líquida" value={dre.netRevenue} bold />
            <DRELine label="Custos (CMV)" value={dre.cogs} negative />
            <DRELine label="Lucro Bruto" value={dre.grossProfit} bold />
            <DRELine label="Despesas Operacionais" value={dre.expenses} negative />
            <DRELine label="Lucro Operacional" value={dre.operatingProfit} bold />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Margem Operacional</p>
            <p className={`mt-2 text-4xl font-bold ${dre.margin >= 0 ? "text-mercatto-700" : "text-red-600"}`}>
              {dre.margin.toFixed(1)}%
            </p>
            <div className="mt-6 space-y-3">
              <div className="rounded-lg bg-green-50 p-3">
                <p className="text-xs text-green-600">Lucro Bruto</p>
                <p className="font-semibold text-green-800">{formatCurrency(dre.grossProfit)}</p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-600">Receita Líquida</p>
                <p className="font-semibold text-blue-800">{formatCurrency(dre.netRevenue)}</p>
              </div>
              <div className={`rounded-lg p-3 ${dre.operatingProfit >= 0 ? "bg-mercatto-50" : "bg-red-50"}`}>
                <p className={`text-xs ${dre.operatingProfit >= 0 ? "text-mercatto-600" : "text-red-600"}`}>
                  Resultado Final
                </p>
                <p className={`font-semibold ${dre.operatingProfit >= 0 ? "text-mercatto-800" : "text-red-800"}`}>
                  {formatCurrency(dre.operatingProfit)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
