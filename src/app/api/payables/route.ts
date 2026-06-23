import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const createPayableSchema = z.object({
  supplierId: z.string().optional(),
  description: z.string().min(1, "Descrição obrigatória"),
  category: z.string().optional(),
  costCenter: z.string().optional(),
  amount: z.number().positive("Valor deve ser positivo"),
  dueDate: z.string().min(1, "Data de vencimento obrigatória"),
  notes: z.string().optional(),
});

const markPaidSchema = z.object({
  id: z.string().min(1, "ID obrigatório"),
  paidDate: z.string().optional(),
});

export const GET = withAuth(async (req, session) => {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const supplierId = searchParams.get("supplierId") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = {
    organizationId: session.organizationId,
    ...(status && { status: status as never }),
    ...(supplierId && { supplierId }),
  };

  const [payables, total] = await Promise.all([
    prisma.accountPayable.findMany({
      where,
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" },
      skip,
      take: limit,
    }),
    prisma.accountPayable.count({ where }),
  ]);

  return apiSuccess({ payables, total, page, limit });
}, "finance.view");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = createPayableSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  if (data.supplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: { id: data.supplierId, organizationId: session.organizationId },
    });
    if (!supplier) return apiError("Fornecedor não encontrado", 404);
  }

  const payable = await prisma.accountPayable.create({
    data: {
      organizationId: session.organizationId,
      supplierId: data.supplierId,
      description: data.description,
      category: data.category,
      costCenter: data.costCenter,
      amount: data.amount,
      dueDate: new Date(data.dueDate),
      notes: data.notes,
    },
    include: { supplier: { select: { id: true, name: true } } },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "CREATE",
    entity: "payable",
    entityId: payable.id,
    newValue: { description: payable.description, amount: payable.amount },
  });

  return apiSuccess(payable, 201);
}, "finance.manage");

export const PATCH = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = markPaidSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const { id, paidDate } = parsed.data;

  const existing = await prisma.accountPayable.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!existing) return apiError("Conta a pagar não encontrada", 404);
  if (existing.status === "PAID") return apiError("Conta já está paga", 400);

  const payable = await prisma.accountPayable.update({
    where: { id },
    data: {
      status: "PAID",
      paidDate: paidDate ? new Date(paidDate) : new Date(),
    },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "PAY",
    entity: "payable",
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status: "PAID" },
  });

  return apiSuccess(payable);
}, "finance.manage");
