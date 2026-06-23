import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess } from "@/lib/api-helpers";

export const GET = withAuth(async (_req, session) => {
  const user = await prisma.user.findFirst({
    where: {
      id: session.userId,
      organizationId: session.organizationId,
      active: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      phone: true,
      lastLoginAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          cnpj: true,
          phone: true,
          email: true,
          logo: true,
          segment: true,
          plan: true,
          active: true,
        },
      },
    },
  });

  if (!user) {
    return apiError("Usuário não encontrado", 404);
  }

  const branches = await prisma.branch.findMany({
    where: { organizationId: session.organizationId, active: true },
    select: { id: true, name: true, code: true, isMain: true },
    orderBy: { isMain: "desc" },
  });

  return apiSuccess({ user, branches });
});
