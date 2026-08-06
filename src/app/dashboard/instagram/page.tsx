import { Suspense } from "react";
import { IgDashboard } from "@/components/dashboard/instagram/ig-dashboard";
import { Skeleton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function InstagramDashboardPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <IgDashboard />
    </Suspense>
  );
}
