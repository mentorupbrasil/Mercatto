import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const createProgramSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  type: z.enum(["POINTS", "CASHBACK", "HYBRID"]).optional(),
  pointsPerReal: z.number().optional(),
  cashbackRate: z.number().optional(),
});

const transactionSchema = z.object({
  customerId: z.string().min(1, "Cliente obrigatório"),
  type: z.enum(["EARN", "REDEEM", "ADJUST", "EXPIRE"]),
  points: z.number().int().optional(),
  cashback: z.number().optional(),
  saleId: z.string().optional(),
  description: z.string().optional(),
});

export const GET = withAuth(async (_req, session) => {
  const program = await prisma.loyaltyProgram.findFirst({
    where: { organizationId: session.organizationId, active: true },
    include: {
      coupons: {
        where: { active: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  return apiSuccess({ program });
}, "loyalty.view");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);

  if ("customerId" in (body as object)) {
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
    }

    const data = parsed.data;

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId: session.organizationId },
    });
    if (!customer) return apiError("Cliente não encontrado", 404);

    const program = await prisma.loyaltyProgram.findFirst({
      where: { organizationId: session.organizationId, active: true },
    });
    if (!program) return apiError("Programa de fidelidade não configurado", 404);

    let pointsDelta = data.points ?? 0;
    let cashbackDelta = data.cashback ?? 0;

    if (data.type === "REDEEM") {
      pointsDelta = -Math.abs(pointsDelta);
      cashbackDelta = -Math.abs(cashbackDelta);
    } else if (data.type === "EARN") {
      pointsDelta = Math.abs(pointsDelta);
      cashbackDelta = Math.abs(cashbackDelta);
    }

    const newPoints = customer.loyaltyPoints + pointsDelta;
    const newCashback = Number(customer.cashbackBalance) + cashbackDelta;

    if (newPoints < 0) return apiError("Pontos insuficientes", 400);
    if (newCashback < 0) return apiError("Saldo de cashback insuficiente", 400);

    const [transaction] = await prisma.$transaction([
      prisma.loyaltyTransaction.create({
        data: {
          customerId: data.customerId,
          type: data.type,
          points: pointsDelta,
          cashback: cashbackDelta,
          saleId: data.saleId,
          description: data.description,
        },
      }),
      prisma.customer.update({
        where: { id: data.customerId },
        data: {
          loyaltyPoints: newPoints,
          cashbackBalance: newCashback,
        },
      }),
    ]);

    await logAudit({
      organizationId: session.organizationId,
      userId: session.userId,
      action: data.type,
      entity: "loyaltyTransaction",
      entityId: transaction.id,
      newValue: { customerId: data.customerId, points: pointsDelta, cashback: cashbackDelta },
    });

    return apiSuccess(
      {
        transaction,
        customer: {
          loyaltyPoints: newPoints,
          cashbackBalance: newCashback,
        },
        message: "Transação de fidelidade registrada com sucesso",
      },
      201
    );
  }

  const parsed = createProgramSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  await prisma.loyaltyProgram.updateMany({
    where: { organizationId: session.organizationId, active: true },
    data: { active: false },
  });

  const program = await prisma.loyaltyProgram.create({
    data: {
      organizationId: session.organizationId,
      name: data.name,
      type: data.type ?? "POINTS",
      pointsPerReal: data.pointsPerReal ?? 1,
      cashbackRate: data.cashbackRate ?? 0,
    },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "CREATE",
    entity: "loyaltyProgram",
    entityId: program.id,
    newValue: { name: program.name, type: program.type },
  });

  return apiSuccess(program, 201);
}, "loyalty.manage");
