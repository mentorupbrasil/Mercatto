import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  cpfCnpj: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withAuth(async (_req, session) => {
    const customer = await prisma.customer.findFirst({
      where: { id, organizationId: session.organizationId },
      include: {
        sales: { take: 10, orderBy: { createdAt: "desc" } },
        appointments: { take: 5, orderBy: { startAt: "desc" } },
        loyaltyTransactions: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });

    if (!customer) return apiError("Cliente não encontrado", 404);
    return apiSuccess(customer);
  }, "customers.view")(req);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withAuth(async (request, session) => {
    const existing = await prisma.customer.findFirst({
      where: { id, organizationId: session.organizationId },
    });
    if (!existing) return apiError("Cliente não encontrado", 404);

    const body = await parseBody<unknown>(request);
    const parsed = updateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
    }

    const data = parsed.data;

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        cpfCnpj: data.cpfCnpj,
        email: data.email || null,
        phone: data.phone,
        whatsapp: data.whatsapp,
        birthDate: data.birthDate ? new Date(data.birthDate) : data.birthDate === null ? null : undefined,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        notes: data.notes,
        active: data.active,
      },
    });

    await logAudit({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "UPDATE",
      entity: "customer",
      entityId: id,
      oldValue: { name: existing.name },
      newValue: data,
    });

    return apiSuccess(customer);
  }, "customers.manage")(req);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withAuth(async (_req, session) => {
    const existing = await prisma.customer.findFirst({
      where: { id, organizationId: session.organizationId },
    });
    if (!existing) return apiError("Cliente não encontrado", 404);

    await prisma.customer.update({
      where: { id },
      data: { active: false },
    });

    await logAudit({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "DELETE",
      entity: "customer",
      entityId: id,
      oldValue: { name: existing.name },
    });

    return apiSuccess({ message: "Cliente desativado com sucesso" });
  }, "customers.manage")(req);
}
