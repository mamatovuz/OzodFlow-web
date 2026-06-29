import { createFileRoute } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ImagePlus,
  Loader2,
  LogOut,
  MessageSquareQuote,
  Moon,
  Newspaper,
  Plus,
  Save,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_SITE_DATA,
  fetchSiteData,
  getStoredSiteData,
  saveSiteData,
  storeSiteData,
  updateAdminCredentials,
  uploadImage,
  verifyAdminLogin,
} from "@/lib/site-data";
import { getInitialTheme, setStoredTheme } from "@/lib/theme";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "OzodFlow Admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

const SESSION_KEY = "ozodflow-admin-password";
const iconOptions = ["Globe", "Bot", "Database", "LayoutGrid", "Sparkles", "BriefcaseBusiness"];

const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";
const labelClass = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

/* --------------------------- image resize helper -------------------------- */

function resizeImage(file, maxSize = 1400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Faylni o'qib bo'lmadi"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Rasm noto'g'ri"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* -------------------------------- top level ------------------------------- */

function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  useEffect(() => {
    const storedPassword = window.sessionStorage.getItem(SESSION_KEY);
    if (storedPassword) {
      setAdminPassword(storedPassword);
      setLoggedIn(true);
    }
  }, []);

  if (!loggedIn) {
    return (
      <LoginScreen
        onLogin={(password) => {
          setAdminPassword(password);
          setLoggedIn(true);
        }}
      />
    );
  }

  return (
    <Dashboard
      adminPassword={adminPassword}
      onPasswordChange={(password) => {
        window.sessionStorage.setItem(SESSION_KEY, password);
        setAdminPassword(password);
      }}
      onLogout={() => {
        setAdminPassword("");
        setLoggedIn(false);
      }}
    />
  );
}

function LoginScreen({ onLogin }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!login.trim() || !password) {
      setError("Login va parolni kiriting.");
      return;
    }

    setLoading(true);
    try {
      await verifyAdminLogin({ login: login.trim(), password });
      window.sessionStorage.setItem(SESSION_KEY, password);
      window.localStorage.removeItem("ozodflow-admin-session");
      onLogin(password);
    } catch {
      setError("Login yoki parol noto'g'ri yoki server sozlanmagan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-hero px-4 py-16 text-foreground">
      <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
        <form onSubmit={submit} className="w-full rounded-2xl border bg-card p-8 shadow-elevated">
          <div className="flex items-center gap-3">
            <img src="/logo-mark.png" alt="OzodFlow" className="h-11 w-11 rounded-xl shadow-card" />
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
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:bg-accent"
          >
            {loading ? "Tekshirilmoqda..." : "Kirish"}
          </button>
        </form>
      </div>
    </main>
  );
}

const TABS = [
  { id: "services", label: "Xizmatlar", icon: Sparkles },
  { id: "projects", label: "Loyihalar", icon: BriefcaseBusiness },
  { id: "testimonials", label: "Fikrlar", icon: MessageSquareQuote },
  { id: "blog", label: "Blog", icon: Newspaper },
  { id: "settings", label: "Sozlamalar", icon: Settings },
];

function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setStoredTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-card text-muted-foreground transition hover:border-accent hover:text-accent ${className}`}
      aria-label="Tungi rejim"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function Dashboard({ adminPassword, onPasswordChange, onLogout }) {
  const [data, setData] = useState(DEFAULT_SITE_DATA);
  const [status, setStatus] = useState("Ma'lumotlar yuklanmoqda...");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("services");

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
      const saved = await saveSiteData(data, { password: adminPassword });
      setData(saved);
      setStatus("Global saqlandi. Hamma qurilmada ko'rinadi.");
    } catch {
      setStatus("Server saqlay olmadi. Sozlamalarni tekshiring.");
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem("ozodflow-admin-session");
    onLogout();
  }

  const counts = {
    services: data.services?.length || 0,
    projects: data.projects?.length || 0,
    testimonials: (data.testimonials || []).length,
    blog: (data.posts || []).length,
    settings: null,
  };

  return (
    <main className="min-h-screen bg-surface/40 text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-3">
            <img src="/logo-mark.png" alt="OzodFlow" className="h-10 w-10 rounded-xl shadow-card" />
            <div>
              <h1 className="font-display text-xl font-bold leading-tight">OzodFlow Dashboard</h1>
              <p className="text-xs text-muted-foreground">{status}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <ThemeToggle />
            {tab !== "settings" && (
              <button
                type="button"
                onClick={persist}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:bg-accent disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saqlanmoqda..." : "Saqlash"}
              </button>
            )}
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold transition hover:border-accent hover:text-accent"
            >
              Saytni ko'rish
            </a>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold transition hover:border-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" /> Chiqish
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl gap-8 px-4 py-8 md:grid md:grid-cols-[220px_1fr] md:px-6">
        {/* Tabs / sidebar */}
        <nav className="mb-6 flex gap-2 overflow-x-auto md:mb-0 md:flex-col md:overflow-visible">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition md:w-full ${
                  active
                    ? "bg-primary text-primary-foreground shadow-card"
                    : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {counts[item.id] != null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      active ? "bg-primary-foreground/20" : "bg-secondary"
                    }`}
                  >
                    {counts[item.id]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {tab === "services" && <ServicesEditor data={data} setData={setData} />}
          {tab === "projects" && (
            <ProjectsEditor data={data} setData={setData} adminPassword={adminPassword} />
          )}
          {tab === "testimonials" && <TestimonialsEditor data={data} setData={setData} />}
          {tab === "blog" && (
            <PostsEditor data={data} setData={setData} adminPassword={adminPassword} />
          )}
          {tab === "settings" && (
            <SettingsEditor adminPassword={adminPassword} onPasswordChange={onPasswordChange} />
          )}
        </div>
      </div>
    </main>
  );
}

function SectionShell({ icon: Icon, label, title, action, children }) {
  return (
    <section className="rounded-2xl border bg-background p-5 shadow-card md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            {Icon && <Icon className="h-3.5 w-3.5" />} {label}
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function AddButton({ onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-fit items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold transition hover:bg-primary hover:text-primary-foreground"
    >
      <Plus className="h-4 w-4" /> {children}
    </button>
  );
}

function DeleteButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-destructive/20 px-3 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
    >
      <Trash2 className="h-4 w-4" /> O'chirish
    </button>
  );
}

/* ----------------------------- reordering -------------------------------- */

function useReorder(items, apply) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  function move(from, to) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    apply(next);
  }

  function rowProps(index) {
    return {
      onDragOver: (event) => {
        event.preventDefault();
        if (overIndex !== index) setOverIndex(index);
      },
      onDrop: (event) => {
        event.preventDefault();
        if (dragIndex !== null) move(dragIndex, index);
        setDragIndex(null);
        setOverIndex(null);
      },
      "data-over": dragIndex !== null && overIndex === index && dragIndex !== index ? "true" : undefined,
    };
  }

  function handleProps(index) {
    return {
      draggable: true,
      onDragStart: (event) => {
        setDragIndex(index);
        event.dataTransfer.effectAllowed = "move";
      },
      onDragEnd: () => {
        setDragIndex(null);
        setOverIndex(null);
      },
    };
  }

  return { move, rowProps, handleProps };
}

function ReorderControls({ index, count, move, handleProps }) {
  const arrow =
    "inline-flex h-7 w-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted-foreground";

  return (
    <div className="flex items-center gap-1">
      <span
        {...handleProps}
        className="inline-flex h-7 w-7 cursor-grab items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:border-accent hover:text-accent active:cursor-grabbing"
        title="Tortib ko'chiring"
      >
        <GripVertical className="h-4 w-4" />
      </span>
      <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} className={arrow} aria-label="Yuqoriga">
        <ChevronUp className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => move(index, index + 1)} disabled={index === count - 1} className={arrow} aria-label="Pastga">
        <ChevronDown className="h-4 w-4" />
      </button>
      <span className="ml-1 text-xs font-medium text-muted-foreground">#{index + 1}</span>
    </div>
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

  const reorder = useReorder(data.services, (next) =>
    setData((current) => ({ ...current, services: next }))
  );

  return (
    <SectionShell
      icon={Sparkles}
      label="Xizmatlar"
      title="Narxlar va tavsiflar"
      action={<AddButton onClick={addService}>Xizmat qo'shish</AddButton>}
    >
      <div className="mt-6 grid gap-5">
        {data.services.map((service, index) => (
          <div
            key={service.id}
            {...reorder.rowProps(index)}
            className="rounded-xl border bg-card p-4 transition data-[over=true]:border-accent data-[over=true]:ring-2 data-[over=true]:ring-accent/30"
          >
            <div className="mb-3 flex items-center justify-between">
              <ReorderControls index={index} count={data.services.length} move={reorder.move} handleProps={reorder.handleProps(index)} />
            </div>
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
                <span className={labelClass}>Punktlar (har biri yangi qatordan)</span>
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
              <DeleteButton onClick={() => deleteService(service.id)} />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function ImageField({ value, onChange, adminPassword, alt }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setUploading(true);
    try {
      const dataUrl = await resizeImage(file);
      const url = await uploadImage(dataUrl, { password: adminPassword });
      onChange(url);
    } catch (uploadError) {
      setError(uploadError.message || "Yuklab bo'lmadi");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <span className={labelClass}>Rasm</span>
      <div className="flex flex-wrap items-start gap-4">
        <div className="relative h-28 w-44 shrink-0 overflow-hidden rounded-lg border bg-surface">
          {value ? (
            <>
              <img src={value} alt={alt} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md bg-background/90 text-destructive shadow-card transition hover:bg-destructive hover:text-destructive-foreground"
                aria-label="Rasmni o'chirish"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground/50">
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs">Rasm yo'q</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold transition hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Yuklanmoqda..." : "Fayldan yuklash"}
          </button>
          <p className="max-w-xs text-xs text-muted-foreground">
            JPG, PNG yoki WEBP. Rasm avtomatik kichraytiriladi. "Saqlash" tugmasini bosishni unutmang.
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function ProjectsEditor({ data, setData, adminPassword }) {
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
          image: "",
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

  const reorder = useReorder(data.projects, (next) =>
    setData((current) => ({ ...current, projects: next }))
  );

  return (
    <SectionShell
      icon={BriefcaseBusiness}
      label="Loyihalar"
      title="Men qilgan ishlar"
      action={<AddButton onClick={addProject}>Loyiha qo'shish</AddButton>}
    >
      <div className="mt-6 grid gap-5">
        {data.projects.map((project, index) => (
          <div
            key={project.id}
            {...reorder.rowProps(index)}
            className="rounded-xl border bg-card p-4 transition data-[over=true]:border-accent data-[over=true]:ring-2 data-[over=true]:ring-accent/30"
          >
            <div className="mb-3 flex items-center justify-between">
              <ReorderControls index={index} count={data.projects.length} move={reorder.move} handleProps={reorder.handleProps(index)} />
            </div>
            <ImageField
              value={project.image || ""}
              onChange={(url) => updateProject(project.id, { image: url })}
              adminPassword={adminPassword}
              alt={project.title}
            />

            <div className="mt-4 grid gap-4 md:grid-cols-3">
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
              <DeleteButton onClick={() => deleteProject(project.id)} />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function TestimonialsEditor({ data, setData }) {
  const testimonials = data.testimonials || [];

  function updateTestimonial(id, patch) {
    setData((current) => ({
      ...current,
      testimonials: (current.testimonials || []).map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  }

  function addTestimonial() {
    setData((current) => ({
      ...current,
      testimonials: [
        ...(current.testimonials || []),
        {
          id: `testimonial-${Date.now()}`,
          name: "Mijoz ismi",
          role: "Lavozim, shahar",
          text: "Mijoz fikri matni",
          rating: 5,
        },
      ],
    }));
  }

  function deleteTestimonial(id) {
    setData((current) => ({
      ...current,
      testimonials: (current.testimonials || []).filter((item) => item.id !== id),
    }));
  }

  const reorder = useReorder(testimonials, (next) =>
    setData((current) => ({ ...current, testimonials: next }))
  );

  return (
    <SectionShell
      icon={MessageSquareQuote}
      label="Mijozlar fikri"
      title="Sharhlar"
      action={<AddButton onClick={addTestimonial}>Sharh qo'shish</AddButton>}
    >
      <div className="mt-6 grid gap-5">
        {testimonials.map((item, index) => (
          <div
            key={item.id}
            {...reorder.rowProps(index)}
            className="rounded-xl border bg-card p-4 transition data-[over=true]:border-accent data-[over=true]:ring-2 data-[over=true]:ring-accent/30"
          >
            <div className="mb-3 flex items-center justify-between">
              <ReorderControls index={index} count={testimonials.length} move={reorder.move} handleProps={reorder.handleProps(index)} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="block space-y-2">
                <span className={labelClass}>Ism</span>
                <input
                  value={item.name}
                  onChange={(event) => updateTestimonial(item.id, { name: event.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Lavozim / shahar</span>
                <input
                  value={item.role}
                  onChange={(event) => updateTestimonial(item.id, { role: event.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Baho (1-5)</span>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={item.rating ?? 5}
                  onChange={(event) =>
                    updateTestimonial(item.id, {
                      rating: Math.max(1, Math.min(5, Number(event.target.value) || 5)),
                    })
                  }
                  className={fieldClass}
                />
              </label>
            </div>

            <label className="mt-4 block space-y-2">
              <span className={labelClass}>Fikr matni</span>
              <textarea
                value={item.text}
                onChange={(event) => updateTestimonial(item.id, { text: event.target.value })}
                className={`${fieldClass} min-h-24`}
              />
            </label>

            <div className="mt-4 flex justify-end">
              <DeleteButton onClick={() => deleteTestimonial(item.id)} />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9Ѐ-ӿ]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function PostsEditor({ data, setData, adminPassword }) {
  const posts = data.posts || [];

  function updatePost(id, patch) {
    setData((current) => ({
      ...current,
      posts: (current.posts || []).map((post) => (post.id === id ? { ...post, ...patch } : post)),
    }));
  }

  function addPost() {
    const stamp = Date.now();
    setData((current) => ({
      ...current,
      posts: [
        {
          id: `post-${stamp}`,
          slug: `maqola-${stamp}`,
          title: "Yangi maqola",
          excerpt: "Qisqa tavsif",
          cover: "",
          date: new Date().toISOString().slice(0, 10),
          published: true,
          tags: [],
          content: "Maqola matni. Sarlavha uchun qatorni '## ' bilan boshlang.",
        },
        ...(current.posts || []),
      ],
    }));
  }

  function deletePost(id) {
    setData((current) => ({
      ...current,
      posts: (current.posts || []).filter((post) => post.id !== id),
    }));
  }

  const reorder = useReorder(posts, (next) =>
    setData((current) => ({ ...current, posts: next }))
  );

  return (
    <SectionShell
      icon={Newspaper}
      label="Blog"
      title="Maqolalar"
      action={<AddButton onClick={addPost}>Maqola qo'shish</AddButton>}
    >
      <div className="mt-6 grid gap-5">
        {posts.map((post, index) => (
          <div
            key={post.id}
            {...reorder.rowProps(index)}
            className="rounded-xl border bg-card p-4 transition data-[over=true]:border-accent data-[over=true]:ring-2 data-[over=true]:ring-accent/30"
          >
            <div className="mb-3 flex items-center justify-between">
              <ReorderControls index={index} count={posts.length} move={reorder.move} handleProps={reorder.handleProps(index)} />
            </div>
            <ImageField
              value={post.cover || ""}
              onChange={(url) => updatePost(post.id, { cover: url })}
              adminPassword={adminPassword}
              alt={post.title}
            />

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className={labelClass}>Sarlavha</span>
                <input
                  value={post.title}
                  onChange={(event) => updatePost(post.id, { title: event.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Slug (havola)</span>
                <div className="flex gap-2">
                  <input
                    value={post.slug}
                    onChange={(event) => updatePost(post.id, { slug: slugify(event.target.value) })}
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    onClick={() => updatePost(post.id, { slug: slugify(post.title) })}
                    className="shrink-0 rounded-lg bg-secondary px-3 text-xs font-semibold transition hover:bg-primary hover:text-primary-foreground"
                  >
                    Avto
                  </button>
                </div>
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
              <label className="block space-y-2">
                <span className={labelClass}>Sana</span>
                <input
                  type="date"
                  value={post.date || ""}
                  onChange={(event) => updatePost(post.id, { date: event.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={post.published !== false}
                  onChange={(event) => updatePost(post.id, { published: event.target.checked })}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                Chop etilgan (saytda ko'rinadi)
              </label>
            </div>

            <label className="mt-4 block space-y-2">
              <span className={labelClass}>Qisqa tavsif</span>
              <textarea
                value={post.excerpt}
                onChange={(event) => updatePost(post.id, { excerpt: event.target.value })}
                className={`${fieldClass} min-h-20`}
              />
            </label>

            <label className="mt-4 block space-y-2">
              <span className={labelClass}>Teglar (vergul bilan ajrating)</span>
              <input
                value={(post.tags || []).join(", ")}
                onChange={(event) =>
                  updatePost(post.id, {
                    tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean),
                  })
                }
                placeholder="masalan: Telegram bot, Marketing"
                className={fieldClass}
              />
            </label>

            <label className="mt-4 block space-y-2">
              <span className={labelClass}>Matn (sarlavha uchun "## " bilan boshlang)</span>
              <textarea
                value={post.content}
                onChange={(event) => updatePost(post.id, { content: event.target.value })}
                className={`${fieldClass} min-h-48`}
              />
            </label>

            <div className="mt-4 flex justify-end">
              <DeleteButton onClick={() => deletePost(post.id)} />
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function SettingsEditor({ adminPassword, onPasswordChange }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type, text }

  async function submit(event) {
    event.preventDefault();
    setMessage(null);

    if (login.trim().length < 3) {
      setMessage({ type: "error", text: "Login kamida 3 ta belgidan iborat bo'lsin." });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: "error", text: "Parol kamida 6 ta belgidan iborat bo'lsin." });
      return;
    }
    if (password !== confirm) {
      setMessage({ type: "error", text: "Parollar mos kelmadi." });
      return;
    }

    setSaving(true);
    try {
      await updateAdminCredentials(
        { login: login.trim(), password },
        { password: adminPassword }
      );
      onPasswordChange(password);
      setPassword("");
      setConfirm("");
      setMessage({
        type: "success",
        text: "Login va parol yangilandi. Keyingi kirishda yangisidan foydalaning.",
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Saqlab bo'lmadi." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SectionShell icon={Settings} label="Sozlamalar" title="Admin login va parol">
      <div className="mt-6 max-w-xl">
        <div className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-muted-foreground">
          Yangi login va parolni kiriting. Saqlangach, tizim avtomatik yangi parolga o'tadi —
          qayta kirish shart emas.
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border bg-card p-5">
          <label className="block space-y-2">
            <span className={labelClass}>Yangi login</span>
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              autoComplete="username"
              className={fieldClass}
              placeholder="masalan: ozodbek"
            />
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>Yangi parol</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              className={fieldClass}
              placeholder="kamida 6 ta belgi"
            />
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>Parolni tasdiqlang</span>
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
              className={fieldClass}
              placeholder="parolni qayta kiriting"
            />
          </label>

          {message && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                message.type === "success"
                  ? "bg-accent/10 text-accent"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-card transition hover:bg-accent disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Saqlanmoqda..." : "Yangilash"}
          </button>
        </form>
      </div>
    </SectionShell>
  );
}
