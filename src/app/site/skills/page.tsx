import type { Metadata } from "next";

export const metadata: Metadata = { title: "Skills" };

const skills = [
  { name: "HTML", desc: "Sayt strukturasi" },
  { name: "CSS", desc: "Dizayn va layout" },
  { name: "JavaScript", desc: "Interaktivlik va logika" },
  { name: "React", desc: "Frontend framework" },
  { name: "Node.js", desc: "Backend yaratish" },
  { name: "Database", desc: "Ma'lumot saqlash" },
];

export default function SiteSkills() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Men bilgan <span className="text-accent">texnologiyalar</span>
      </h1>
      <p className="mt-2 text-muted">Ishlashda foydalanadigan asosiy stack.</p>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {skills.map((s) => (
          <div
            key={s.name}
            className="rounded-xl border border-border p-4 transition-colors hover:border-foreground"
          >
            <h3 className="font-semibold">{s.name}</h3>
            <p className="mt-0.5 text-sm text-muted">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
