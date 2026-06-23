import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const createSupplierSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  cnpj: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  deliveryDays: z.number().int().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(async (req, session) => {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = {
    organizationId: session.organizationId,
    active: true,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { cnpj: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.supplier.count({ where }),
  ]);

  return apiSuccess({ suppliers, total, page, limit });
}, "suppliers.view");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = createSupplierSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  const supplier = await prisma.supplier.create({
    data: {
      organizationId: session.organizationId,
      name: data.name,
      cnpj: data.cnpj,
      email: data.email || undefined,
      phone: data.phone,
      whatsapp: data.whatsapp,
      address: data.address,
      city: data.city,
      state: data.state,
      deliveryDays: data.deliveryDays,
      paymentTerms: data.paymentTerms,
      notes: data.notes,
    },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "CREATE",
    entity: "supplier",
    entityId: supplier.id,
    newValue: { name: supplier.name },
  });

  return apiSuccess(supplier, 201);
}, "suppliers.manage");
