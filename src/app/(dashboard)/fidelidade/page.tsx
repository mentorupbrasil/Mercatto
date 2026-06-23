"use client";

import { Gift, Star } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";

interface LoyaltyProgram {
  id: string;
  name: string;
  type: string;
  pointsPerReal: string;
  cashbackRate: string;
  active: boolean;
  coupons: { id: string; code: string; discountType: string; discountValue: string; usedCount: number; maxUses: number | null; active: boolean }[];
}

export default function FidelidadePage() {
  const { data, loading } = useApi<{ program: LoyaltyProgram | null }>("/api/loyalty");

  if (loading) {
    return <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-mercatto-600 border-t-transparent" />
    </div>;
  }

  const program = data?.program;

  return (
    <div>
      <PageHeader title="Programa de Fidelidade" description="Cashback, pontuação e cupons de desconto" />

      {program ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                {program.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-mercatto-50 p-4">
                  <p className="text-sm text-gray-500">Pontos por R$1</p>
                  <p className="text-2xl font-bold text-mercatto-700">{program.pointsPerReal}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-gray-500">Cashback</p>
                  <p className="text-2xl font-bold text-blue-700">{program.cashbackRate}%</p>
                </div>
              </div>
              <Badge variant={program.active ? "success" : "default"}>
                {program.active ? "Programa Ativo" : "Inativo"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-500" />
                Cupons
              </CardTitle>
            </CardHeader>
            <CardContent>
              {program.coupons.length === 0 ? (
                <p className="text-sm text-gray-500">Nenhum cupom cadastrado.</p>
              ) : (
                <ul className="space-y-2">
                  {program.coupons.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-mono font-bold">{c.code}</p>
                        <p className="text-sm text-gray-500">
                          {c.discountType === "percent" ? `${c.discountValue}%` : `R$ ${c.discountValue}`} de desconto
                        </p>
                      </div>
                      <Badge variant={c.active ? "success" : "default"}>
                        {c.usedCount}/{c.maxUses ?? "∞"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Gift className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">Configure um programa de fidelidade nas configurações.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
