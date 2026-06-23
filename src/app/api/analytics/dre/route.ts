import { withAuth, apiError, apiSuccess } from "@/lib/api-helpers";
import { getDRE } from "@/lib/services/analytics";

export const GET = withAuth(async (req, session) => {
  const { searchParams } = req.nextUrl;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return apiError("Parâmetros startDate e endDate são obrigatórios", 400);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return apiError("Datas inválidas", 400);
  }

  const dre = await getDRE(session.organizationId, start, end);
  return apiSuccess({ dre, period: { startDate, endDate } });
}, "reports.view");
