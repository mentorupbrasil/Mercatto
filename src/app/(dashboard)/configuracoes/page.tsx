"use client";

import { Building2, MapPin, Settings, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { ROLE_LABELS } from "@/lib/permissions";

interface MeData {
  user: {
    name: string;
    email: string;
    role: string;
    organization: { name: string; slug: string; segment: string; plan: string; cnpj: string | null };
  };
}

interface Branch {
  id: string;
  name: string;
  code: string;
  city: string | null;
  isMain: boolean;
  active: boolean;
}

export default function ConfiguracoesPage() {
  const { data: me } = useApi<MeData>("/api/auth/me");
  const { data: branches } = useApi<{ branches: Branch[] }>("/api/branches");

  const segmentLabels: Record<string, string> = {
    GENERAL: "Geral", CLOTHING: "Roupas", FOOTWEAR: "Calçados",
    STATIONERY: "Papelaria", AUTO_PARTS: "Autopeças", CONSTRUCTION: "Construção",
    CONVENIENCE: "Conveniência", SUPERMARKET: "Supermercado",
    OPTICAL: "Ótica", PET_SHOP: "Pet Shop", TECH_REPAIR: "Assistência Técnica",
  };

  return (
    <div>
      <PageHeader title="Configurações" description="Empresa, filiais, usuários e plano" />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Nome</p>
              <p className="font-medium">{me?.user?.organization?.name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">CNPJ</p>
              <p className="font-medium">{me?.user?.organization?.cnpj || "—"}</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="info">
                {segmentLabels[me?.user?.organization?.segment ?? ""] || me?.user?.organization?.segment}
              </Badge>
              <Badge variant="success">{me?.user?.organization?.plan || "STARTER"}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuário Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Nome</p>
              <p className="font-medium">{me?.user?.name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">E-mail</p>
              <p className="font-medium">{me?.user?.email || "—"}</p>
            </div>
            <Badge variant="info">
              {ROLE_LABELS[me?.user?.role as keyof typeof ROLE_LABELS] || me?.user?.role}
            </Badge>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Filiais (Multi-unidade)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!branches?.branches?.length ? (
              <p className="text-sm text-gray-500">Nenhuma filial cadastrada.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {branches.branches.map((b) => (
                  <div key={b.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{b.name}</p>
                      {b.isMain && <Badge variant="success">Matriz</Badge>}
                    </div>
                    <p className="text-sm text-gray-500">{b.code} • {b.city || "—"}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Módulos Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                "Dashboard", "Produtos c/ Grade", "Estoque", "Compras c/ IA",
                "PDV", "Fluxo de Caixa", "Contas a Pagar/Receber", "CRM",
                "Fidelidade", "Fornecedores", "Agenda", "Funcionários",
                "Metas", "Relatórios ABC", "DRE", "Multi-empresa",
                "Transferência entre Filiais", "Auditoria", "RBAC",
              ].map((mod) => (
                <Badge key={mod} variant="success">{mod}</Badge>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-500">
              Próximas integrações: NFC-e/NF-e, PIX automático, WhatsApp, conciliação bancária.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
