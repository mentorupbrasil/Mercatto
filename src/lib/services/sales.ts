import prisma from "../db";
import { adjustStock } from "./stock";
import { logAudit } from "../audit";

interface SaleItemInput {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

export async function createSale(params: {
  organizationId: string;
  branchId: string;
  customerId?: string;
  sellerId?: string;
  cashRegisterId?: string;
  items: SaleItemInput[];
  discount?: number;
  paymentMethod: string;
  payments?: { method: string; amount: number }[];
  notes?: string;
}) {
  const org = await prisma.organization.findUnique({
    where: { id: params.organizationId },
  });
  if (!org) throw new Error("Organização não encontrada");

  const saleCount = await prisma.sale.count({
    where: { organizationId: params.organizationId },
  });
  const number = `V${String(saleCount + 1).padStart(6, "0")}`;

  let subtotal = 0;
  let costTotal = 0;
  const saleItems: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
    cost: number;
  }> = [];

  for (const item of params.items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { variants: item.variantId ? { where: { id: item.variantId } } : false },
    });
    if (!product) throw new Error(`Produto ${item.productId} não encontrado`);

    const variant = item.variantId
      ? product.variants?.find((v) => v.id === item.variantId)
      : null;
    const cost = Number(variant?.cost ?? product.cost);
    const price = item.unitPrice || Number(variant?.price ?? product.price);
    const discount = item.discount || 0;
    const total = price * item.quantity - discount;

    subtotal += total;
    costTotal += cost * item.quantity;

    saleItems.push({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: price,
      discount,
      total,
      cost,
    });
  }

  const discount = params.discount || 0;
  const total = subtotal - discount;

  const sale = await prisma.$transaction(async (tx) => {
    const newSale = await tx.sale.create({
      data: {
        organizationId: params.organizationId,
        branchId: params.branchId,
        number,
        customerId: params.customerId,
        sellerId: params.sellerId,
        cashRegisterId: params.cashRegisterId,
        subtotal,
        discount,
        total,
        costTotal,
        paymentMethod: params.paymentMethod as never,
        notes: params.notes,
        items: {
          create: saleItems,
        },
        payments: params.payments
          ? { create: params.payments.map((p) => ({ method: p.method as never, amount: p.amount })) }
          : { create: [{ method: params.paymentMethod as never, amount: total }] },
      },
      include: { items: true, payments: true },
    });

    for (const item of saleItems) {
      await adjustStock({
        organizationId: params.organizationId,
        branchId: params.branchId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: -item.quantity,
        type: "SALE",
        referenceType: "sale",
        referenceId: newSale.id,
        userId: params.sellerId,
      });
    }

    if (params.customerId) {
      await tx.customer.update({
        where: { id: params.customerId },
        data: {
          totalSpent: { increment: total },
          visitCount: { increment: 1 },
        },
      });
    }

    if (params.cashRegisterId) {
      await tx.cashMovement.create({
        data: {
          cashRegisterId: params.cashRegisterId,
          type: "SALE",
          amount: total,
          method: params.paymentMethod as never,
        },
      });
    }

    return newSale;
  });

  await logAudit({
    organizationId: params.organizationId,
    userId: params.sellerId,
    action: "CREATE",
    entity: "sale",
    entityId: sale.id,
    newValue: { number, total },
  });

  return sale;
}

export async function openCashRegister(params: {
  organizationId: string;
  branchId: string;
  operatorId: string;
  openingAmount: number;
}) {
  const existing = await prisma.cashRegister.findFirst({
    where: {
      branchId: params.branchId,
      operatorId: params.operatorId,
      status: "OPEN",
    },
  });
  if (existing) throw new Error("Caixa já aberto");

  return prisma.cashRegister.create({
    data: {
      organizationId: params.organizationId,
      branchId: params.branchId,
      operatorId: params.operatorId,
      openingAmount: params.openingAmount,
      movements: {
        create: {
          type: "OPENING",
          amount: params.openingAmount,
        },
      },
    },
  });
}

export async function closeCashRegister(params: {
  cashRegisterId: string;
  closingAmount: number;
  userId: string;
}) {
  const register = await prisma.cashRegister.findUnique({
    where: { id: params.cashRegisterId },
    include: { movements: true, sales: true },
  });
  if (!register || register.status === "CLOSED") throw new Error("Caixa inválido");

  const salesTotal = register.sales.reduce((s, sale) => s + Number(sale.total), 0);
  const withdrawals = register.movements
    .filter((m) => m.type === "WITHDRAWAL")
    .reduce((s, m) => s + Number(m.amount), 0);
  const supplies = register.movements
    .filter((m) => m.type === "SUPPLY")
    .reduce((s, m) => s + Number(m.amount), 0);
  const expected = Number(register.openingAmount) + salesTotal + supplies - withdrawals;

  return prisma.cashRegister.update({
    where: { id: params.cashRegisterId },
    data: {
      status: "CLOSED",
      closingAmount: params.closingAmount,
      expectedAmount: expected,
      closedAt: new Date(),
      movements: {
        create: { type: "CLOSING", amount: params.closingAmount },
      },
    },
  });
}
