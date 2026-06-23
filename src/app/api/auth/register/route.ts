import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import {
  createToken,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth";
import { apiError, apiSuccess, parseBody } from "@/lib/api-helpers";

const registerSchema = z.object({
  organizationName: z.string().min(2, "Nome da organização obrigatório"),
  slug: z
    .string()
    .min(2, "Slug obrigatório")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  name: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  segment: z
    .enum([
      "GENERAL",
      "CLOTHING",
      "FOOTWEAR",
      "STATIONERY",
      "AUTO_PARTS",
      "CONSTRUCTION",
      "CONVENIENCE",
      "SUPERMARKET",
      "OPTICAL",
      "PET_SHOP",
      "TECH_REPAIR",
    ])
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<unknown>(req);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
    }

    const { organizationName, slug, name, email, password, cnpj, phone, segment } =
      parsed.data;

    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) {
      return apiError("Slug já está em uso", 409);
    }

    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug,
          cnpj,
          phone,
          email,
          segment: segment ?? "GENERAL",
        },
      });

      const branch = await tx.branch.create({
        data: {
          organizationId: organization.id,
          name: "Matriz",
          code: "MATRIZ",
          isMain: true,
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          email,
          passwordHash,
          name,
          role: "ADMIN",
        },
      });

      return { organization, branch, user };
    });

    const token = await createToken({
      userId: result.user.id,
      organizationId: result.organization.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
    });

    await setSessionCookie(token);

    return apiSuccess(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
        },
        branch: {
          id: result.branch.id,
          name: result.branch.name,
          code: result.branch.code,
        },
      },
      201
    );
  } catch (err) {
    console.error(err);
    return apiError("Erro interno", 500);
  }
}
