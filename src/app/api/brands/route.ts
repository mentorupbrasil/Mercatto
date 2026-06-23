import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const createBrandSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
});

export const GET = withAuth(async (req, session) => {
  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "true";

  const brands = await prisma.brand.findMany({
    where: {
      organizationId: session.organizationId,
      ...(!includeInactive && { active: true }),
    },
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  });

  return apiSuccess({ brands });
}, "products.view");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = createBrandSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  const existing = await prisma.brand.findFirst({
    where: {
      organizationId: session.organizationId,
      name: data.name,
    },
  });
  if (existing) return apiError("Marca já existe", 409);

  const brand = await prisma.brand.create({
    data: {
      organizationId: session.organizationId,
      name: data.name,
    },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "CREATE",
    entity: "brand",
    entityId: brand.id,
    newValue: { name: brand.name },
  });

  return apiSuccess(brand, 201);
}, "products.manage");
