import { z } from "zod";
import { withAuth, apiError, apiSuccess, parseBody } from "@/lib/api-helpers";
import { transferStock } from "@/lib/services/stock";
import prisma from "@/lib/db";

const transferSchema = z.object({
  fromBranchId: z.string().min(1, "Filial de origem obrigatória"),
  toBranchId: z.string().min(1, "Filial de destino obrigatória"),
  productId: z.string().min(1, "Produto obrigatório"),
  variantId: z.string().optional(),
  quantity: z.number().int().positive("Quantidade deve ser positiva"),
});

export const POST = withAuth(async (req, session) => {
  const body = await parseBody<unknown>(req);
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.errors[0]?.message ?? "Dados inválidos", 400);
  }

  const data = parsed.data;

  if (data.fromBranchId === data.toBranchId) {
    return apiError("Filial de origem e destino devem ser diferentes", 400);
  }

  const [fromBranch, toBranch, product] = await Promise.all([
    prisma.branch.findFirst({
      where: { id: data.fromBranchId, organizationId: session.organizationId },
    }),
    prisma.branch.findFirst({
      where: { id: data.toBranchId, organizationId: session.organizationId },
    }),
    prisma.product.findFirst({
      where: { id: data.productId, organizationId: session.organizationId },
    }),
  ]);

  if (!fromBranch) return apiError("Filial de origem não encontrada", 404);
  if (!toBranch) return apiError("Filial de destino não encontrada", 404);
  if (!product) return apiError("Produto não encontrado", 404);

  try {
    await transferStock({
      organizationId: session.organizationId,
      fromBranchId: data.fromBranchId,
      toBranchId: data.toBranchId,
      productId: data.productId,
      variantId: data.variantId,
      quantity: data.quantity,
      userId: session.userId,
    });

    return apiSuccess({ message: "Transferência realizada com sucesso" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro na transferência";
    return apiError(message, 400);
  }
}, "stock.manage");
