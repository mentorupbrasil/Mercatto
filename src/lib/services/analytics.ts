import prisma from "../db";
import { subDays } from "date-fns";

interface PurchasePrediction {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  avgDailySales: number;
  daysUntilStockout: number;
  suggestedQty: number;
  urgency: "critical" | "high" | "medium" | "low";
}

export async function predictPurchaseNeeds(
  organizationId: string,
  branchId?: string,
  daysToAnalyze = 30
): Promise<PurchasePrediction[]> {
  const since = subDays(new Date(), daysToAnalyze);

  const products = await prisma.product.findMany({
    where: { organizationId, active: true },
    include: {
      stock: branchId ? { where: { branchId } } : true,
      saleItems: {
        where: { sale: { createdAt: { gte: since }, status: "COMPLETED" } },
      },
    },
  });

  return products
    .map((product) => {
      const currentStock = product.stock.reduce((s, st) => s + st.quantity, 0);
      const totalSold = product.saleItems.reduce((s, item) => s + item.quantity, 0);
      const avgDailySales = totalSold / daysToAnalyze;
      const daysUntilStockout =
        avgDailySales > 0 ? Math.floor(currentStock / avgDailySales) : 999;
      const leadTimeDays = 7;
      const suggestedQty = Math.max(
        0,
        Math.ceil(avgDailySales * (leadTimeDays + 14)) - currentStock
      );

      let urgency: PurchasePrediction["urgency"] = "low";
      if (currentStock <= 0) urgency = "critical";
      else if (currentStock <= product.minStock) urgency = "high";
      else if (daysUntilStockout <= 7) urgency = "medium";

      return {
        productId: product.id,
        productName: product.name,
        currentStock,
        minStock: product.minStock,
        avgDailySales: Math.round(avgDailySales * 100) / 100,
        daysUntilStockout,
        suggestedQty,
        urgency,
      };
    })
    .filter((p) => p.suggestedQty > 0 || p.urgency !== "low")
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.urgency] - order[b.urgency];
    });
}

export async function getDRE(organizationId: string, startDate: Date, endDate: Date) {
  const [sales, payables, purchases] = await Promise.all([
    prisma.sale.aggregate({
      where: {
        organizationId,
        status: "COMPLETED",
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { total: true, discount: true, costTotal: true },
    }),
    prisma.accountPayable.aggregate({
      where: {
        organizationId,
        paidDate: { gte: startDate, lte: endDate },
        status: "PAID",
      },
      _sum: { amount: true },
    }),
    prisma.purchase.aggregate({
      where: {
        organizationId,
        receivedAt: { gte: startDate, lte: endDate },
        status: "RECEIVED",
      },
      _sum: { total: true },
    }),
  ]);

  const grossRevenue = Number(sales._sum.total || 0);
  const discounts = Number(sales._sum.discount || 0);
  const netRevenue = grossRevenue;
  const cogs = Number(sales._sum.costTotal || 0);
  const grossProfit = netRevenue - cogs;
  const expenses = Number(payables._sum.amount || 0);
  const operatingProfit = grossProfit - expenses;

  return {
    grossRevenue,
    discounts,
    netRevenue,
    cogs,
    grossProfit,
    expenses,
    operatingProfit,
    margin: grossRevenue > 0 ? (operatingProfit / grossRevenue) * 100 : 0,
  };
}

export async function getABCCurve(organizationId: string, days = 90) {
  const since = subDays(new Date(), days);

  const items = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: { sale: { organizationId, status: "COMPLETED", createdAt: { gte: since } } },
    _sum: { total: true, quantity: true },
    orderBy: { _sum: { total: "desc" } },
  });

  const totalRevenue = items.reduce((s, i) => s + Number(i._sum.total || 0), 0);
  let cumulative = 0;

  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  return items.map((item) => {
    const revenue = Number(item._sum.total || 0);
    cumulative += revenue;
    const pct = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
    let curve = "C";
    if (pct <= 80) curve = "A";
    else if (pct <= 95) curve = "B";

    return {
      productId: item.productId,
      name: productMap[item.productId],
      revenue,
      quantity: item._sum.quantity,
      cumulativePct: Math.round(pct * 100) / 100,
      curve,
    };
  });
}
