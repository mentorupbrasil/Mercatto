import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import {
  createToken,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth";
import { seedOrganizationCatalog } from "@/lib/services/catalog-seed";
import { apiError, apiSuccess, parseBody } from "@/lib/api-helpers";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

async function uniqueSlug(base: string) {
  let slug = slugify(base) || "loja";
  let attempt = 0;
  while (await prisma.organization.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${slugify(base)}-${attempt}`;
  }
  return slug;
}

const registerSchema = z
  .object({
    storeName: z.string().optional(),
    organizationName: z.string().optional(),
    ownerName: z.string().optional(),
    name: z.string().optional(),
    email: z.string().email("E-mail inválido"),
    password: z
      .string()
      .min(8, "Senha deve ter no mínimo 8 caracteres")
      .regex(/[a-zA-Z]/, "Senha deve conter letras")
      .regex(/[0-9]/, "Senha deve conter números"),
    slug: z.string().optional(),
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
  })
  .superRefine((data, ctx) => {
    const orgName = data.storeName?.trim() || data.organizationName?.trim();
    const userName = data.ownerName?.trim() || data.name?.trim();
    if (!orgName || orgName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nome da loja é obrigatório",
        path: ["storeName"],
      });
    }
    if (!userName || userName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Seu nome é obrigatório",
        path: ["ownerName"],
      });
    }
  });

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody<unknown>(req);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
    }

    const organizationName =
      parsed.data.storeName?.trim() || parsed.data.organizationName!.trim();
    const name = parsed.data.ownerName?.trim() || parsed.data.name!.trim();
    const { email, password, cnpj, phone, segment } = parsed.data;

    const slug = parsed.data.slug?.trim()
      ? slugify(parsed.data.slug)
      : await uniqueSlug(organizationName);

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return apiError("Identificador da loja inválido", 400);
    }

    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) {
      return apiError("Já existe uma loja com este nome. Tente outro.", 409);
    }

    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      return apiError("Este e-mail já está cadastrado", 409);
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

    await seedOrganizationCatalog(
      result.organization.id,
      result.organization.segment
    );

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
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    if (message.includes("connect") || message.includes("DATABASE")) {
      return apiError("Banco de dados não configurado. Verifique o DATABASE_URL no .env", 503);
    }
    return apiError("Erro interno ao criar conta. Tente novamente.", 500);
  }
}
