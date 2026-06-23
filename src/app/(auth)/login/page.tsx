"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "E-mail ou senha inválidos.");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login.");
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
        <h1 className="text-2xl font-bold text-gray-900">Entrar no Mercatto</h1>
        <p className="mt-2 text-sm text-gray-500">
          Gerencie sua loja com inteligência e praticidade.
        </p>
      </div>

      <Card className="shadow-lg shadow-gray-200/50">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Entrar
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Não tem uma conta?{" "}
            <Link
              href="/register"
              className="font-medium text-mercatto-600 hover:text-mercatto-700"
            >
              Cadastre sua loja
            </Link>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Mercatto. Todos os direitos reservados.
      </p>
    </div>
  );
}
