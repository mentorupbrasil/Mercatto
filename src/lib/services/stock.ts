import prisma from "../db";
import { StockMovementType } from "@prisma/client";
import { logAudit } from "../audit";

interface StockAdjustParams {
  organizationId: string;
  branchId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  type: StockMovementType;
  reason?: string;
  referenceType?: string;
  referenceId?: string;
  userId?: string;
  lot?: string;
  expiryDate?: Date;
}

export async function adjustStock(params: StockAdjustParams) {
  const { branchId, productId, variantId, quantity, lot } = params;

  const existing = await prisma.stock.findFirst({
    where: {
      branchId,
      productId,
      variantId: variantId ?? null,
      lot: lot ?? null,
    },
  });

  const previousQty = existing?.quantity ?? 0;
  const newQty = previousQty + quantity;

  if (newQty < 0) throw new Error("Estoque insuficiente");

  if (existing) {
    await prisma.stock.update({
      where: { id: existing.id },
      data: { quantity: newQty },
    });
  } else {
    await prisma.stock.create({
      data: {
        branchId,
        productId,
        variantId,
        quantity: newQty,
        lot: lot,
        expiryDate: params.expiryDate,
      },
    });
  }

  await prisma.stockMovement.create({
    data: {
      organizationId: params.organizationId,
      branchId,
      productId,
      variantId,
      type: params.type,
      quantity,
      previousQty,
      newQty,
      reason: params.reason,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      userId: params.userId,
      lot,
    },
  });

  return { previousQty, newQty };
}

export async function getProductStock(branchId: string, productId: string, variantId?: string) {
  const stocks = await prisma.stock.findMany({
    where: { branchId, productId, ...(variantId ? { variantId } : {}) },
  });
  return stocks.reduce((sum, s) => sum + s.quantity, 0);
}

export async function transferStock(params: {
  organizationId: string;
  fromBranchId: string;
  toBranchId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  userId?: string;
}) {
  await adjustStock({
    ...params,
    branchId: params.fromBranchId,
    quantity: -params.quantity,
    type: "TRANSFER_OUT",
    reason: `Transferência para filial`,
    referenceType: "transfer",
  });

  await adjustStock({
    ...params,
    branchId: params.toBranchId,
    quantity: params.quantity,
    type: "TRANSFER_IN",
    reason: `Transferência de filial`,
    referenceType: "transfer",
  });

  await logAudit({
    organizationId: params.organizationId,
    userId: params.userId,
    action: "TRANSFER",
    entity: "stock",
    entityId: params.productId,
    newValue: params,
  });
}

export async function getLowStockProducts(organizationId: string, branchId?: string) {
  const products = await prisma.product.findMany({
    where: { organizationId, active: true },
    include: {
      stock: branchId ? { where: { branchId } } : true,
      category: true,
    },
  });

  return products
    .map((p) => {
      const totalStock = p.stock.reduce((s, st) => s + st.quantity, 0);
      return { ...p, totalStock };
    })
    .filter((p) => p.totalStock <= p.minStock);
}
