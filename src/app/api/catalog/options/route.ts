import prisma from "@/lib/db";
import { withAuth, apiSuccess } from "@/lib/api-helpers";
import { ensureOrganizationCatalog } from "@/lib/services/catalog-seed";

export const GET = withAuth(async (_req, session) => {
  await ensureOrganizationCatalog(session.organizationId);

  const [
    categories,
    brands,
    models,
    colors,
    sizes,
    locations,
    expenseCategories,
    suppliers,
  ] = await Promise.all([
    prisma.category.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.brand.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.productModel.findMany({
      where: { organizationId: session.organizationId, active: true },
      include: { brand: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.colorOption.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.sizeOption.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.storageLocation.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.expenseCategory.findMany({
      where: { organizationId: session.organizationId, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { organizationId: session.organizationId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return apiSuccess({
    categories,
    brands,
    models,
    colors,
    sizes,
    locations,
    expenseCategories,
    suppliers,
    units: [
      { value: "UN", label: "Unidade" },
      { value: "KG", label: "Quilograma" },
      { value: "G", label: "Grama" },
      { value: "L", label: "Litro" },
      { value: "ML", label: "Mililitro" },
      { value: "M", label: "Metro" },
      { value: "M2", label: "Metro²" },
      { value: "CX", label: "Caixa" },
      { value: "PC", label: "Peça" },
      { value: "PAR", label: "Par" },
    ],
    employeeRoles: [
      "Gerente", "Vendedor", "Caixa", "Estoquista", "Auxiliar", "Administrativo",
    ],
    appointmentTypes: [
      { value: "GENERAL", label: "Geral" },
      { value: "FITTING", label: "Prova" },
      { value: "VIP", label: "VIP" },
      { value: "EXAM", label: "Exame" },
      { value: "GROOMING", label: "Banho/Tosa" },
      { value: "DELIVERY", label: "Entrega" },
      { value: "REPAIR", label: "Reparo" },
      { value: "CONSULTATION", label: "Consulta" },
    ],
  });
}, "products.view");
