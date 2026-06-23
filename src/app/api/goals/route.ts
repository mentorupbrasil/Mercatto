import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const createGoalSchema = z.object({
  employeeId: z.string().optional(),
  name: z.string().min(1, "Nome obrigatório"),
  type: z.enum(["SALES", "REVENUE", "TICKET", "ITEMS"]).optional(),
  target: z.number().positive("Meta deve ser positiva"),
  periodStart: z.string().min(1, "Início do período obrigatório"),
  periodEnd: z.string().min(1, "Fim do período obrigatório"),
});

const updateGoalSchema = z.object({
  id: z.string().min(1, "ID obrigatório"),
  name: z.string().min(1).optional(),
  target: z.number().positive().optional(),
  current: z.number().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
});

export const GET = withAuth(async (req, session) => {
  const { searchParams } = req.nextUrl;
  const employeeId = searchParams.get("employeeId") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const active = searchParams.get("active") === "true";

  const where = {
    organizationId: session.organizationId,
    ...(employeeId && { employeeId }),
    ...(type && { type: type as never }),
    ...(active && {
      periodStart: { lte: new Date() },
      periodEnd: { gte: new Date() },
    }),
  };

  const goals = await prisma.goal.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true } },
    },
    orderBy: { periodEnd: "desc" },
  });

  return apiSuccess({ goals });
}, "goals.view");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = createGoalSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  if (data.employeeId) {
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, organizationId: session.organizationId },
    });
    if (!employee) return apiError("Funcionário não encontrado", 404);
  }

  const goal = await prisma.goal.create({
    data: {
      organizationId: session.organizationId,
      employeeId: data.employeeId,
      name: data.name,
      type: data.type ?? "SALES",
      target: data.target,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
    },
    include: {
      employee: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "CREATE",
    entity: "goal",
    entityId: goal.id,
    newValue: { name: goal.name, target: goal.target },
  });

  return apiSuccess(goal, 201);
}, "goals.manage");

export const PATCH = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = updateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const { id, ...data } = parsed.data;

  const existing = await prisma.goal.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!existing) return apiError("Meta não encontrada", 404);

  const goal = await prisma.goal.update({
    where: { id },
    data: {
      name: data.name,
      target: data.target,
      current: data.current,
      periodStart: data.periodStart ? new Date(data.periodStart) : undefined,
      periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
    },
    include: {
      employee: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "UPDATE",
    entity: "goal",
    entityId: id,
    oldValue: { current: existing.current },
    newValue: data,
  });

  return apiSuccess(goal);
}, "goals.manage");
