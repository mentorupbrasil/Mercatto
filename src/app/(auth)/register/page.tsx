"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ShoppingBag } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      storeName: (formData.get("storeName") as string).trim(),
      ownerName: (formData.get("ownerName") as string).trim(),
      email: (formData.get("email") as string).trim(),
      password: formData.get("password") as string,
    };

    if (payload.password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      setIsLoading(false);
      return;
    }
    if (!/[a-zA-Z]/.test(payload.password) || !/[0-9]/.test(payload.password)) {
      setError("A senha deve conter letras e números.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao criar conta.");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-mercatto-600 shadow-lg shadow-mercatto-600/25">
          <ShoppingBag className="h-7 w-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Cadastre sua loja</h1>
        <p className="mt-2 text-sm text-gray-500">
          Comece a gerenciar produtos, vendas e finanças em minutos.
        </p>
      </div>

      <Card className="shadow-lg shadow-gray-200/50">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome da loja"
              name="storeName"
              type="text"
              placeholder="Minha Loja"
              required
              autoComplete="organization"
            />
            <Input
              label="Seu nome"
              name="ownerName"
              type="text"
              placeholder="João Silva"
              required
              autoComplete="name"
            />
            <Input
              label="E-mail"
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
              autoComplete="email"
            />
            <Input
              label="Senha"
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
              autoComplete="new-password"
              hint="Use pelo menos 8 caracteres com letras e números."
            />

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              <Building2 className="h-4 w-4" />
              Criar conta
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Já tem uma conta?{" "}
            <Link
              href="/login"
              className="font-medium text-mercatto-600 hover:text-mercatto-700"
            >
              Fazer login
            </Link>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-gray-400">
        Ao criar uma conta, você concorda com nossos termos de uso.
      </p>
    </div>
  );
}
