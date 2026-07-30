import Link from "next/link";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <Logo />
      <h1 className="mt-8 text-6xl font-bold text-foreground">404</h1>
      <p className="mt-2 text-muted">Sahifa yoki menyu topilmadi</p>
      <Link href="/" className="mt-6">
        <Button>Bosh sahifaga qaytish</Button>
      </Link>
    </div>
  );
}
