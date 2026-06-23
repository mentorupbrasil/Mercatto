"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-amber-500" />
      <h2 className="mt-4 text-xl font-bold text-gray-900">Algo deu errado</h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        Ocorreu um erro ao carregar esta página. Tente novamente ou volte ao dashboard.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Tentar novamente</Button>
        <Button variant="secondary" onClick={() => (window.location.href = "/")}>
          Ir ao Dashboard
        </Button>
      </div>
    </div>
  );
}
