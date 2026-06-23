import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { openCashRegister, closeCashRegister } from "@/lib/services/sales";
import { logAudit } from "@/lib/audit";

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("open"),
    branchId: z.string().min(1, "Filial obrigatória"),
    openingAmount: z.number().min(0, "Valor de abertura inválido"),
  }),
  z.object({
    action: z.literal("close"),
    cashRegisterId: z.string().min(1, "Caixa obrigatório"),
    closingAmount: z.number().min(0, "Valor de fechamento inválido"),
  }),
  z.object({
    action: z.literal("supply"),
    cashRegisterId: z.string().min(1, "Caixa obrigatório"),
    amount: z.number().positive("Valor deve ser positivo"),
    description: z.string().optional(),
  }),
  z.object({
    action: z.literal("withdrawal"),
    cashRegisterId: z.string().min(1, "Caixa obrigatório"),
    amount: z.number().positive("Valor deve ser positivo"),
    description: z.string().optional(),
  }),
]);

export const GET = withAuth(async (req, session) => {
  const branchId = req.nextUrl.searchParams.get("branchId") ?? undefined;

  const register = await prisma.cashRegister.findFirst({
    where: {
      organizationId: session.organizationId,
      operatorId: session.userId,
      status: "OPEN",
      ...(branchId && { branchId }),
    },
    include: {
      branch: { select: { id: true, name: true, code: true } },
      operator: { select: { id: true, name: true } },
      movements: { orderBy: { createdAt: "desc" }, take: 20 },
      sales: {
        where: { status: "COMPLETED" },
        select: { id: true, number: true, total: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!register) {
    return apiSuccess({ register: null, message: "Nenhum caixa aberto" });
  }

  return apiSuccess({ register });
}, "pdv.access");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  try {
    switch (data.action) {
      case "open": {
        const branch = await prisma.branch.findFirst({
          where: { id: data.branchId, organizationId: session.organizationId },
        });
        if (!branch) return apiError("Filial não encontrada", 404);

        const register = await openCashRegister({
          organizationId: session.organizationId,
          branchId: data.branchId,
          operatorId: session.userId,
          openingAmount: data.openingAmount,
        });

        await logAudit({
          organizationId: session.organizationId,
          userId: session.userId,
          action: "OPEN",
          entity: "cashRegister",
          entityId: register.id,
          newValue: { openingAmount: data.openingAmount },
        });

        return apiSuccess({ register, message: "Caixa aberto com sucesso" }, 201);
      }

      case "close": {
        const existing = await prisma.cashRegister.findFirst({
          where: {
            id: data.cashRegisterId,
            organizationId: session.organizationId,
          },
        });
        if (!existing) return apiError("Caixa não encontrado", 404);

        const register = await closeCashRegister({
          cashRegisterId: data.cashRegisterId,
          closingAmount: data.closingAmount,
          userId: session.userId,
        });

        await logAudit({
          organizationId: session.organizationId,
          userId: session.userId,
          action: "CLOSE",
          entity: "cashRegister",
          entityId: register.id,
          newValue: { closingAmount: data.closingAmount },
        });

        return apiSuccess({ register, message: "Caixa fechado com sucesso" });
      }

      case "supply":
      case "withdrawal": {
        const register = await prisma.cashRegister.findFirst({
          where: {
            id: data.cashRegisterId,
            organizationId: session.organizationId,
            status: "OPEN",
          },
        });
        if (!register) return apiError("Caixa não encontrado ou fechado", 404);

        const movement = await prisma.cashMovement.create({
          data: {
            cashRegisterId: data.cashRegisterId,
            type: data.action === "supply" ? "SUPPLY" : "WITHDRAWAL",
            amount: data.amount,
            description: data.description,
          },
        });

        await logAudit({
          organizationId: session.organizationId,
          userId: session.userId,
          action: data.action === "supply" ? "SUPPLY" : "WITHDRAWAL",
          entity: "cashRegister",
          entityId: register.id,
          newValue: { amount: data.amount },
        });

        return apiSuccess({
          movement,
          message:
            data.action === "supply"
              ? "Suprimento registrado com sucesso"
              : "Sangria registrada com sucesso",
        });
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro na operação de caixa";
    return apiError(message, 400);
  }
}, "pdv.access");
