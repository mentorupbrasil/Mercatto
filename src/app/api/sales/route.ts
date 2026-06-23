import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { createSale } from "@/lib/services/sales";

const saleItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().positive("Quantidade deve ser positiva"),
  unitPrice: z.number().optional(),
  discount: z.number().optional(),
});

const createSaleSchema = z.object({
  branchId: z.string().min(1, "Filial obrigatória"),
  customerId: z.string().optional(),
  cashRegisterId: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "Pelo menos um item é obrigatório"),
  discount: z.number().optional(),
  paymentMethod: z.enum([
    "CASH",
    "PIX",
    "DEBIT_CARD",
    "CREDIT_CARD",
    "CONVENIO",
    "STORE_CREDIT",
    "MIXED",
  ]),
  payments: z
    .array(
      z.object({
        method: z.string(),
        amount: z.number(),
      })
    )
    .optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(async (req, session) => {
  const { searchParams } = req.nextUrl;
  const branchId = searchParams.get("branchId") ?? undefined;
  const customerId = searchParams.get("customerId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = {
    organizationId: session.organizationId,
    ...(branchId && { branchId }),
    ...(customerId && { customerId }),
    ...(status && { status: status as never }),
    ...(startDate &&
      endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
  };

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        seller: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, code: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
        payments: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.sale.count({ where }),
  ]);

  return apiSuccess({ sales, total, page, limit });
}, "sales.view");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = createSaleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  const branch = await prisma.branch.findFirst({
    where: { id: data.branchId, organizationId: session.organizationId },
  });
  if (!branch) return apiError("Filial não encontrada", 404);

  try {
    const sale = await createSale({
      organizationId: session.organizationId,
      branchId: data.branchId,
      customerId: data.customerId,
      sellerId: session.userId,
      cashRegisterId: data.cashRegisterId,
      items: data.items.map((item) => ({
        ...item,
        unitPrice: item.unitPrice ?? 0,
      })),
      discount: data.discount,
      paymentMethod: data.paymentMethod,
      payments: data.payments,
      notes: data.notes,
    });

    return apiSuccess(sale, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar venda";
    return apiError(message, 400);
  }
}, "pdv.access");
