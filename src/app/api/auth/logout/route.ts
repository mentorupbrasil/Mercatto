import { clearSessionCookie } from "@/lib/auth";
import { apiSuccess } from "@/lib/api-helpers";

export async function POST() {
  await clearSessionCookie();
  return apiSuccess({ message: "Sessão encerrada com sucesso" });
}
