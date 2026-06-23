import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const createCategorySchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  parentId: z.string().optional(),
});

export const GET = withAuth(async (req, session) => {
  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "true";

  const categories = await prisma.category.findMany({
    where: {
      organizationId: session.organizationId,
      ...(!includeInactive && { active: true }),
    },
    include: {
      parent: { select: { id: true, name: true } },
      children: { where: { active: true }, select: { id: true, name: true } },
      _count: { select: { products: true } },
    },
    orderBy: { name: "asc" },
  });

  return apiSuccess({ categories });
}, "products.view");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  const existing = await prisma.category.findFirst({
    where: {
      organizationId: session.organizationId,
      name: data.name,
    },
  });
  if (existing) return apiError("Categoria já existe", 409);

  if (data.parentId) {
    const parent = await prisma.category.findFirst({
      where: { id: data.parentId, organizationId: session.organizationId },
    });
    if (!parent) return apiError("Categoria pai não encontrada", 404);
  }

  const category = await prisma.category.create({
    data: {
      organizationId: session.organizationId,
      name: data.name,
      parentId: data.parentId,
    },
    include: {
      parent: { select: { id: true, name: true } },
    },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "CREATE",
    entity: "category",
    entityId: category.id,
    newValue: { name: category.name },
  });

  return apiSuccess(category, 201);
}, "products.manage");
