import { withAuth, apiSuccess } from "@/lib/api-helpers";
import { getDRE } from "@/lib/services/analytics";
import { startOfMonth, endOfMonth, format } from "date-fns";

export const GET = withAuth(async (req, session) => {
  const { searchParams } = req.nextUrl;
  let startDate = searchParams.get("startDate");
  let endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    const now = new Date();
    startDate = format(startOfMonth(now), "yyyy-MM-dd");
    endDate = format(endOfMonth(now), "yyyy-MM-dd");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return apiSuccess({
      dre: {
        grossRevenue: 0,
        discounts: 0,
        netRevenue: 0,
        cogs: 0,
        grossProfit: 0,
        expenses: 0,
        operatingProfit: 0,
        margin: 0,
      },
      period: { startDate, endDate },
    });
  }

  const dre = await getDRE(session.organizationId, start, end);
  return apiSuccess({ dre, period: { startDate, endDate } });
}, "reports.view");
