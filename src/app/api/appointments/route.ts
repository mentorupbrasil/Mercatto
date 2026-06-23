import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const createAppointmentSchema = z.object({
  branchId: z.string().optional(),
  customerId: z.string().optional(),
  userId: z.string().optional(),
  title: z.string().min(1, "Título obrigatório"),
  description: z.string().optional(),
  type: z
    .enum(["GENERAL", "FITTING", "VIP", "EXAM", "GROOMING", "DELIVERY", "REPAIR", "CONSULTATION"])
    .optional(),
  startAt: z.string().min(1, "Data de início obrigatória"),
  endAt: z.string().min(1, "Data de término obrigatória"),
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
        startAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
  };

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { startAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.appointment.count({ where }),
  ]);

  return apiSuccess({ appointments, total, page, limit });
}, "agenda.view");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  if (data.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: data.branchId, organizationId: session.organizationId },
    });
    if (!branch) return apiError("Filial não encontrada", 404);
  }

  if (data.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, organizationId: session.organizationId },
    });
    if (!customer) return apiError("Cliente não encontrado", 404);
  }

  const appointment = await prisma.appointment.create({
    data: {
      organizationId: session.organizationId,
      branchId: data.branchId,
      customerId: data.customerId,
      userId: data.userId ?? session.userId,
      title: data.title,
      description: data.description,
      type: data.type ?? "GENERAL",
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
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
    action: "CREATE",
    entity: "appointment",
    entityId: appointment.id,
    newValue: { title: appointment.title },
  });

  return apiSuccess(appointment, 201);
}, "agenda.manage");
