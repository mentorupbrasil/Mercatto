import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const createBranchSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  code: z.string().min(1, "Código obrigatório"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  isMain: z.boolean().optional(),
});

export const GET = withAuth(async (_req, session) => {
  const branches = await prisma.branch.findMany({
    where: { organizationId: session.organizationId, active: true },
    orderBy: [{ isMain: "desc" }, { name: "asc" }],
  });

  return apiSuccess({ branches });
}, "settings.view");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = createBranchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  const existing = await prisma.branch.findFirst({
    where: {
      organizationId: session.organizationId,
      code: data.code,
    },
  });
  if (existing) return apiError("Código de filial já existe", 409);

  if (data.isMain) {
    await prisma.branch.updateMany({
      where: { organizationId: session.organizationId, isMain: true },
      data: { isMain: false },
    });
  }

  const branch = await prisma.branch.create({
    data: {
      organizationId: session.organizationId,
      name: data.name,
      code: data.code.toUpperCase(),
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      phone: data.phone,
      isMain: data.isMain ?? false,
    },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "CREATE",
    entity: "branch",
    entityId: branch.id,
    newValue: { name: branch.name, code: branch.code },
  });

  return apiSuccess(branch, 201);
}, "settings.manage");
