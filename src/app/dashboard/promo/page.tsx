import { MyPromo } from "@/components/dashboard/my-promo";

export const dynamic = "force-dynamic";

export default function PromoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Promo kodlar</h1>
        <p className="mt-1 text-sm text-muted">
          Yillik chegirma kodini oling va to'lov paytida ishlating
        </p>
      </div>
      <MyPromo />
    </div>
  );
}
