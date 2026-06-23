import { withAuth, apiSuccess } from "@/lib/api-helpers";
import { predictPurchaseNeeds } from "@/lib/services/analytics";

export const GET = withAuth(async (req, session) => {
  const { searchParams } = req.nextUrl;
  const branchId = searchParams.get("branchId") ?? undefined;
  const days = parseInt(searchParams.get("days") ?? "30", 10);

  const predictions = await predictPurchaseNeeds(
    session.organizationId,
    branchId,
    days
  );

  return apiSuccess({ predictions, days, branchId });
}, "reports.view");
