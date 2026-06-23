# Mercatto — Gestão de Lojas

SaaS modular para gestão completa de varejo: roupas, calçados, papelaria, autopeças, materiais de construção, conveniência, supermercados e mais.

## Stack

- **Frontend:** Next.js 15 + React 19 + Tailwind CSS
- **Backend:** Next.js API Routes
- **Banco:** PostgreSQL + Prisma ORM
- **Auth:** JWT com RBAC (Admin, Gerente, Caixa, Estoquista, Visualizador)

## Módulos

| Módulo | Descrição |
|--------|-----------|
| Dashboard | KPIs, fluxo de caixa, ranking, estoque baixo, aniversariantes |
| Produtos | Grade cor/tamanho, código de barras, margem, QR Code |
| Estoque | Movimentações, inventário, transferência entre filiais |
| Compras | Pedidos + previsão inteligente de reposição (IA) |
| PDV | Caixa com múltiplas formas de pagamento |
| Financeiro | Contas a pagar/receber, fluxo de caixa, DRE |
| CRM | Clientes, histórico, ticket médio |
| Fidelidade | Pontos, cashback, cupons |
| Agenda | Provas, VIP, exames, entregas |
| Funcionários | Comissões, metas, ranking |
| Relatórios | Curva ABC, giro, ticket médio |
| Multi-empresa | Várias lojas/filiais com login único |
| Auditoria | Log completo de alterações |

## Setup

### 1. Pré-requisitos

- Node.js 18+
- PostgreSQL rodando localmente (ou remoto)

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar ambiente

```bash
cp .env.example .env
```

Edite `.env` com sua connection string PostgreSQL:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mercatto?schema=public"
JWT_SECRET="sua-chave-secreta-longa-aqui"
```

### 4. Criar banco e popular dados demo

```bash
npm run db:push
npm run db:seed
```

### 5. Rodar

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

### Credenciais demo

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Admin | admin@mercatto.demo | admin123 |
| Caixa | caixa@mercatto.demo | caixa123 |

## Estrutura

```
src/
├── app/
│   ├── (auth)/          # Login e registro
│   ├── (dashboard)/     # Páginas do sistema
│   └── api/             # REST API
├── components/          # UI reutilizável
├── lib/
│   ├── services/        # Lógica de negócio
│   ├── auth.ts          # Autenticação JWT
│   └── permissions.ts   # RBAC
prisma/
├── schema.prisma        # Modelo completo do banco
└── seed.ts              # Dados demo
```

## Licença

Projeto privado — mentorupbrasil/Mercatto
