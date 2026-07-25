import { db } from "@/lib/db";
import { SkillKind } from "@/lib/enums";

/**
 * Ko'nikmalar ro'yxati.
 *
 * Nega alohida jadval (developer profilida matn maydoni emas):
 *  • "React" va "react" ikki xil ko'nikma bo'lib qolmaydi
 *  • ko'nikma bo'yicha filtr va qidiruv indeks bilan tez ishlaydi
 *  • admin yangi texnologiya qo'shsa, u darhol barcha filtrlarda paydo bo'ladi
 */

const SKILLS: Array<{ slug: string; name: string; kind: string }> = [
  // ── Programlash tillari ────────────────────────────────────────────────────
  { slug: "javascript", name: "JavaScript", kind: SkillKind.LANGUAGE },
  { slug: "typescript", name: "TypeScript", kind: SkillKind.LANGUAGE },
  { slug: "python", name: "Python", kind: SkillKind.LANGUAGE },
  { slug: "php", name: "PHP", kind: SkillKind.LANGUAGE },
  { slug: "java", name: "Java", kind: SkillKind.LANGUAGE },
  { slug: "kotlin", name: "Kotlin", kind: SkillKind.LANGUAGE },
  { slug: "swift", name: "Swift", kind: SkillKind.LANGUAGE },
  { slug: "csharp", name: "C#", kind: SkillKind.LANGUAGE },
  { slug: "go", name: "Go", kind: SkillKind.LANGUAGE },
  { slug: "rust", name: "Rust", kind: SkillKind.LANGUAGE },
  { slug: "dart", name: "Dart", kind: SkillKind.LANGUAGE },
  { slug: "sql", name: "SQL", kind: SkillKind.LANGUAGE },

  // ── Freymvorklar va kutubxonalar ──────────────────────────────────────────
  { slug: "react", name: "React", kind: SkillKind.FRAMEWORK },
  { slug: "nextjs", name: "Next.js", kind: SkillKind.FRAMEWORK },
  { slug: "vue", name: "Vue", kind: SkillKind.FRAMEWORK },
  { slug: "nuxt", name: "Nuxt", kind: SkillKind.FRAMEWORK },
  { slug: "angular", name: "Angular", kind: SkillKind.FRAMEWORK },
  { slug: "svelte", name: "Svelte", kind: SkillKind.FRAMEWORK },
  { slug: "nodejs", name: "Node.js", kind: SkillKind.FRAMEWORK },
  { slug: "nestjs", name: "NestJS", kind: SkillKind.FRAMEWORK },
  { slug: "express", name: "Express", kind: SkillKind.FRAMEWORK },
  { slug: "django", name: "Django", kind: SkillKind.FRAMEWORK },
  { slug: "fastapi", name: "FastAPI", kind: SkillKind.FRAMEWORK },
  { slug: "laravel", name: "Laravel", kind: SkillKind.FRAMEWORK },
  { slug: "spring", name: "Spring", kind: SkillKind.FRAMEWORK },
  { slug: "dotnet", name: ".NET", kind: SkillKind.FRAMEWORK },
  { slug: "flutter", name: "Flutter", kind: SkillKind.FRAMEWORK },
  { slug: "react-native", name: "React Native", kind: SkillKind.FRAMEWORK },
  { slug: "aiogram", name: "Aiogram", kind: SkillKind.FRAMEWORK },
  { slug: "telegraf", name: "Telegraf", kind: SkillKind.FRAMEWORK },
  { slug: "tailwindcss", name: "Tailwind CSS", kind: SkillKind.FRAMEWORK },

  // ── Ma'lumotlar bazasi ────────────────────────────────────────────────────
  { slug: "postgresql", name: "PostgreSQL", kind: SkillKind.DATABASE },
  { slug: "mysql", name: "MySQL", kind: SkillKind.DATABASE },
  { slug: "sqlite", name: "SQLite", kind: SkillKind.DATABASE },
  { slug: "mongodb", name: "MongoDB", kind: SkillKind.DATABASE },
  { slug: "redis", name: "Redis", kind: SkillKind.DATABASE },
  { slug: "elasticsearch", name: "Elasticsearch", kind: SkillKind.DATABASE },
  { slug: "prisma", name: "Prisma", kind: SkillKind.DATABASE },

  // ── DevOps ────────────────────────────────────────────────────────────────
  { slug: "docker", name: "Docker", kind: SkillKind.DEVOPS },
  { slug: "kubernetes", name: "Kubernetes", kind: SkillKind.DEVOPS },
  { slug: "nginx", name: "Nginx", kind: SkillKind.DEVOPS },
  { slug: "linux", name: "Linux", kind: SkillKind.DEVOPS },
  { slug: "git", name: "Git", kind: SkillKind.DEVOPS },
  { slug: "ci-cd", name: "CI/CD", kind: SkillKind.DEVOPS },
  { slug: "aws", name: "AWS", kind: SkillKind.DEVOPS },
  { slug: "cloudflare", name: "Cloudflare", kind: SkillKind.DEVOPS },

  // ── Dizayn ────────────────────────────────────────────────────────────────
  { slug: "figma", name: "Figma", kind: SkillKind.DESIGN },
  { slug: "ui-design", name: "UI dizayn", kind: SkillKind.DESIGN },
  { slug: "ux-research", name: "UX tadqiqot", kind: SkillKind.DESIGN },
  { slug: "photoshop", name: "Photoshop", kind: SkillKind.DESIGN },
  { slug: "illustrator", name: "Illustrator", kind: SkillKind.DESIGN },
  { slug: "after-effects", name: "After Effects", kind: SkillKind.DESIGN },
  { slug: "blender", name: "Blender", kind: SkillKind.DESIGN },
  { slug: "motion-design", name: "Motion dizayn", kind: SkillKind.DESIGN },

  // ── Boshqa ────────────────────────────────────────────────────────────────
  { slug: "seo", name: "SEO", kind: SkillKind.OTHER },
  { slug: "copywriting", name: "Kopirayting", kind: SkillKind.OTHER },
  { slug: "smm", name: "SMM", kind: SkillKind.OTHER },
  { slug: "video-editing", name: "Video montaj", kind: SkillKind.OTHER },
  { slug: "data-analysis", name: "Ma'lumot tahlili", kind: SkillKind.OTHER },
  { slug: "machine-learning", name: "Machine Learning", kind: SkillKind.OTHER },
  { slug: "prompt-engineering", name: "Prompt engineering", kind: SkillKind.OTHER },
  { slug: "penetration-testing", name: "Penetration testing", kind: SkillKind.OTHER },
];

export async function seedSkills(): Promise<number> {
  for (const skill of SKILLS) {
    await db.skill.upsert({
      where: { slug: skill.slug },
      update: { isActive: true },
      create: skill,
    });
  }

  return SKILLS.length;
}
