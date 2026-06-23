import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const createCustomerSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  cpfCnpj: z.string().optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  birthDate: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
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
        { cpfCnpj: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return apiSuccess({ customers, total, page, limit });
}, "customers.view");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = createCustomerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  const customer = await prisma.customer.create({
    data: {
      organizationId: session.organizationId,
      name: data.name,
      cpfCnpj: data.cpfCnpj,
      email: data.email || undefined,
      phone: data.phone,
      whatsapp: data.whatsapp,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      notes: data.notes,
    },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "CREATE",
    entity: "customer",
    entityId: customer.id,
    newValue: { name: customer.name },
  });

  return apiSuccess(customer, 201);
}, "customers.manage");
