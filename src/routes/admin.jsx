import { createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  BriefcaseBusiness,
  Database,
  Globe,
  LayoutGrid,
  LogOut,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  DEFAULT_SITE_DATA,
  fetchSiteData,
  getStoredSiteData,
  saveSiteData,
  storeSiteData,
} from "@/lib/site-data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "OzodFlow Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

const ADMIN_LOGIN = "admin";
const ADMIN_PASSWORD = "ozodflow2026";
const SESSION_KEY = "ozodflow-admin-session";
const iconOptions = ["Globe", "Bot", "Database", "LayoutGrid", "Sparkles", "BriefcaseBusiness"];

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";
const labelClass = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(window.localStorage.getItem(SESSION_KEY) === "true");
  }, []);

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  }

  return <Dashboard onLogout={() => setLoggedIn(false)} />;
}

function LoginScreen({ onLogin }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();

    if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
      window.localStorage.setItem(SESSION_KEY, "true");
      onLogin();
      return;
    }

    setError("Login yoki parol noto'g'ri.");
  }

  return (
    <main className="min-h-screen bg-hero px-4 py-16 text-foreground">
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
        <form onSubmit={submit} className="w-full rounded-2xl border bg-card p-8 shadow-elevated">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="OzodFlow" className="h-11 w-11 rounded-xl shadow-card" />
            <div>
              <h1 className="font-display text-2xl font-bold">OzodFlow Admin</h1>
              <p className="text-sm text-muted-foreground">Dashboardga kirish</p>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <label className="block space-y-2">
              <span className={labelClass}>Login</span>
              <input value={login} onChange={(event) => setLogin(event.target.value)} className={fieldClass} />
            </label>
            <label className="block space-y-2">
              <span className={labelClass}>Parol</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClass}
              />
            </label>
          </div>

          {error && <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:bg-accent"
          >
            Kirish
          </button>
        </form>
      </div>
    </main>
  );
}

function Dashboard({ onLogout }) {
  const [data, setData] = useState(DEFAULT_SITE_DATA);
  const [status, setStatus] = useState("Ma'lumotlar yuklanmoqda...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setData(getStoredSiteData());

    fetchSiteData({ signal: controller.signal })
      .then((loadedData) => {
        storeSiteData(loadedData);
        setData(loadedData);
        setStatus("Serverdan yuklandi.");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setStatus("Server topilmadi. O'zgarishlar brauzerga saqlanadi.");
        }
      });

    return () => controller.abort();
  }, []);

  async function persist() {
    setSaving(true);
    try {
      const saved = await saveSiteData(data);
      setData(saved);
      setStatus("Saqlandi.");
    } catch {
      setStatus("Server ishlamayapti. Nusxa brauzerga saqlandi.");
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    window.localStorage.removeItem(SESSION_KEY);
    onLogout();
  }

  return (
    <main className="min-h-screen bg-surface/50 text-foreground">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="OzodFlow" className="h-11 w-11 rounded-xl shadow-card" />
            <div>
              <h1 className="font-display text-2xl font-bold">OzodFlow Dashboard</h1>
              <p className="text-sm text-muted-foreground">{status}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={persist}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:bg-accent disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {saving ? "Saqlanmoqda..." : "Saqlash"}
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold transition hover:border-accent hover:text-accent"
            >
              <LogOut className="h-4 w-4" /> Chiqish
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:px-6">
        <ServicesEditor data={data} setData={setData} />
        <ProjectsEditor data={data} setData={setData} />
      </div>
    </main>
  );
}

function ServicesEditor({ data, setData }) {
  function updateService(id, patch) {
    setData((current) => ({
      ...current,
      services: current.services.map((service) => (service.id === id ? { ...service, ...patch } : service)),
    }));
  }

  function addService() {
    setData((current) => ({
      ...current,
      services: [
        ...current.services,
        {
          id: `service-${Date.now()}`,
          icon: "Sparkles",
          title: "Yangi xizmat",
          desc: "Xizmat tavsifi",
          price: "0",
          deadline: "1-2 hafta",
          items: ["Yangi imkoniyat"],
          featured: false,
        },
      ],
    }));
  }

  function deleteService(id) {
    setData((current) => ({
      ...current,
      services: current.services.filter((service) => service.id !== id),
    }));
  }

  return (
    <section className="rounded-2xl border bg-background p-5 shadow-card md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="h-3.5 w-3.5" /> Xizmatlar
          </div>
          <h2 className="mt-2 font-display text-3xl font-bold">Narxlar va tavsiflar</h2>
        </div>
        <button
          type="button"
          onClick={addService}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold transition hover:bg-primary hover:text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Xizmat qo'shish
        </button>
      </div>

      <div className="mt-6 grid gap-5">
        {data.services.map((service) => (
          <div key={service.id} className="rounded-xl border bg-card p-4">
            <div className="grid gap-4 md:grid-cols-4">
              <label className="block space-y-2">
                <span className={labelClass}>Nomi</span>
                <input
                  value={service.title}
                  onChange={(event) => updateService(service.id, { title: event.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Narx</span>
                <input
                  value={service.price}
                  onChange={(event) => updateService(service.id, { price: event.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Muddat</span>
                <input
                  value={service.deadline}
                  onChange={(event) => updateService(service.id, { deadline: event.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Icon</span>
                <select
                  value={service.icon}
                  onChange={(event) => updateService(service.id, { icon: event.target.value })}
                  className={fieldClass}
                >
                  {iconOptions.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className={labelClass}>Tavsif</span>
                <textarea
                  value={service.desc}
                  onChange={(event) => updateService(service.id, { desc: event.target.value })}
                  className={`${fieldClass} min-h-28`}
                />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Punktlar</span>
                <textarea
                  value={service.items.join("\n")}
                  onChange={(event) =>
                    updateService(service.id, {
                      items: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                    })
                  }
                  className={`${fieldClass} min-h-28`}
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={Boolean(service.featured)}
                  onChange={(event) => updateService(service.id, { featured: event.target.checked })}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                Mashhur belgisi
              </label>
              <button
                type="button"
                onClick={() => deleteService(service.id)}
                className="inline-flex items-center gap-2 rounded-lg border border-destructive/20 px-3 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4" /> O'chirish
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProjectsEditor({ data, setData }) {
  function updateProject(id, patch) {
    setData((current) => ({
      ...current,
      projects: current.projects.map((project) => (project.id === id ? { ...project, ...patch } : project)),
    }));
  }

  function addProject() {
    setData((current) => ({
      ...current,
      projects: [
        ...current.projects,
        {
          id: `project-${Date.now()}`,
          title: "Yangi loyiha",
          category: "Landing Page",
          desc: "Loyiha haqida qisqa tavsif",
          result: "Natija",
          stack: ["React"],
          url: "https://t.me/OzodFlow",
        },
      ],
    }));
  }

  function deleteProject(id) {
    setData((current) => ({
      ...current,
      projects: current.projects.filter((project) => project.id !== id),
    }));
  }

  return (
    <section className="rounded-2xl border bg-background p-5 shadow-card md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            <BriefcaseBusiness className="h-3.5 w-3.5" /> Loyihalar
          </div>
          <h2 className="mt-2 font-display text-3xl font-bold">Men qilgan ishlar</h2>
        </div>
        <button
          type="button"
          onClick={addProject}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold transition hover:bg-primary hover:text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Loyiha qo'shish
        </button>
      </div>

      <div className="mt-6 grid gap-5">
        {data.projects.map((project) => (
          <div key={project.id} className="rounded-xl border bg-card p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block space-y-2">
                <span className={labelClass}>Nomi</span>
                <input
                  value={project.title}
                  onChange={(event) => updateProject(project.id, { title: event.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Kategoriya</span>
                <input
                  value={project.category}
                  onChange={(event) => updateProject(project.id, { category: event.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Havola</span>
                <input
                  value={project.url}
                  onChange={(event) => updateProject(project.id, { url: event.target.value })}
                  className={fieldClass}
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="block space-y-2 md:col-span-2">
                <span className={labelClass}>Tavsif</span>
                <textarea
                  value={project.desc}
                  onChange={(event) => updateProject(project.id, { desc: event.target.value })}
                  className={`${fieldClass} min-h-28`}
                />
              </label>
              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className={labelClass}>Natija</span>
                  <input
                    value={project.result}
                    onChange={(event) => updateProject(project.id, { result: event.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block space-y-2">
                  <span className={labelClass}>Texnologiyalar</span>
                  <textarea
                    value={project.stack.join("\n")}
                    onChange={(event) =>
                      updateProject(project.id, {
                        stack: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean),
                      })
                    }
                    className={`${fieldClass} min-h-20`}
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => deleteProject(project.id)}
                className="inline-flex items-center gap-2 rounded-lg border border-destructive/20 px-3 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4" /> O'chirish
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
