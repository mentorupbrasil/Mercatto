import prisma from "../db";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays } from "date-fns";

export async function getDashboardMetrics(organizationId: string, branchId?: string) {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const branchFilter = branchId ? { branchId } : {};

  const [todaySales, monthSales, payables, receivables, lowStock, birthdays, appointments, sellers] =
    await Promise.all([
      prisma.sale.aggregate({
        where: {
          organizationId,
          ...branchFilter,
          status: "COMPLETED",
          createdAt: { gte: dayStart, lte: dayEnd },
        },
        _sum: { total: true, costTotal: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: {
          organizationId,
          ...branchFilter,
          status: "COMPLETED",
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { total: true, costTotal: true },
        _count: true,
      }),
      prisma.accountPayable.aggregate({
        where: { organizationId, status: { in: ["OPEN", "OVERDUE"] } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.accountReceivable.aggregate({
        where: { organizationId, status: { in: ["OPEN", "OVERDUE"] } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.product.findMany({
        where: { organizationId, active: true },
        include: { stock: branchId ? { where: { branchId } } : true },
        take: 100,
      }),
      prisma.customer.findMany({
        where: {
          organizationId,
          active: true,
          birthDate: { not: null },
        },
        take: 50,
      }),
      prisma.appointment.findMany({
        where: {
          organizationId,
          startAt: { gte: dayStart, lte: dayEnd },
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
        include: { customer: true, user: true },
        orderBy: { startAt: "asc" },
      }),
      prisma.sale.groupBy({
        by: ["sellerId"],
        where: {
          organizationId,
          ...branchFilter,
          status: "COMPLETED",
          createdAt: { gte: monthStart, lte: monthEnd },
          sellerId: { not: null },
        },
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: "desc" } },
        take: 10,
      }),
    ]);

  const lowStockItems = lowStock
    .map((p) => ({
      id: p.id,
      name: p.name,
      minStock: p.minStock,
      current: p.stock.reduce((s, st) => s + st.quantity, 0),
    }))
    .filter((p) => p.current <= p.minStock)
    .slice(0, 10);

  const todayBirthdays = birthdays.filter((c) => {
    if (!c.birthDate) return false;
    const bd = new Date(c.birthDate);
    return bd.getDate() === today.getDate() && bd.getMonth() === today.getMonth();
  });

  const sellerIds = sellers.map((s) => s.sellerId).filter(Boolean) as string[];
  const sellerUsers = sellerIds.length
    ? await prisma.user.findMany({ where: { id: { in: sellerIds } } })
    : [];
  const sellerMap = Object.fromEntries(sellerUsers.map((u) => [u.id, u.name]));

  const sellerRanking = sellers.map((s) => ({
    sellerId: s.sellerId,
    name: sellerMap[s.sellerId!] || "Desconhecido",
    total: Number(s._sum.total || 0),
    count: s._count,
  }));

  const todayRevenue = Number(todaySales._sum.total || 0);
  const todayCost = Number(todaySales._sum.costTotal || 0);
  const monthRevenue = Number(monthSales._sum.total || 0);
  const monthCost = Number(monthSales._sum.costTotal || 0);

  // Cash flow last 30 days
  const thirtyDaysAgo = subDays(today, 30);
  const recentSales = await prisma.sale.findMany({
    where: {
      organizationId,
      status: "COMPLETED",
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { total: true, createdAt: true },
  });

  const recentPayables = await prisma.accountPayable.findMany({
    where: {
      organizationId,
      paidDate: { gte: thirtyDaysAgo },
      status: "PAID",
    },
    select: { amount: true, paidDate: true },
  });

  const cashFlow = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(today, 29 - i);
    const dateStr = date.toISOString().split("T")[0];
    const inflow = recentSales
      .filter((s) => s.createdAt.toISOString().split("T")[0] === dateStr)
      .reduce((sum, s) => sum + Number(s.total), 0);
    const outflow = recentPayables
      .filter((p) => p.paidDate && p.paidDate.toISOString().split("T")[0] === dateStr)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return { date: dateStr, inflow, outflow, balance: inflow - outflow };
  });

  return {
    today: {
      revenue: todayRevenue,
      profit: todayRevenue - todayCost,
      salesCount: todaySales._count,
    },
    month: {
      revenue: monthRevenue,
      profit: monthRevenue - monthCost,
      salesCount: monthSales._count,
    },
    payables: {
      total: Number(payables._sum.amount || 0),
      count: payables._count,
    },
    receivables: {
      total: Number(receivables._sum.amount || 0),
      count: receivables._count,
    },
    lowStock: lowStockItems,
    birthdays: todayBirthdays.slice(0, 5),
    appointments,
    sellerRanking,
    cashFlow,
  };
}
