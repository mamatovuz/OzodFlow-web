import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";

// Panel yuqorisida ko'rsatiladigan to'lov ogohlantirishi (hali qulflanmagan)
export function PaymentWarning({
  daysLeft,
  overdue,
  graceUntil,
}: {
  daysLeft: number | null;
  overdue: boolean;
  graceUntil: Date | null;
}) {
  if (overdue) {
    const grace = graceUntil
      ? new Date(graceUntil).toLocaleDateString("uz-UZ")
      : null;
    return (
      <Link href="/dashboard/settings" className="block">
        <div className="flex items-center gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error transition-colors hover:bg-error/15">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="font-medium">
            To'lov muddati o'tdi!{" "}
            {grace && <>{grace} gacha</>} to'lang, aks holda panel qulflanadi.
            <span className="ml-1 underline">To'lash →</span>
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link href="/dashboard/settings" className="block">
      <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning transition-colors hover:bg-warning/15">
        <Clock className="h-5 w-5 shrink-0" />
        <p className="font-medium">
          Obuna to'loviga {daysLeft} kun qoldi. Vaqtida to'lang.
          <span className="ml-1 underline">To'lash →</span>
        </p>
      </div>
    </Link>
  );
}
