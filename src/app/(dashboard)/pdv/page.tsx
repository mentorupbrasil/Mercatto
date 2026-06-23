"use client";

import { CreditCard, Minus, Plus, ShoppingCart, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApi, apiPost } from "@/hooks/use-api";
import { formatCurrency } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: string;
  internalCode: string;
  barcode: string | null;
  stock: { quantity: number }[];
}

interface CartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

const paymentMethods = [
  { value: "CASH", label: "Dinheiro", icon: Wallet },
  { value: "PIX", label: "PIX", icon: CreditCard },
  { value: "DEBIT_CARD", label: "Débito", icon: CreditCard },
  { value: "CREDIT_CARD", label: "Crédito", icon: CreditCard },
];

export default function PDVPage() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [processing, setProcessing] = useState(false);
  const { data: productsData } = useApi<{ products: Product[] }>(
    `/api/products?search=${encodeURIComponent(search)}&limit=20`,
    [search]
  );
  const { data: branches } = useApi<{ branches: { id: string; name: string; isMain: boolean }[] }>("/api/branches");

  const products = productsData?.products ?? [];
  const mainBranch = branches?.branches?.find((b) => b.isMain) || branches?.branches?.[0];
  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  function addToCart(product: Product) {
    const price = parseFloat(product.price);
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { productId: product.id, name: product.name, unitPrice: price, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  async function finalizeSale() {
    if (!mainBranch || cart.length === 0) return;
    setProcessing(true);
    try {
      await apiPost("/api/sales", {
        branchId: mainBranch.id,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        paymentMethod,
      });
      setCart([]);
      alert("Venda finalizada com sucesso!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao finalizar venda");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div>
      <PageHeader title="PDV — Caixa" description="Ponto de venda com múltiplas formas de pagamento" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4">
              <input
                className="mercatto-input text-lg"
                placeholder="Buscar produto por nome ou código de barras..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((p) => {
              const stock = p.stock.reduce((s, st) => s + st.quantity, 0);
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  disabled={stock <= 0}
                  className="mercatto-card flex items-center justify-between p-4 text-left transition-all hover:border-mercatto-300 hover:shadow-md disabled:opacity-50"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.internalCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-mercatto-700">
                      {formatCurrency(parseFloat(p.price))}
                    </p>
                    <Badge variant={stock > 0 ? "success" : "danger"}>{stock} un</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Carrinho ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">Carrinho vazio</p>
            ) : (
              <ul className="space-y-3">
                {cart.map((item) => (
                  <li key={item.productId} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(item.unitPrice)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(item.productId, -1)}
                        className="rounded p-1 hover:bg-gray-100"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.productId, 1)}
                        className="rounded p-1 hover:bg-gray-100"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => updateQty(item.productId, -item.quantity)}
                        className="rounded p-1 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-mercatto-700">{formatCurrency(subtotal)}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {paymentMethods.map((pm) => {
                const Icon = pm.icon;
                return (
                  <button
                    key={pm.value}
                    onClick={() => setPaymentMethod(pm.value)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      paymentMethod === pm.value
                        ? "border-mercatto-500 bg-mercatto-50 text-mercatto-700"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {pm.label}
                  </button>
                );
              })}
            </div>

            <Button
              className="mt-4 w-full"
              size="lg"
              disabled={cart.length === 0}
              isLoading={processing}
              onClick={finalizeSale}
            >
              Finalizar Venda
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
