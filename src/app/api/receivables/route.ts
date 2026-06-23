import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const createReceivableSchema = z.object({
  customerId: z.string().optional(),
  saleId: z.string().optional(),
  description: z.string().min(1, "Descrição obrigatória"),
  installment: z.number().int().optional(),
  totalInstallments: z.number().int().optional(),
  amount: z.number().positive("Valor deve ser positivo"),
  dueDate: z.string().min(1, "Data de vencimento obrigatória"),
  paymentMethod: z
    .enum(["CASH", "PIX", "DEBIT_CARD", "CREDIT_CARD", "CONVENIO", "STORE_CREDIT", "MIXED"])
    .optional(),
});

const markPaidSchema = z.object({
  id: z.string().min(1, "ID obrigatório"),
  paidDate: z.string().optional(),
  paymentMethod: z
    .enum(["CASH", "PIX", "DEBIT_CARD", "CREDIT_CARD", "CONVENIO", "STORE_CREDIT", "MIXED"])
    .optional(),
});

export const GET = withAuth(async (req, session) => {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? undefined;
  const customerId = searchParams.get("customerId") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = {
    organizationId: session.organizationId,
    ...(status && { status: status as never }),
    ...(customerId && { customerId }),
  };

  const [receivables, total] = await Promise.all([
    prisma.accountReceivable.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        sale: { select: { id: true, number: true } },
      },
      orderBy: { dueDate: "asc" },
      skip,
      take: limit,
    }),
    prisma.accountReceivable.count({ where }),
  ]);

  return apiSuccess({ receivables, total, page, limit });
}, "finance.view");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = createReceivableSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  if (data.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId: session.organizationId },
    });
    if (!customer) return apiError("Cliente não encontrado", 404);
  }

  if (data.saleId) {
    const sale = await prisma.sale.findFirst({
      where: { id: data.saleId, organizationId: session.organizationId },
    });
    if (!sale) return apiError("Venda não encontrada", 404);
  }

  const receivable = await prisma.accountReceivable.create({
    data: {
      organizationId: session.organizationId,
      customerId: data.customerId,
      saleId: data.saleId,
      description: data.description,
      installment: data.installment ?? 1,
      totalInstallments: data.totalInstallments ?? 1,
      amount: data.amount,
      dueDate: new Date(data.dueDate),
      paymentMethod: data.paymentMethod,
    },
    include: {
      customer: { select: { id: true, name: true } },
      sale: { select: { id: true, number: true } },
    },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "CREATE",
    entity: "receivable",
    entityId: receivable.id,
    newValue: { description: receivable.description, amount: receivable.amount },
  });

  return apiSuccess(receivable, 201);
}, "finance.manage");

export const PATCH = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = markPaidSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const { id, paidDate, paymentMethod } = parsed.data;

  const existing = await prisma.accountReceivable.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!existing) return apiError("Conta a receber não encontrada", 404);
  if (existing.status === "PAID") return apiError("Conta já está paga", 400);

  const receivable = await prisma.accountReceivable.update({
    where: { id },
    data: {
      status: "PAID",
      paidDate: paidDate ? new Date(paidDate) : new Date(),
      paymentMethod: paymentMethod ?? existing.paymentMethod,
    },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "PAY",
    entity: "receivable",
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status: "PAID" },
  });

  return apiSuccess(receivable);
}, "finance.manage");
