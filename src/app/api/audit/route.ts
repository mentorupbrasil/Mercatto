import prisma from "@/lib/db";
import { withAuth, apiSuccess } from "@/lib/api-helpers";

export const GET = withAuth(async (req, session) => {
  const { searchParams } = req.nextUrl;
  const entity = searchParams.get("entity") ?? undefined;
  const entityId = searchParams.get("entityId") ?? undefined;
  const userId = searchParams.get("userId") ?? undefined;
  const action = searchParams.get("action") ?? undefined;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = {
    organizationId: session.organizationId,
    ...(entity && { entity }),
    ...(entityId && { entityId }),
    ...(userId && { userId }),
    ...(action && { action }),
    ...(startDate &&
      endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return apiSuccess({ logs, total, page, limit });
}, "audit.view");
