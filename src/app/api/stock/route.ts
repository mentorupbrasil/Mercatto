import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { adjustStock } from "@/lib/services/stock";
import { StockMovementType } from "@prisma/client";

const adjustSchema = z.object({
  branchId: z.string().min(1, "Filial obrigatória"),
  productId: z.string().min(1, "Produto obrigatório"),
  variantId: z.string().optional(),
  quantity: z.number().int().refine((q) => q !== 0, "Quantidade não pode ser zero"),
  type: z.enum([
    "PURCHASE",
    "SALE",
    "RETURN",
    "ADJUSTMENT",
    "INVENTORY",
    "TRANSFER_IN",
    "TRANSFER_OUT",
    "LOSS",
    "INTERNAL_USE",
    "EXCHANGE",
  ]),
  reason: z.string().optional(),
  lot: z.string().optional(),
  expiryDate: z.string().optional(),
});

export const GET = withAuth(async (req, session) => {
  const { searchParams } = req.nextUrl;
  const branchId = searchParams.get("branchId") ?? undefined;
  const productId = searchParams.get("productId") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = {
    organizationId: session.organizationId,
    ...(branchId && { branchId }),
    ...(productId && { productId }),
    ...(type && { type: type as StockMovementType }),
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, internalCode: true } },
        variant: { select: { id: true, sku: true, color: true, size: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return apiSuccess({ movements, total, page, limit });
}, "stock.view");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  const branch = await prisma.branch.findFirst({
    where: { id: data.branchId, organizationId: session.organizationId },
  });
  if (!branch) return apiError("Filial não encontrada", 404);

  const product = await prisma.product.findFirst({
    where: { id: data.productId, organizationId: session.organizationId },
  });
  if (!product) return apiError("Produto não encontrado", 404);

  try {
    const result = await adjustStock({
      organizationId: session.organizationId,
      branchId: data.branchId,
      productId: data.productId,
      variantId: data.variantId,
      quantity: data.quantity,
      type: data.type as StockMovementType,
      reason: data.reason,
      userId: session.userId,
      lot: data.lot,
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
    });

    return apiSuccess({
      message: "Estoque ajustado com sucesso",
      ...result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao ajustar estoque";
    return apiError(message, 400);
  }
}, "stock.manage");
