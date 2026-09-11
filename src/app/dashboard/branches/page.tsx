import Link from "next/link";
import { redirect } from "next/navigation";
import { Store, Wallet, ShoppingBag, QrCode, Trophy, ExternalLink, Crown } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getBranchesOverview } from "@/lib/stats";
import { getBranchInfo } from "@/lib/branches";
import { isOwner } from "@/lib/api";
import { BRANCH_PRICE } from "@/lib/plans";
import { formatPrice } from "@/lib/utils";
import { Card, Badge } from "@/components/ui";
import { AddBranch } from "@/components/dashboard/add-branch";
import { BranchDeleteButton } from "@/components/dashboard/branch-actions";

export const dynamic = "force-dynamic";

export default async function BranchesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const [data, info, owner] = await Promise.all([
    getBranchesOverview(user.id),
    getBranchInfo(user.id),
    isOwner(user.id),
  ]);
  const cur = data.currency;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Filiallar</h1>
          <p className="mt-1 text-sm text-muted">
            Barcha restoranlaringiz — bitta paneldan kuzating
          </p>
        </div>
        {owner && (
          <AddBranch
            canBranches={info.canBranches}
            canAddFree={info.canAddFree}
            allowance={info.allowance}
            addedBranches={info.addedBranches}
            price={BRANCH_PRICE}
          />
        )}
      </div>

      {data.branches.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted">Sizda hali restoran yo'q.</p>
        </Card>
      ) : (
        <>
          {/* Umumiy ko'rsatkichlar (bugun) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Sum icon={Store} label="Filiallar" value={String(data.branches.length)} />
            <Sum icon={Wallet} label="Umumiy savdo (bugun)" value={formatPrice(data.totalRevenue, cur)} accent />
            <Sum icon={ShoppingBag} label="Buyurtmalar (bugun)" value={String(data.totalOrders)} />
            <Sum icon={QrCode} label="Skanerlar (bugun)" value={String(data.totalScans)} />
          </div>

          {/* Eng yaxshi filial */}
          {data.best && data.best.todayRevenue > 0 && (
            <Card className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white">
                <Trophy className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted">Bugun eng yaxshi filial</p>
                <p className="text-lg font-bold text-foreground">{data.best.name}</p>
              </div>
              <span className="ml-auto text-lg font-bold text-accent">
                {formatPrice(data.best.todayRevenue, cur)}
              </span>
            </Card>
          )}

          {/* Filiallar ro'yxati */}
          <div className="grid gap-4 md:grid-cols-2">
            {data.branches.map((b, i) => (
              <Card key={b.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-soft text-accent">
                      {b.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.logo} alt={b.name} className="h-full w-full object-cover" />
                      ) : (
                        <Store className="h-5 w-5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{b.name}</p>
                      <p className="truncate text-xs text-muted">/{b.slug}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {i === 0 && <Badge variant="accent">Asosiy</Badge>}
                    {b.plan !== "FREE" && (
                      <Badge variant="accent">
                        <Crown className="h-3 w-3" /> {b.plan}
                      </Badge>
                    )}
                    {b.isBlocked && <Badge variant="error">Bloklangan</Badge>}
                    {/* Asosiy filialdan tashqari — o'chirish mumkin (faqat egasi) */}
                    {owner && i > 0 && <BranchDeleteButton id={b.id} name={b.name} />}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <BranchStat label="Savdo" value={formatPrice(b.todayRevenue, cur)} />
                  <BranchStat label="Buyurtma" value={String(b.todayOrders)} />
                  <BranchStat label="Skan" value={String(b.todayScans)} />
                </div>

                <a
                  href={`/m/${b.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm font-medium text-foreground transition hover:bg-surface-2"
                >
                  <ExternalLink className="h-4 w-4" /> Menyuni ochish
                </a>
              </Card>
            ))}
          </div>

          <p className="text-center text-xs text-muted">
            Yangi filial qo'shmoqchimisiz? Har bir filial — alohida restoran hisobi.{" "}
            <Link href="/register" className="font-medium text-accent hover:underline">
              Yangi restoran yaratish
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

function Sum({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Store;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <Card className={`p-5 ${accent ? "border-accent/40" : ""}`}>
      <div
        className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
          accent ? "bg-accent text-white" : "bg-accent-soft text-accent"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-sm text-muted">{label}</p>
    </Card>
  );
}

function BranchStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface p-2">
      <p className="truncate text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  );
}
