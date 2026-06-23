import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const updateAppointmentSchema = z.object({
  branchId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  type: z
    .enum(["GENERAL", "FITTING", "VIP", "EXAM", "GROOMING", "DELIVERY", "REPAIR", "CONSULTATION"])
    .optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withAuth(async (request, session) => {
    const existing = await prisma.appointment.findFirst({
      where: { id, organizationId: session.organizationId },
    });
    if (!existing) return apiError("Agendamento não encontrado", 404);

    const body = await parseBody<unknown>(request);
    const parsed = updateAppointmentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
    }

    const data = parsed.data;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        branchId: data.branchId,
        customerId: data.customerId,
        userId: data.userId,
        title: data.title,
        description: data.description,
        type: data.type,
        startAt: data.startAt ? new Date(data.startAt) : undefined,
        endAt: data.endAt ? new Date(data.endAt) : undefined,
        status: data.status,
      },
      include: {
        customer: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    await logAudit({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "UPDATE",
      entity: "appointment",
      entityId: id,
      oldValue: { title: existing.title, status: existing.status },
      newValue: data,
    });

    return apiSuccess(appointment);
  }, "agenda.manage")(req);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withAuth(async (_req, session) => {
    const existing = await prisma.appointment.findFirst({
      where: { id, organizationId: session.organizationId },
    });
    if (!existing) return apiError("Agendamento não encontrado", 404);

    await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    await logAudit({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "DELETE",
      entity: "appointment",
      entityId: id,
      oldValue: { title: existing.title },
    });

    return apiSuccess({ message: "Agendamento cancelado com sucesso" });
  }, "agenda.manage")(req);
}
