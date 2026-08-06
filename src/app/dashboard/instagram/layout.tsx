import { Instagram } from "lucide-react";
import { IgNav } from "@/components/dashboard/instagram/ig-nav";

export default function InstagramLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white">
          <Instagram className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Instagram Automation</h1>
          <p className="text-sm text-muted">Comment va DM'larni avtomatik boshqaring</p>
        </div>
      </div>
      <IgNav />
      {children}
    </div>
  );
}
