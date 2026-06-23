import { NextRequest } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { logAudit } from "@/lib/audit";

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1),
  color: z.string().optional(),
  size: z.string().optional(),
  barcode: z.string().optional(),
  cost: z.number().optional(),
  price: z.number().optional(),
  active: z.boolean().optional(),
});

const updateProductSchema = z.object({
  internalCode: z.string().min(1).optional(),
  barcode: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  brandId: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
  unit: z
    .enum(["UN", "KG", "G", "L", "ML", "M", "M2", "CX", "PC", "PAR"])
    .optional(),
  cost: z.number().optional(),
  price: z.number().optional(),
  minStock: z.number().int().optional(),
  location: z.string().nullable().optional(),
  hasVariants: z.boolean().optional(),
  trackLot: z.boolean().optional(),
  trackExpiry: z.boolean().optional(),
  imageUrl: z.string().nullable().optional(),
  ncm: z.string().nullable().optional(),
  active: z.boolean().optional(),
  variants: z.array(variantSchema).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withAuth(async (_req, session) => {
    const product = await prisma.product.findFirst({
      where: { id, organizationId: session.organizationId },
      include: {
        category: true,
        brand: true,
        supplier: true,
        variants: true,
        stock: { include: { branch: { select: { id: true, name: true, code: true } } } },
      },
    });

    if (!product) return apiError("Produto não encontrado", 404);
    return apiSuccess(product);
  }, "products.view")(req);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withAuth(async (request, session) => {
    const existing = await prisma.product.findFirst({
      where: { id, organizationId: session.organizationId },
      include: { variants: true },
    });
    if (!existing) return apiError("Produto não encontrado", 404);

    const body = await parseBody<unknown>(request);
    const parsed = updateProductSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
    }

    const data = parsed.data;

    if (data.internalCode && data.internalCode !== existing.internalCode) {
      const duplicate = await prisma.product.findFirst({
        where: {
          organizationId: session.organizationId,
          internalCode: data.internalCode,
          NOT: { id },
        },
      });
      if (duplicate) return apiError("Código interno já existe", 409);
    }

    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          internalCode: data.internalCode,
          barcode: data.barcode,
          name: data.name,
          description: data.description,
          categoryId: data.categoryId,
          brandId: data.brandId,
          supplierId: data.supplierId,
          unit: data.unit,
          cost: data.cost,
          price: data.price,
          minStock: data.minStock,
          location: data.location,
          hasVariants: data.hasVariants,
          trackLot: data.trackLot,
          trackExpiry: data.trackExpiry,
          imageUrl: data.imageUrl,
          ncm: data.ncm,
          active: data.active,
        },
      });

      if (data.variants) {
        const existingIds = existing.variants.map((v) => v.id);
        const incomingIds = data.variants.filter((v) => v.id).map((v) => v.id!);
        const toDelete = existingIds.filter((vid) => !incomingIds.includes(vid));

        if (toDelete.length) {
          await tx.productVariant.deleteMany({ where: { id: { in: toDelete } } });
        }

        for (const variant of data.variants) {
          if (variant.id) {
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                sku: variant.sku,
                color: variant.color,
                size: variant.size,
                barcode: variant.barcode,
                cost: variant.cost,
                price: variant.price,
                active: variant.active,
              },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: id,
                sku: variant.sku,
                color: variant.color,
                size: variant.size,
                barcode: variant.barcode,
                cost: variant.cost ?? 0,
                price: variant.price ?? 0,
              },
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: { variants: true, category: true, brand: true },
      });
    });

    await logAudit({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "UPDATE",
      entity: "product",
      entityId: id,
      oldValue: { name: existing.name },
      newValue: data,
    });

    return apiSuccess(product);
  }, "products.manage")(req);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return withAuth(async (_req, session) => {
    const existing = await prisma.product.findFirst({
      where: { id, organizationId: session.organizationId },
    });
    if (!existing) return apiError("Produto não encontrado", 404);

    await prisma.product.update({
      where: { id },
      data: { active: false },
    });

    await logAudit({
      organizationId: session.organizationId,
      userId: session.userId,
      action: "DELETE",
      entity: "product",
      entityId: id,
      oldValue: { name: existing.name },
    });

    return apiSuccess({ message: "Produto desativado com sucesso" });
  }, "products.manage")(req);
}
