import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen">
      {/* Chap: forma */}
      <div className="flex w-full flex-col px-4 py-6 sm:px-8 lg:w-1/2">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm animate-fade-up">{children}</div>
        </div>
        <p className="text-center text-xs text-muted">
          © {new Date().getFullYear()} OzodFlow
        </p>
      </div>

      {/* O'ng: brend paneli */}
      <div className="relative hidden w-1/2 overflow-hidden bg-accent lg:block">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute right-10 top-20 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-10 left-10 h-64 w-64 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative flex h-full flex-col justify-center px-16 text-white">
          <h2 className="text-4xl font-bold leading-tight">
            Restoraningizni raqamlashtiring
          </h2>
          <p className="mt-4 max-w-md text-white/80">
            QR kod orqali zamonaviy elektron menyu. Menyuni boshqaring,
            statistikani kuzating va mijozlaringizga premium tajriba taqdim
            eting.
          </p>
          <ul className="mt-8 space-y-3 text-white/90">
            {[
              "Cheksiz menyu boshqaruvi",
              "Real vaqt statistikasi",
              "Barcha filiallar bitta panelda",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
          <Link
            href="/"
            className="mt-10 inline-block text-sm text-white/70 hover:text-white"
          >
            ← Bosh sahifaga qaytish
          </Link>
        </div>
      </div>
    </div>
  );
}
