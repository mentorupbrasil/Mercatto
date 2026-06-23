import prisma from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

async function main() {
  console.log("🌱 Seeding Mercatto database...");

  const org = await prisma.organization.upsert({
    where: { slug: "demo-loja" },
    update: {},
    create: {
      name: "Mercatto Demo Store",
      slug: "demo-loja",
      cnpj: "12.345.678/0001-90",
      email: "contato@mercatto.demo",
      phone: "(11) 99999-0000",
      segment: "CLOTHING",
      plan: "PROFESSIONAL",
    },
  });

  const branch = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "MATRIZ" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Loja Matriz",
      code: "MATRIZ",
      address: "Av. Paulista, 1000",
      city: "São Paulo",
      state: "SP",
      isMain: true,
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "SHOP01" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Filial Shopping",
      code: "SHOP01",
      address: "Shopping Center, Loja 42",
      city: "São Paulo",
      state: "SP",
    },
  });

  const adminHash = await hashPassword("admin123");
  const admin = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "admin@mercatto.demo" } },
    update: {},
    create: {
      organizationId: org.id,
      email: "admin@mercatto.demo",
      passwordHash: adminHash,
      name: "Administrador",
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "caixa@mercatto.demo" } },
    update: {},
    create: {
      organizationId: org.id,
      email: "caixa@mercatto.demo",
      passwordHash: await hashPassword("caixa123"),
      name: "João Caixa",
      role: "CASHIER",
    },
  });

  const catRoupas = await prisma.category.create({
    data: { organizationId: org.id, name: "Roupas" },
  });
  const catCalcados = await prisma.category.create({
    data: { organizationId: org.id, name: "Calçados" },
  });

  const brandNike = await prisma.brand.create({
    data: { organizationId: org.id, name: "Nike" },
  });

  const supplier = await prisma.supplier.create({
    data: {
      organizationId: org.id,
      name: "Distribuidora Fashion LTDA",
      cnpj: "98.765.432/0001-10",
      email: "vendas@fashion.com",
      phone: "(11) 3333-4444",
      deliveryDays: 5,
    },
  });

  const camiseta = await prisma.product.create({
    data: {
      organizationId: org.id,
      internalCode: "CAM001",
      barcode: "7891234567890",
      name: "Camiseta Básica",
      categoryId: catRoupas.id,
      brandId: brandNike.id,
      supplierId: supplier.id,
      cost: 25,
      price: 59.9,
      minStock: 10,
      hasVariants: true,
      variants: {
        create: [
          { sku: "CAM001-P-PRETA", color: "Preta", size: "P", cost: 25, price: 59.9 },
          { sku: "CAM001-M-PRETA", color: "Preta", size: "M", cost: 25, price: 59.9 },
          { sku: "CAM001-G-PRETA", color: "Preta", size: "G", cost: 25, price: 59.9 },
          { sku: "CAM001-P-BRANCA", color: "Branca", size: "P", cost: 25, price: 59.9 },
          { sku: "CAM001-M-BRANCA", color: "Branca", size: "M", cost: 25, price: 59.9 },
        ],
      },
    },
    include: { variants: true },
  });

  const tenis = await prisma.product.create({
    data: {
      organizationId: org.id,
      internalCode: "TEN001",
      barcode: "7891234567891",
      name: "Tênis Running Pro",
      categoryId: catCalcados.id,
      brandId: brandNike.id,
      supplierId: supplier.id,
      cost: 120,
      price: 299.9,
      minStock: 5,
      hasVariants: true,
      variants: {
        create: [
          { sku: "TEN001-40", size: "40", cost: 120, price: 299.9 },
          { sku: "TEN001-41", size: "41", cost: 120, price: 299.9 },
          { sku: "TEN001-42", size: "42", cost: 120, price: 299.9 },
        ],
      },
    },
    include: { variants: true },
  });

  for (const variant of [...camiseta.variants, ...tenis.variants]) {
    await prisma.stock.create({
      data: {
        branchId: branch.id,
        productId: variant.productId,
        variantId: variant.id,
        quantity: Math.floor(Math.random() * 50) + 10,
      },
    });
  }

  const customer = await prisma.customer.create({
    data: {
      organizationId: org.id,
      name: "Maria Silva",
      cpfCnpj: "123.456.789-00",
      email: "maria@email.com",
      phone: "(11) 98888-7777",
      whatsapp: "(11) 98888-7777",
      birthDate: new Date("1990-06-23"),
    },
  });

  await prisma.customer.create({
    data: {
      organizationId: org.id,
      name: "Pedro Santos",
      cpfCnpj: "987.654.321-00",
      email: "pedro@email.com",
      phone: "(11) 97777-6666",
    },
  });

  const employee = await prisma.employee.create({
    data: {
      organizationId: org.id,
      userId: admin.id,
      name: "Administrador",
      role: "Gerente",
      commissionRate: 2,
      salary: 5000,
    },
  });

  await prisma.goal.create({
    data: {
      organizationId: org.id,
      employeeId: employee.id,
      name: "Meta de Vendas - Junho",
      type: "REVENUE",
      target: 50000,
      current: 12500,
      periodStart: new Date("2026-06-01"),
      periodEnd: new Date("2026-06-30"),
    },
  });

  await prisma.accountPayable.createMany({
    data: [
      {
        organizationId: org.id,
        supplierId: supplier.id,
        description: "Compra de mercadorias",
        category: "Fornecedores",
        amount: 3500,
        dueDate: new Date("2026-06-30"),
        status: "OPEN",
      },
      {
        organizationId: org.id,
        description: "Aluguel",
        category: "Despesas Fixas",
        amount: 4500,
        dueDate: new Date("2026-07-05"),
        status: "OPEN",
      },
    ],
  });

  await prisma.accountReceivable.create({
    data: {
      organizationId: org.id,
      customerId: customer.id,
      description: "Venda a prazo - Parcela 1/3",
      installment: 1,
      totalInstallments: 3,
      amount: 500,
      dueDate: new Date("2026-07-15"),
      status: "OPEN",
    },
  });

  await prisma.appointment.create({
    data: {
      organizationId: org.id,
      branchId: branch.id,
      customerId: customer.id,
      userId: admin.id,
      title: "Prova de vestido",
      type: "FITTING",
      startAt: new Date(new Date().setHours(14, 0, 0, 0)),
      endAt: new Date(new Date().setHours(15, 0, 0, 0)),
    },
  });

  await prisma.loyaltyProgram.create({
    data: {
      organizationId: org.id,
      name: "Mercatto Fidelidade",
      type: "HYBRID",
      pointsPerReal: 1,
      cashbackRate: 2,
    },
  });

  console.log("✅ Seed completed!");
  console.log("   Login: admin@mercatto.demo / admin123");
  console.log("   Login: caixa@mercatto.demo / caixa123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
