import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const updateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  cnpj: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  deliveryDays: z.number().int().nullable().optional(),
  paymentTerms: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withAuth(async (_req, session) => {
    const supplier = await prisma.supplier.findFirst({
      where: { id, organizationId: session.organizationId },
      include: {
        products: { take: 20, where: { active: true } },
        purchases: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });

    if (!supplier) return apiError("Fornecedor não encontrado", 404);
    return apiSuccess(supplier);
  }, "suppliers.view")(req);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withAuth(async (request, session) => {
    const existing = await prisma.supplier.findFirst({
      where: { id, organizationId: session.organizationId },
    });
    if (!existing) return apiError("Fornecedor não encontrado", 404);

    const body = await parseBody<unknown>(request);
    const parsed = updateSupplierSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
    }

    const data = parsed.data;

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name,
        cnpj: data.cnpj,
        email: data.email || null,
        phone: data.phone,
        whatsapp: data.whatsapp,
        address: data.address,
        city: data.city,
        state: data.state,
        deliveryDays: data.deliveryDays,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
        active: data.active,
      },
    });

    await logAudit({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "UPDATE",
      entity: "supplier",
      entityId: id,
      oldValue: { name: existing.name },
      newValue: data,
    });

    return apiSuccess(supplier);
  }, "suppliers.manage")(req);
}
