import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { adjustStock } from "@/lib/services/stock";
import { logAudit } from "@/lib/audit";

const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  quantity: z.number().int().positive(),
  unitCost: z.number().min(0),
});

const createPurchaseSchema = z.object({
  supplierId: z.string().min(1, "Fornecedor obrigatório"),
  items: z.array(purchaseItemSchema).min(1, "Pelo menos um item é obrigatório"),
  discount: z.number().optional(),
  expectedDate: z.string().optional(),
  notes: z.string().optional(),
  receiveStock: z.boolean().optional(),
  branchId: z.string().optional(),
});

export const GET = withAuth(async (req, session) => {
  const { searchParams } = req.nextUrl;
  const supplierId = searchParams.get("supplierId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = {
    organizationId: session.organizationId,
    ...(supplierId && { supplierId }),
    ...(status && { status: status as never }),
  };

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, internalCode: true } },
            variant: { select: { id: true, sku: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.purchase.count({ where }),
  ]);

  return apiSuccess({ purchases, total, page, limit });
}, "purchases.view");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = createPurchaseSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  const supplier = await prisma.supplier.findFirst({
    where: { id: data.supplierId, organizationId: session.organizationId },
  });
  if (!supplier) return apiError("Fornecedor não encontrado", 404);

  if (data.receiveStock && !data.branchId) {
    return apiError("Filial obrigatória para recebimento de estoque", 400);
  }

  if (data.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: data.branchId, organizationId: session.organizationId },
    });
    if (!branch) return apiError("Filial não encontrada", 404);
  }

  const purchaseCount = await prisma.purchase.count({
    where: { organizationId: session.organizationId },
  });
  const number = `C${String(purchaseCount + 1).padStart(6, "0")}`;

  let subtotal = 0;
  const items = data.items.map((item) => {
    const total = item.unitCost * item.quantity;
    subtotal += total;
    return { ...item, total };
  });

  const discount = data.discount ?? 0;
  const total = subtotal - discount;
  const status = data.receiveStock ? "RECEIVED" : "PENDING";

  const purchase = await prisma.purchase.create({
    data: {
      organizationId: session.organizationId,
      supplierId: data.supplierId,
      number,
      status,
      subtotal,
      discount,
      total,
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
      receivedAt: data.receiveStock ? new Date() : undefined,
      notes: data.notes,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          total: item.total,
          received: data.receiveStock ? item.quantity : 0,
        })),
      },
    },
    include: {
      supplier: true,
      items: { include: { product: true, variant: true } },
    },
  });

  if (data.receiveStock && data.branchId) {
    for (const item of items) {
      await adjustStock({
        organizationId: session.organizationId,
        branchId: data.branchId,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        type: "PURCHASE",
        referenceType: "purchase",
        referenceId: purchase.id,
        userId: session.userId,
      });
    }
  }

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "CREATE",
    entity: "purchase",
    entityId: purchase.id,
    newValue: { number, total },
  });

  return apiSuccess(purchase, 201);
}, "purchases.manage");
