import prisma from "../db";
import { RetailSegment } from "@prisma/client";

const COLORS = [
  { name: "Preto", hexCode: "#111827", sortOrder: 1 },
  { name: "Branco", hexCode: "#FFFFFF", sortOrder: 2 },
  { name: "Azul", hexCode: "#2563EB", sortOrder: 3 },
  { name: "Vermelho", hexCode: "#DC2626", sortOrder: 4 },
  { name: "Verde", hexCode: "#16A34A", sortOrder: 5 },
  { name: "Cinza", hexCode: "#6B7280", sortOrder: 6 },
  { name: "Bege", hexCode: "#D6C4A8", sortOrder: 7 },
  { name: "Rosa", hexCode: "#EC4899", sortOrder: 8 },
];

const CLOTHING_SIZES = ["PP", "P", "M", "G", "GG", "XG", "XXG"];
const FOOTWEAR_SIZES = ["34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44"];
const GENERAL_SIZES = ["Único", "P", "M", "G"];

const LOCATIONS = [
  "Prateleira A1", "Prateleira A2", "Prateleira A3",
  "Prateleira B1", "Prateleira B2", "Vitrine", "Estoque", "Depósito",
];

const EXPENSE_CATEGORIES = [
  "Fornecedores", "Aluguel", "Salários", "Energia", "Água",
  "Internet", "Impostos", "Marketing", "Manutenção", "Outros",
];

const EMPLOYEE_ROLES = [
  "Gerente", "Vendedor", "Caixa", "Estoquista", "Auxiliar", "Administrativo",
];

const CATEGORIES_BY_SEGMENT: Record<RetailSegment, string[]> = {
  GENERAL: ["Geral", "Promoções", "Acessórios", "Outros"],
  CLOTHING: ["Camisetas", "Calças", "Vestidos", "Casacos", "Íntima", "Acessórios", "Outros"],
  FOOTWEAR: ["Tênis", "Sandálias", "Botas", "Chinelos", "Social", "Outros"],
  STATIONERY: ["Cadernos", "Canetas", "Papel", "Arquivo", "Escolar", "Outros"],
  AUTO_PARTS: [
    "Filtros", "Freios", "Suspensão", "Motor", "Sistema elétrico", "Baterias",
    "Alternador e partida", "Iluminação", "Sensores e atuadores", "Fusíveis e relés",
    "Chicotes e conectores", "Injeção eletrônica", "Fluidos e lubrificantes",
    "Ignição", "Correias", "Pneus", "Acessórios", "Outros",
  ],
  CONSTRUCTION: ["Cimento", "Tintas", "Ferragens", "Hidráulica", "Elétrica", "Outros"],
  CONVENIENCE: ["Bebidas", "Snacks", "Higiene", "Limpeza", "Outros"],
  SUPERMARKET: ["Mercearia", "Frios", "Hortifruti", "Bebidas", "Limpeza", "Outros"],
  OPTICAL: ["Armações", "Lentes", "Sol", "Acessórios", "Outros"],
  PET_SHOP: ["Ração", "Brinquedos", "Higiene", "Medicamentos", "Outros"],
  TECH_REPAIR: ["Peças", "Acessórios", "Serviços", "Outros"],
};

const BRANDS_BY_SEGMENT: Record<RetailSegment, string[]> = {
  GENERAL: ["Genérico", "Premium", "Importado"],
  CLOTHING: ["Nike", "Adidas", "Hering", "Malwee", "Renner", "Genérico"],
  FOOTWEAR: ["Nike", "Adidas", "Olympikus", "Mizuno", "Arezzo", "Genérico"],
  STATIONERY: ["Faber-Castell", "Bic", "Tilibra", "Genérico"],
  AUTO_PARTS: ["Bosch", "NGK", "Mahle", "Monroe", "Cofap", "Genérico"],
  CONSTRUCTION: ["Votorantim", "Suvinil", "Tigre", "Genérico"],
  CONVENIENCE: ["Coca-Cola", "Nestlé", "Genérico"],
  SUPERMARKET: ["Nestlé", "Unilever", "Genérico"],
  OPTICAL: ["Ray-Ban", "Oakley", "Genérico"],
  PET_SHOP: ["Golden", "Pedigree", "Genérico"],
  TECH_REPAIR: ["Samsung", "Apple", "Genérico"],
};

export async function seedOrganizationCatalog(
  organizationId: string,
  segment: RetailSegment = "GENERAL"
) {
  const existing = await prisma.category.count({ where: { organizationId } });
  if (existing > 0) return;

  const categories = CATEGORIES_BY_SEGMENT[segment] ?? CATEGORIES_BY_SEGMENT.GENERAL;
  const brands = BRANDS_BY_SEGMENT[segment] ?? BRANDS_BY_SEGMENT.GENERAL;
  const sizes =
    segment === "FOOTWEAR"
      ? FOOTWEAR_SIZES
      : segment === "CLOTHING"
        ? CLOTHING_SIZES
        : GENERAL_SIZES;

  await prisma.$transaction([
    ...categories.map((name) =>
      prisma.category.create({ data: { organizationId, name } })
    ),
    ...brands.map((name) =>
      prisma.brand.create({ data: { organizationId, name } })
    ),
    ...COLORS.map((c) =>
      prisma.colorOption.create({
        data: { organizationId, name: c.name, hexCode: c.hexCode, sortOrder: c.sortOrder },
      })
    ),
    ...sizes.map((name, i) =>
      prisma.sizeOption.create({ data: { organizationId, name, sortOrder: i } })
    ),
    ...LOCATIONS.map((name) =>
      prisma.storageLocation.create({ data: { organizationId, name } })
    ),
    ...EXPENSE_CATEGORIES.map((name) =>
      prisma.expenseCategory.create({ data: { organizationId, name } })
    ),
  ]);

  const createdBrands = await prisma.brand.findMany({
    where: { organizationId },
    take: 3,
  });

  const modelNames =
    segment === "AUTO_PARTS"
      ? ["Original", "Paralelo", "Premium"]
      : segment === "CLOTHING"
        ? ["Básica", "Premium", "Linha Esportiva"]
        : ["Padrão", "Premium", "Econômico"];

  for (const brand of createdBrands) {
    for (const modelName of modelNames) {
      await prisma.productModel.create({
        data: { organizationId, brandId: brand.id, name: `${brand.name} ${modelName}` },
      }).catch(() => null);
    }
  }
}

export async function ensureOrganizationCatalog(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { segment: true },
  });
  if (!org) return;
  await seedOrganizationCatalog(organizationId, org.segment);
}

export const CATALOG_EMPLOYEE_ROLES = EMPLOYEE_ROLES;
