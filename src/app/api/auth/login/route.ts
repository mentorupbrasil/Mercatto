import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import {
  createToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { apiError, apiSuccess, parseBody } from "@/lib/api-helpers";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<unknown>(req);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: { email, active: true },
      include: { organization: true },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return apiError("E-mail ou senha incorretos", 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await createToken({
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    await setSessionCookie(token);

    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          slug: user.organization.slug,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return apiError("Erro interno", 500);
  }
}
