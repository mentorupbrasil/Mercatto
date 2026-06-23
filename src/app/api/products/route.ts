import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const variantSchema = z.object({
  sku: z.string().min(1, "SKU obrigatório"),
  color: z.string().optional(),
  size: z.string().optional(),
  barcode: z.string().optional(),
  cost: z.number().optional(),
  price: z.number().optional(),
});

const createProductSchema = z.object({
  internalCode: z.string().min(1, "Código interno obrigatório"),
  barcode: z.string().optional(),
  name: z.string().min(1, "Nome obrigatório"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  supplierId: z.string().optional(),
  unit: z
    .enum(["UN", "KG", "G", "L", "ML", "M", "M2", "CX", "PC", "PAR"])
    .optional(),
  cost: z.number().optional(),
  price: z.number().optional(),
  minStock: z.number().int().optional(),
  location: z.string().optional(),
  hasVariants: z.boolean().optional(),
  trackLot: z.boolean().optional(),
  trackExpiry: z.boolean().optional(),
  imageUrl: z.string().optional(),
  ncm: z.string().optional(),
  variants: z.array(variantSchema).optional(),
});

export const GET = withAuth(async (req, session) => {
  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") ?? undefined;
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const brandId = searchParams.get("brandId") ?? undefined;
  const active = searchParams.get("active");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const where = {
    organizationId: session.organizationId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { internalCode: { contains: search, mode: "insensitive" as const } },
        { barcode: { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(categoryId && { categoryId }),
    ...(brandId && { brandId }),
    ...(active !== null && active !== "" && { active: active === "true" }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        supplier: { select: { id: true, name: true } },
        variants: true,
        stock: true,
      },
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return apiSuccess({ products, total, page, limit });
}, "products.view");

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  const existing = await prisma.product.findFirst({
    where: {
      organizationId: session.organizationId,
      internalCode: data.internalCode,
    },
  });
  if (existing) {
    return apiError("Código interno já existe", 409);
  }

  const product = await prisma.product.create({
    data: {
      organizationId: session.organizationId,
      internalCode: data.internalCode,
      barcode: data.barcode,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      brandId: data.brandId,
      supplierId: data.supplierId,
      unit: data.unit ?? "UN",
      cost: data.cost ?? 0,
      price: data.price ?? 0,
      minStock: data.minStock ?? 0,
      location: data.location,
      hasVariants: data.hasVariants ?? (data.variants?.length ?? 0) > 0,
      trackLot: data.trackLot ?? false,
      trackExpiry: data.trackExpiry ?? false,
      imageUrl: data.imageUrl,
      ncm: data.ncm,
      variants: data.variants?.length
        ? {
            create: data.variants.map((v) => ({
              sku: v.sku,
              color: v.color,
              size: v.size,
              barcode: v.barcode,
              cost: v.cost ?? 0,
              price: v.price ?? 0,
            })),
          }
        : undefined,
    },
    include: { variants: true, category: true, brand: true },
  });

  await logAudit({
    organizationId: session.organizationId,
    userId: session.userId,
    action: "CREATE",
    entity: "product",
    entityId: product.id,
    newValue: { name: product.name, internalCode: product.internalCode },
  });

  return apiSuccess(product, 201);
}, "products.manage");
