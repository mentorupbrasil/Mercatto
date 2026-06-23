import { withAuth, apiSuccess } from "@/lib/api-helpers";
import { getDashboardMetrics } from "@/lib/services/dashboard";

export const GET = withAuth(async (req, session) => {
  const branchId = req.nextUrl.searchParams.get("branchId") ?? undefined;
  const metrics = await getDashboardMetrics(session.organizationId, branchId);
  return apiSuccess(metrics);
}, "dashboard.view");
