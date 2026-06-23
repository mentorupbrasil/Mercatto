import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const createEmployeeSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  userId: z.string().optional(),
  role: z.string().optional(),
  commissionRate: z.number().optional(),
  salary: z.number().optional(),
  hireDate: z.string().optional(),
});

export const GET = withAuth(async (req, session) => {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? undefined;
  const active = searchParams.get("active");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = {
    organizationId: session.organizationId,
    ...(search && {
      name: { contains: search, mode: "insensitive" as const },
    }),
    ...(active !== null && active !== "" && { active: active === "true" }),
  };

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true, role: true } },
        goals: { where: { periodEnd: { gte: new Date() } }, take: 3 },
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.employee.count({ where }),
  ]);

  return apiSuccess({ employees, total, page, limit });
}, "employees.view");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  if (data.userId) {
    const user = await prisma.user.findFirst({
      where: { id: data.userId, organizationId: session.organizationId },
    });
    if (!user) return apiError("Usuário não encontrado", 404);

    const existingEmployee = await prisma.employee.findUnique({
      where: { userId: data.userId },
    });
    if (existingEmployee) return apiError("Usuário já vinculado a um funcionário", 409);
  }

  const employee = await prisma.employee.create({
    data: {
      organizationId: session.organizationId,
      name: data.name,
      userId: data.userId,
      role: data.role,
      commissionRate: data.commissionRate ?? 0,
      salary: data.salary,
      hireDate: data.hireDate ? new Date(data.hireDate) : undefined,
    },
    include: {
      user: { select: { id: true, email: true, name: true, role: true } },
    },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "CREATE",
    entity: "employee",
    entityId: employee.id,
    newValue: { name: employee.name },
  });

  return apiSuccess(employee, 201);
}, "employees.manage");
