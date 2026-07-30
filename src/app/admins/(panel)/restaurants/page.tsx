import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui";
import { PLANS, type PlanKey } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function AdminRestaurantsPage() {
  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      _count: { select: { products: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Restoranlar</h1>
        <p className="mt-1 text-sm text-muted">
          Jami {restaurants.length} ta restoran
        </p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-3 font-medium">Restoran</th>
                <th className="px-4 py-3 font-medium">Egasi</th>
                <th className="px-4 py-3 font-medium">Tarif</th>
                <th className="px-4 py-3 font-medium">Mahsulot</th>
                <th className="px-4 py-3 font-medium">Sana</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {restaurants.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted">/m/{r.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{r.owner.name}</p>
                    <p className="text-xs text-muted">
                      {r.owner.email || r.owner.phone}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={r.plan === "FREE" ? "default" : "accent"}>
                      {PLANS[r.plan as PlanKey]?.name || r.plan}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {r._count.products}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(r.createdAt).toLocaleDateString("uz-UZ")}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/m/${r.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted hover:text-accent"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
