import { withAuth, apiSuccess } from "@/lib/api-helpers";
import { getABCCurve } from "@/lib/services/analytics";

export const GET = withAuth(async (req, session) => {
  const days = parseInt(req.nextUrl.searchParams.get("days") ?? "90", 10);
  const curve = await getABCCurve(session.organizationId, days);
  return apiSuccess({ curve, days });
}, "reports.view");
