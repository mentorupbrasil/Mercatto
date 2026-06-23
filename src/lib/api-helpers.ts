import { NextRequest, NextResponse } from "next/server";
import { getSession } from "./auth";
import { UserRole } from "@prisma/client";
import { hasPermission, Permission } from "./permissions";

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function withAuth(
  handler: (
    req: NextRequest,
    session: NonNullable<Awaited<ReturnType<typeof getSession>>>
  ) => Promise<NextResponse>,
  permission?: Permission
) {
  return async (req: NextRequest) => {
    try {
      const session = await getSession();
      if (!session) return apiError("Não autenticado", 401);
      if (permission && !hasPermission(session.role as UserRole, permission)) {
        return apiError("Sem permissão", 403);
      }
      return handler(req, session);
    } catch (err) {
      console.error(err);
      return apiError("Erro interno", 500);
    }
  };
}

export async function parseBody<T>(req: NextRequest): Promise<T> {
  return req.json() as Promise<T>;
}
