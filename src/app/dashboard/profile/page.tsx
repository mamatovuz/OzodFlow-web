import { getSessionUser } from "@/lib/auth";
import { getUserRestaurant } from "@/lib/api";
import { ProfileForm } from "@/components/dashboard/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = (await getSessionUser())!;
  const restaurant = (await getUserRestaurant(user.id))!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Restoran profili</h1>
        <p className="mt-1 text-sm text-muted">
          Bu ma'lumotlar mijoz ko'radigan menyuda ko'rsatiladi
        </p>
      </div>
      <ProfileForm initial={restaurant} />
    </div>
  );
}
