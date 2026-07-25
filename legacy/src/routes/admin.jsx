import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  BriefcaseBusiness,
  Calculator as CalculatorIcon,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileText,
  FolderKanban,
  GripVertical,
  HelpCircle,
  ImagePlus,
  Inbox,
  ListTodo,
  Loader2,
  LogOut,
  MessageSquareQuote,
  Moon,
  Newspaper,
  Phone,
  Plus,
  Printer,
  Save,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  Sun,
  Trash2,
  Upload,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

const IncomeChart = lazy(() => import("@/components/IncomeChart"));

import {
  DEFAULT_SITE_DATA,
  DEFAULT_WORKSPACE,
  fetchLeads,
  fetchSiteData,
  fetchWorkspace,
  getStoredSiteData,
  saveLeads,
  saveSiteData,
  saveWorkspace,
  storeSiteData,
  updateAdminCredentials,
  uploadImage,
  verifyAdminLogin,
} from "@/lib/site-data";
import { getInitialTheme, setStoredTheme } from "@/lib/theme";
import { downloadDocImage } from "@/lib/doc-image";

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

const SITE_TABS = [
  { id: "services", label: "Xizmatlar", icon: Sparkles },
  { id: "projects", label: "Loyihalar", icon: BriefcaseBusiness },
  { id: "testimonials", label: "Fikrlar", icon: MessageSquareQuote },
  { id: "faq", label: "Savollar", icon: HelpCircle },
  { id: "blog", label: "Blog", icon: Newspaper },
  { id: "settings", label: "Sozlamalar", icon: Settings },
];

const WORK_TABS = [
  { id: "reports", label: "Hisobot", icon: BarChart3 },
  { id: "leads", label: "Arizalar", icon: Inbox },
  { id: "clients", label: "Mijozlar", icon: Users },
  { id: "works", label: "Ishlar", icon: FolderKanban },
  { id: "payments", label: "To'lovlar", icon: Wallet },
  { id: "calendar", label: "Kalendar", icon: CalendarDays },
  { id: "tasks", label: "Vazifalar", icon: ListTodo },
  { id: "notes", label: "Eslatmalar", icon: StickyNote },
  { id: "calculator", label: "Kalkulyator", icon: CalculatorIcon },
  { id: "docs", label: "Hujjatlar", icon: FileText },
];

// Tabs that save into the public site-data store.
const SITE_DATA_TABS = new Set(["services", "projects", "testimonials", "faq", "blog", "calculator"]);
// Tabs that save into the private workspace store.
const WORKSPACE_TABS = new Set(["clients", "works", "payments", "tasks", "notes"]);
// Tabs that have nothing to persist (tools / own save button).
const NO_SAVE_TABS = new Set(["settings", "docs", "reports", "calendar"]);

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
  const [workspace, setWorkspace] = useState(DEFAULT_WORKSPACE);
  const [leads, setLeads] = useState([]);
  const [status, setStatus] = useState("Ma'lumotlar yuklanmoqda...");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("reports");

  // Auto-save: wrapped setters mark a store "dirty"; debounced effects persist it.
  const dirty = useRef({ data: false, workspace: false, leads: false });
  const editData = (updater) => {
    dirty.current.data = true;
    setData(updater);
  };
  const editWorkspace = (updater) => {
    dirty.current.workspace = true;
    setWorkspace(updater);
  };
  const editLeads = (updater) => {
    dirty.current.leads = true;
    setLeads(updater);
  };

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

    fetchWorkspace({ signal: controller.signal, password: adminPassword })
      .then(setWorkspace)
      .catch(() => {});
    fetchLeads({ signal: controller.signal, password: adminPassword })
      .then(setLeads)
      .catch(() => {});

    return () => controller.abort();
  }, [adminPassword]);

  // Debounced auto-save per store.
  useEffect(() => {
    if (!dirty.current.data) return undefined;
    const timer = setTimeout(async () => {
      dirty.current.data = false;
      setStatus("Saqlanmoqda...");
      try {
        await saveSiteData(data, { password: adminPassword });
        setStatus("Avtomatik saqlandi ✓");
      } catch {
        setStatus("Saqlab bo'lmadi — qayta urinilmoqda");
        dirty.current.data = true;
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [data, adminPassword]);

  useEffect(() => {
    if (!dirty.current.workspace) return undefined;
    const timer = setTimeout(async () => {
      dirty.current.workspace = false;
      setStatus("Saqlanmoqda...");
      try {
        await saveWorkspace(workspace, { password: adminPassword });
        setStatus("Avtomatik saqlandi ✓");
      } catch {
        setStatus("Saqlab bo'lmadi — qayta urinilmoqda");
        dirty.current.workspace = true;
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [workspace, adminPassword]);

  useEffect(() => {
    if (!dirty.current.leads) return undefined;
    const timer = setTimeout(async () => {
      dirty.current.leads = false;
      setStatus("Saqlanmoqda...");
      try {
        await saveLeads(leads, { password: adminPassword });
        setStatus("Avtomatik saqlandi ✓");
      } catch {
        setStatus("Saqlab bo'lmadi — qayta urinilmoqda");
        dirty.current.leads = true;
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [leads, adminPassword]);

  async function persist() {
    setSaving(true);
    try {
      if (SITE_DATA_TABS.has(tab)) {
        const saved = await saveSiteData(data, { password: adminPassword });
        setData(saved);
        setStatus("Sayt ma'lumotlari saqlandi.");
      } else if (tab === "leads") {
        const saved = await saveLeads(leads, { password: adminPassword });
        setLeads(saved);
        setStatus("Arizalar saqlandi.");
      } else if (WORKSPACE_TABS.has(tab)) {
        const saved = await saveWorkspace(workspace, { password: adminPassword });
        setWorkspace(saved);
        setStatus("Ish ma'lumotlari saqlandi.");
      }
    } catch {
      setStatus("Server saqlay olmadi. Internet/sozlamalarni tekshiring.");
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    window.sessionStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem("ozodflow-admin-session");
    onLogout();
  }

  const newLeads = leads.filter((lead) => lead.status === "new").length;
  const counts = {
    services: data.services?.length || 0,
    projects: data.projects?.length || 0,
    testimonials: (data.testimonials || []).length,
    faq: (data.faqs || []).length,
    blog: (data.posts || []).length,
    settings: null,
    leads: newLeads || null,
    clients: workspace.clients.length || null,
    works: workspace.works.length || null,
    payments: workspace.payments.length || null,
    tasks: workspace.tasks.filter((task) => task.status !== "done").length || null,
    notes: workspace.notes.length || null,
    calculator: null,
    docs: null,
  };

  function renderTab(item) {
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
              active ? "bg-primary-foreground/20" : "bg-accent/15 text-accent"
            }`}
          >
            {counts[item.id]}
          </span>
        )}
      </button>
    );
  }

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
            {!NO_SAVE_TABS.has(tab) && (
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
          <div className="hidden px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 md:block">
            Sayt
          </div>
          {SITE_TABS.map(renderTab)}
          <div className="mt-2 hidden px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 md:block">
            Ish boshqaruvi
          </div>
          {WORK_TABS.map(renderTab)}
        </nav>

        <div className="min-w-0">
          {tab === "services" && <ServicesEditor data={data} setData={editData} />}
          {tab === "projects" && (
            <ProjectsEditor data={data} setData={editData} adminPassword={adminPassword} />
          )}
          {tab === "testimonials" && <TestimonialsEditor data={data} setData={editData} />}
          {tab === "faq" && <FaqEditor data={data} setData={editData} />}
          {tab === "blog" && (
            <PostsEditor data={data} setData={editData} adminPassword={adminPassword} />
          )}
          {tab === "settings" && (
            <SettingsEditor adminPassword={adminPassword} onPasswordChange={onPasswordChange} />
          )}

          {tab === "reports" && <Reports workspace={workspace} leads={leads} />}
          {tab === "leads" && (
            <LeadsManager
              leads={leads}
              setLeads={editLeads}
              workspace={workspace}
              setWorkspace={editWorkspace}
              adminPassword={adminPassword}
            />
          )}
          {tab === "clients" && <ClientsEditor workspace={workspace} setWorkspace={editWorkspace} />}
          {tab === "works" && <WorksEditor workspace={workspace} setWorkspace={editWorkspace} />}
          {tab === "payments" && <PaymentsEditor workspace={workspace} setWorkspace={editWorkspace} />}
          {tab === "calendar" && <CalendarView workspace={workspace} />}
          {tab === "tasks" && <TasksBoard workspace={workspace} setWorkspace={editWorkspace} />}
          {tab === "notes" && <NotesEditor workspace={workspace} setWorkspace={editWorkspace} />}
          {tab === "calculator" && <Calculator data={data} setData={editData} />}
          {tab === "docs" && <DocGenerator workspace={workspace} />}
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

function OrderMessageEditor({ data, setData }) {
  const settings = data.settings || {};

  function update(patch) {
    setData((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  }

  return (
    <details className="mt-6 rounded-xl border bg-card p-4">
      <summary className="cursor-pointer font-semibold">
        💬 Buyurtma xabari (Telegram'ga tayyor matn)
      </summary>
      <p className="mt-2 text-sm text-muted-foreground">
        Mijoz «Buyurtma» tugmasini bosganда Telegram shu matn bilan ochiladi.{" "}
        <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">{"{title}"}</code> — xizmat nomi avtomatik qo'yiladi.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className={labelClass}>Matn (UZ)</span>
          <textarea
            value={settings.orderMessageUz || ""}
            onChange={(e) => update({ orderMessageUz: e.target.value })}
            className={`${fieldClass} min-h-28`}
          />
        </label>
        <label className="block space-y-2">
          <span className={labelClass}>Matn (RU)</span>
          <textarea
            value={settings.orderMessageRu || ""}
            onChange={(e) => update({ orderMessageRu: e.target.value })}
            className={`${fieldClass} min-h-28`}
          />
        </label>
      </div>
    </details>
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
      <OrderMessageEditor data={data} setData={setData} />

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

function GalleryField({ images, onChange, adminPassword }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    setError("");
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const dataUrl = await resizeImage(file);
        urls.push(await uploadImage(dataUrl, { password: adminPassword }));
      }
      onChange([...(images || []), ...urls]);
    } catch (uploadError) {
      setError(uploadError.message || "Yuklab bo'lmadi");
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index) {
    onChange((images || []).filter((_, i) => i !== index));
  }

  const reorder = useReorder(images || [], onChange);

  return (
    <div className="mt-4 space-y-2">
      <span className={labelClass}>Qo'shimcha rasmlar (galereya) — sudrab tartiblang</span>
      <div className="flex flex-wrap gap-3">
        {(images || []).map((url, index) => (
          <div
            key={url + index}
            {...reorder.rowProps(index)}
            {...reorder.handleProps(index)}
            className="relative h-20 w-28 cursor-move overflow-hidden rounded-lg border bg-surface transition data-[over=true]:ring-2 data-[over=true]:ring-accent"
          >
            <img src={url} alt="" className="pointer-events-none h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(index)}
              className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-background/90 text-destructive shadow-card transition hover:bg-destructive hover:text-destructive-foreground"
              aria-label="O'chirish"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex h-20 w-28 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition hover:border-accent hover:text-accent disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          <span className="text-xs">Rasm qo'shish</span>
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
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
          gallery: [],
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

            <GalleryField
              images={project.gallery || []}
              onChange={(gallery) => updateProject(project.id, { gallery })}
              adminPassword={adminPassword}
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

function FaqEditor({ data, setData }) {
  const faqs = data.faqs || [];
  const reorder = useReorder(faqs, (next) => setData((current) => ({ ...current, faqs: next })));

  function update(id, patch) {
    setData((current) => ({
      ...current,
      faqs: (current.faqs || []).map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }
  function add() {
    setData((current) => ({
      ...current,
      faqs: [...(current.faqs || []), { id: `faq-${Date.now()}`, q: "Yangi savol?", a: "Javob", qRu: "", aRu: "" }],
    }));
  }
  function remove(id) {
    setData((current) => ({ ...current, faqs: (current.faqs || []).filter((item) => item.id !== id) }));
  }

  return (
    <SectionShell
      icon={HelpCircle}
      label="Savollar"
      title="Tez-tez beriladigan savollar"
      action={<AddButton onClick={add}>Savol qo'shish</AddButton>}
    >
      <p className="mt-2 text-sm text-muted-foreground">
        Ruscha maydonlar bo'sh bo'lsa, ruscha tilда ham o'zbekcha matn ko'rsatiladi.
      </p>
      <div className="mt-6 grid gap-5">
        {faqs.map((faq, index) => (
          <div
            key={faq.id}
            {...reorder.rowProps(index)}
            className="rounded-xl border bg-card p-4 transition data-[over=true]:border-accent data-[over=true]:ring-2 data-[over=true]:ring-accent/30"
          >
            <div className="mb-3 flex items-center justify-between">
              <ReorderControls index={index} count={faqs.length} move={reorder.move} handleProps={reorder.handleProps(index)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className={labelClass}>Savol (UZ)</span>
                <input value={faq.q} onChange={(e) => update(faq.id, { q: e.target.value })} className={fieldClass} />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Savol (RU)</span>
                <input value={faq.qRu} onChange={(e) => update(faq.id, { qRu: e.target.value })} className={fieldClass} />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Javob (UZ)</span>
                <textarea value={faq.a} onChange={(e) => update(faq.id, { a: e.target.value })} className={`${fieldClass} min-h-24`} />
              </label>
              <label className="block space-y-2">
                <span className={labelClass}>Javob (RU)</span>
                <textarea value={faq.aRu} onChange={(e) => update(faq.id, { aRu: e.target.value })} className={`${fieldClass} min-h-24`} />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <DeleteButton onClick={() => remove(faq.id)} />
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

/* ===================== PRIVATE WORKSPACE (frilanser ofisi) ================= */

function formatSom(value) {
  const num = Math.round(Number(value) || 0);
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function toNumber(value) {
  return Number(String(value ?? "").replace(/[^\d.-]/g, "")) || 0;
}

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function contactLink(contact) {
  const value = String(contact || "").trim();
  if (!value) return null;
  if (value.startsWith("@")) return `https://t.me/${value.slice(1)}`;
  if (value.startsWith("http")) return value;
  if (/^[+\d][\d\s()-]*$/.test(value)) return `tel:${value.replace(/[\s()-]/g, "")}`;
  return null;
}

function ExportButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-fit items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold transition hover:border-accent hover:text-accent"
    >
      <Download className="h-4 w-4" /> Excel (CSV)
    </button>
  );
}

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("uz-UZ", { day: "numeric", month: "short", year: "numeric" });
}

const PILL_TONES = {
  accent: "bg-accent/15 text-accent",
  blue: "bg-sky/15 text-sky",
  amber: "bg-amber-500/15 text-amber-600",
  green: "bg-emerald-500/15 text-emerald-600",
  gray: "bg-secondary text-muted-foreground",
  red: "bg-destructive/10 text-destructive",
};

function Pill({ tone = "gray", children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${PILL_TONES[tone] || PILL_TONES.gray} ${className}`}>
      {children}
    </span>
  );
}

const LEAD_STATUS = { new: ["🆕 Yangi", "blue"], seen: ["👀 Ko'rilgan", "amber"], done: ["✅ Yakunlangan", "green"] };
const CLIENT_STATUS_MAP = { new: ["Yangi", "blue"], talks: ["Muzokara", "amber"], active: ["Faol", "green"], done: ["Tugagan", "gray"] };
const WORK_STATUS_MAP = { plan: ["Rejada", "gray"], doing: ["Jarayonda", "blue"], test: ["Test", "amber"], done: ["Topshirildi", "green"] };

function Avatar({ name, tone = "accent" }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const tones = { accent: "bg-accent/15 text-accent", blue: "bg-sky/15 text-sky" };
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold ${tones[tone] || tones.accent}`}>
      {initial}
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <Icon className="h-7 w-7" />
      </div>
      <div className="mt-4 font-display text-lg font-bold">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</div>}
    </div>
  );
}

function StatChip({ label, value, tone = "" }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-display text-xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function FilterTabs({ tabs, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
            value === tab.id ? "border-accent bg-accent text-accent-foreground" : "bg-card hover:border-accent"
          }`}
        >
          {tab.label}
          {tab.count != null ? ` (${tab.count})` : ""}
        </button>
      ))}
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${fieldClass} pl-9`}
      />
    </div>
  );
}

/* ------------------------------- Arizalar -------------------------------- */

function LeadsManager({ leads, setLeads, workspace, setWorkspace, adminPassword }) {
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [picked, setPicked] = useState([]);

  const isPicked = (id) => picked.includes(id);
  function togglePick(id) {
    setPicked((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }
  function bulkStatus(status) {
    setLeads((current) => current.map((lead) => (picked.includes(lead.id) ? { ...lead, status } : lead)));
    setPicked([]);
  }
  function bulkDelete() {
    setLeads((current) => current.filter((lead) => !picked.includes(lead.id)));
    setPicked([]);
  }

  function updateLead(id, patch) {
    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
  }
  function deleteLead(id) {
    setLeads((current) => current.filter((lead) => lead.id !== id));
  }

  async function convert(lead) {
    const client = {
      id: `client-${Date.now()}`,
      name: lead.name,
      contact: lead.phone,
      source: lead.service || "Sayt",
      status: "new",
      note: lead.message || "",
      createdAt: new Date().toISOString(),
    };
    const nextWorkspace = { ...workspace, clients: [client, ...workspace.clients] };
    const nextLeads = leads.map((item) => (item.id === lead.id ? { ...item, status: "done" } : item));
    setWorkspace(nextWorkspace);
    setLeads(nextLeads);
    setMessage("");
    try {
      await saveWorkspace(nextWorkspace, { password: adminPassword });
      await saveLeads(nextLeads, { password: adminPassword });
      setMessage(`"${lead.name}" mijozlarga qo'shildi va saqlandi.`);
    } catch {
      setMessage("Saqlashda xatolik yuz berdi.");
    }
  }

  const sorted = [...leads].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const counts = {
    all: sorted.length,
    new: sorted.filter((l) => l.status === "new").length,
    seen: sorted.filter((l) => l.status === "seen").length,
    done: sorted.filter((l) => l.status === "done").length,
  };
  const visible = filter === "all" ? sorted : sorted.filter((l) => l.status === filter);

  function exportCsv() {
    downloadCsv("arizalar.csv", [
      ["Ism", "Telefon", "Xizmat", "Holat", "Sana", "Xabar"],
      ...sorted.map((l) => [l.name, l.phone, l.service, l.status, l.createdAt, l.message]),
    ]);
  }

  return (
    <SectionShell
      icon={Inbox}
      label="Arizalar"
      title="Saytdan kelgan murojaatlar"
      action={leads.length > 0 ? <ExportButton onClick={exportCsv} /> : null}
    >
      {message && <div className="mt-4 rounded-lg bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent">{message}</div>}

      {sorted.length === 0 ? (
        <EmptyState icon={Inbox} title="Hozircha ariza yo'q" hint="Saytdagi aloqa formasidan kelgan murojaatlar shu yerda paydo bo'ladi." />
      ) : (
        <>
          <div className="mt-5">
            <FilterTabs
              value={filter}
              onChange={setFilter}
              tabs={[
                { id: "all", label: "Hammasi", count: counts.all },
                { id: "new", label: "Yangi", count: counts.new },
                { id: "seen", label: "Ko'rilgan", count: counts.seen },
                { id: "done", label: "Yakunlangan", count: counts.done },
              ]}
            />
          </div>

          {picked.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5">
              <span className="text-sm font-semibold">{picked.length} ta tanlandi:</span>
              <button type="button" onClick={() => bulkStatus("seen")} className="rounded-lg border bg-card px-3 py-1.5 text-sm transition hover:border-accent hover:text-accent">👀 Ko'rilgan</button>
              <button type="button" onClick={() => bulkStatus("done")} className="rounded-lg border bg-card px-3 py-1.5 text-sm transition hover:border-accent hover:text-accent">✅ Yakunlangan</button>
              <button type="button" onClick={bulkDelete} className="rounded-lg border border-destructive/20 px-3 py-1.5 text-sm text-destructive transition hover:bg-destructive hover:text-destructive-foreground">🗑 O'chirish</button>
              <button type="button" onClick={() => setPicked([])} className="ml-auto text-sm text-muted-foreground hover:text-foreground">Bekor qilish</button>
            </div>
          )}

          <div className="mt-5 grid gap-3">
            {visible.map((lead) => {
              const [statusLabel, statusTone] = LEAD_STATUS[lead.status] || LEAD_STATUS.new;
              return (
                <div
                  key={lead.id}
                  className={`rounded-2xl border p-4 transition ${isPicked(lead.id) ? "border-accent ring-2 ring-accent/30" : lead.status === "new" ? "border-accent/40 bg-accent/[0.04]" : "bg-card"}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isPicked(lead.id)}
                      onChange={() => togglePick(lead.id)}
                      className="mt-3.5 h-4 w-4 accent-[var(--color-accent)]"
                    />
                    <Avatar name={lead.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-lg font-bold">{lead.name}</span>
                        <Pill tone={statusTone}>{statusLabel}</Pill>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1.5 font-medium text-accent">
                          <Phone className="h-3.5 w-3.5" /> {lead.phone}
                        </a>
                        {lead.service && <span className="text-muted-foreground">🧩 {lead.service}</span>}
                        {lead.createdAt && (
                          <span className="text-muted-foreground">{new Date(lead.createdAt).toLocaleString("uz-UZ")}</span>
                        )}
                      </div>
                      {lead.message && <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-sm text-muted-foreground">{lead.message}</p>}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                    <select
                      value={lead.status}
                      onChange={(event) => updateLead(lead.id, { status: event.target.value })}
                      className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                    >
                      <option value="new">🆕 Yangi</option>
                      <option value="seen">👀 Ko'rilgan</option>
                      <option value="done">✅ Yakunlangan</option>
                    </select>
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent"
                    >
                      <Phone className="h-4 w-4" /> Qo'ng'iroq
                    </a>
                    <button
                      type="button"
                      onClick={() => convert(lead)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold transition hover:bg-primary hover:text-primary-foreground"
                    >
                      <Users className="h-4 w-4" /> Mijozga aylantirish
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteLead(lead.id)}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-destructive/20 px-3 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </SectionShell>
  );
}

/* ------------------------------- Mijozlar -------------------------------- */

const CLIENT_STATUS = [
  ["new", "Yangi"],
  ["talks", "Muzokara"],
  ["active", "Faol"],
  ["done", "Tugagan"],
];

function ClientsEditor({ workspace, setWorkspace }) {
  const clients = workspace.clients;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  function update(id, patch) {
    setWorkspace((current) => ({
      ...current,
      clients: current.clients.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }
  function add() {
    setWorkspace((current) => ({
      ...current,
      clients: [
        { id: `client-${Date.now()}`, name: "Yangi mijoz", contact: "", source: "", status: "new", note: "", createdAt: new Date().toISOString() },
        ...current.clients,
      ],
    }));
  }
  function remove(id) {
    setWorkspace((current) => ({ ...current, clients: current.clients.filter((item) => item.id !== id) }));
  }

  function exportCsv() {
    downloadCsv("mijozlar.csv", [
      ["Ism", "Aloqa", "Manba", "Holat", "Izoh"],
      ...clients.map((c) => [c.name, c.contact, c.source, CLIENT_STATUS_MAP[c.status]?.[0] || c.status, c.note]),
    ]);
  }

  const query = search.trim().toLowerCase();
  const visible = clients.filter((c) => {
    const matchesQuery = !query || `${c.name} ${c.contact} ${c.source}`.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesQuery && matchesStatus;
  });
  const activeCount = clients.filter((c) => c.status === "active").length;

  return (
    <SectionShell
      icon={Users}
      label="Mijozlar"
      title="Mijozlar bazasi"
      action={
        <div className="flex flex-wrap gap-2">
          {clients.length > 0 && <ExportButton onClick={exportCsv} />}
          <AddButton onClick={add}>Mijoz qo'shish</AddButton>
        </div>
      }
    >
      {clients.length === 0 ? (
        <EmptyState icon={Users} title="Hozircha mijoz yo'q" hint="«Mijoz qo'shish» bilan qo'shing yoki Arizalar bo'limidan «Mijozga aylantirish» tugmasini bosing." />
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatChip label="Jami mijozlar" value={clients.length} />
            <StatChip label="Faol" value={activeCount} tone="text-emerald-600" />
            <StatChip label="Yangi" value={clients.filter((c) => c.status === "new").length} tone="text-sky" />
          </div>

          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="md:w-72">
              <SearchBox value={search} onChange={setSearch} placeholder="Ism yoki telefon bo'yicha qidirish..." />
            </div>
            <FilterTabs
              value={statusFilter}
              onChange={setStatusFilter}
              tabs={[
                { id: "all", label: "Hammasi" },
                { id: "new", label: "Yangi" },
                { id: "talks", label: "Muzokara" },
                { id: "active", label: "Faol" },
                { id: "done", label: "Tugagan" },
              ]}
            />
          </div>

          {visible.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Mos mijoz topilmadi.</p>
          ) : (
            <div className="mt-5 grid gap-4">
              {visible.map((client) => {
                const [statusLabel, statusTone] = CLIENT_STATUS_MAP[client.status] || CLIENT_STATUS_MAP.new;
                return (
                  <div key={client.id} className="rounded-2xl border bg-card p-4">
                    <div className="mb-4 flex items-center gap-3">
                      <Avatar name={client.name} tone="blue" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-lg font-bold">{client.name || "—"}</div>
                        {client.contact && <div className="truncate text-sm text-muted-foreground">{client.contact}</div>}
                      </div>
                      {contactLink(client.contact) && (
                        <a
                          href={contactLink(client.contact)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2 text-sm font-semibold transition hover:border-accent hover:text-accent"
                        >
                          <MessageSquareQuote className="h-4 w-4" /> Bog'lanish
                        </a>
                      )}
                      <Pill tone={statusTone}>{statusLabel}</Pill>
                    </div>
                    <div className="grid gap-4 md:grid-cols-4">
                      <label className="block space-y-2">
                        <span className={labelClass}>Ism</span>
                        <input value={client.name} onChange={(e) => update(client.id, { name: e.target.value })} className={fieldClass} />
                      </label>
                      <label className="block space-y-2">
                        <span className={labelClass}>Aloqa (tel/Telegram)</span>
                        <input value={client.contact} onChange={(e) => update(client.id, { contact: e.target.value })} className={fieldClass} />
                      </label>
                      <label className="block space-y-2">
                        <span className={labelClass}>Manba</span>
                        <input value={client.source} onChange={(e) => update(client.id, { source: e.target.value })} placeholder="Sayt / Tavsiya" className={fieldClass} />
                      </label>
                      <label className="block space-y-2">
                        <span className={labelClass}>Holat</span>
                        <select value={client.status} onChange={(e) => update(client.id, { status: e.target.value })} className={fieldClass}>
                          {CLIENT_STATUS.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="mt-4 block space-y-2">
                      <span className={labelClass}>Izoh</span>
                      <textarea value={client.note} onChange={(e) => update(client.id, { note: e.target.value })} className={`${fieldClass} min-h-16`} />
                    </label>
                    <div className="mt-4 flex justify-end">
                      <DeleteButton onClick={() => remove(client.id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </SectionShell>
  );
}

/* --------------------------------- Ishlar -------------------------------- */

const WORK_STATUS = [
  ["plan", "Rejada"],
  ["doing", "Jarayonda"],
  ["test", "Test"],
  ["done", "Topshirildi"],
];

function WorksEditor({ workspace, setWorkspace }) {
  const works = workspace.works;
  const clientNames = workspace.clients.map((client) => client.name);
  const [statusFilter, setStatusFilter] = useState("all");

  function update(id, patch) {
    setWorkspace((current) => ({
      ...current,
      works: current.works.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }
  function add() {
    setWorkspace((current) => ({
      ...current,
      works: [
        { id: `work-${Date.now()}`, title: "Yangi ish", client: "", type: "", price: 0, prepaid: 0, deadline: "", status: "plan", progress: 0, note: "" },
        ...current.works,
      ],
    }));
  }
  function remove(id) {
    setWorkspace((current) => ({ ...current, works: current.works.filter((item) => item.id !== id) }));
  }

  const reorder = useReorder(works, (next) => setWorkspace((c) => ({ ...c, works: next })));
  const activeCount = works.filter((w) => w.status !== "done").length;
  const totalValue = works.reduce((sum, w) => sum + toNumber(w.price), 0);
  const received = works.reduce((sum, w) => sum + toNumber(w.prepaid), 0);
  const canReorder = statusFilter === "all";
  const visible = statusFilter === "all" ? works : works.filter((w) => w.status === statusFilter);

  return (
    <SectionShell icon={FolderKanban} label="Ishlar" title="Joriy loyihalar (ichki)" action={<AddButton onClick={add}>Ish qo'shish</AddButton>}>
      {works.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Hozircha ish yo'q" hint="«Ish qo'shish» bilan loyiha yarating va deadline, narx, bajarilishini kuzating." />
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <StatChip label="Faol ishlar" value={activeCount} tone="text-sky" />
            <StatChip label="Jami qiymat" value={`${formatSom(totalValue)} so'm`} />
            <StatChip label="Olingan to'lov" value={`${formatSom(received)} so'm`} tone="text-emerald-600" />
          </div>

          <div className="mt-5">
            <FilterTabs
              value={statusFilter}
              onChange={setStatusFilter}
              tabs={[{ id: "all", label: "Hammasi" }, ...WORK_STATUS.map(([id, label]) => ({ id, label }))]}
            />
          </div>

          <div className="mt-5 grid gap-4">
            {visible.map((work, index) => {
              const left = daysLeft(work.deadline);
              const remaining = toNumber(work.price) - toNumber(work.prepaid);
              const [statusLabel, statusTone] = WORK_STATUS_MAP[work.status] || WORK_STATUS_MAP.plan;
              const progress = Math.max(0, Math.min(100, Number(work.progress) || 0));
              return (
                <div
                  key={work.id}
                  {...(canReorder ? reorder.rowProps(index) : {})}
                  className="rounded-2xl border bg-card p-4 transition data-[over=true]:border-accent data-[over=true]:ring-2 data-[over=true]:ring-accent/30"
                >
                  {canReorder && (
                    <div className="mb-3">
                      <ReorderControls index={index} count={works.length} move={reorder.move} handleProps={reorder.handleProps(index)} />
                    </div>
                  )}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-lg font-bold">{work.title || "—"}</span>
                        <Pill tone={statusTone}>{statusLabel}</Pill>
                      </div>
                      <div className="mt-0.5 text-sm text-muted-foreground">
                        {work.client || "Mijoz belgilanmagan"}{work.type ? ` · ${work.type}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg font-bold">{formatSom(work.price)} <span className="text-xs font-normal text-muted-foreground">so'm</span></div>
                      <div className="text-xs text-muted-foreground">Qoldiq: {formatSom(remaining)}</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Bajarilish</span>
                      <span className="font-semibold text-foreground">{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {left != null && work.status !== "done" && (
                    <div className="mt-3">
                      <Pill tone={left < 0 ? "red" : left <= 3 ? "amber" : "gray"}>
                        <CalendarClock className="h-3.5 w-3.5" />
                        {left < 0 ? `Muddati ${-left} kun o'tdi` : left === 0 ? "Bugun deadline" : `${left} kun qoldi`}
                      </Pill>
                    </div>
                  )}

                  <details className="mt-3 border-t pt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-accent">Tahrirlash</summary>
                    <div className="mt-3 grid gap-4 md:grid-cols-3">
                      <label className="block space-y-2">
                        <span className={labelClass}>Ish nomi</span>
                        <input value={work.title} onChange={(e) => update(work.id, { title: e.target.value })} className={fieldClass} />
                      </label>
                      <label className="block space-y-2">
                        <span className={labelClass}>Mijoz</span>
                        <input list="work-client-names" value={work.client} onChange={(e) => update(work.id, { client: e.target.value })} className={fieldClass} />
                        <datalist id="work-client-names">
                          {clientNames.map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                      </label>
                      <label className="block space-y-2">
                        <span className={labelClass}>Tur</span>
                        <input value={work.type} onChange={(e) => update(work.id, { type: e.target.value })} placeholder="Landing / Bot / CRM" className={fieldClass} />
                      </label>
                      <label className="block space-y-2">
                        <span className={labelClass}>Narx (so'm)</span>
                        <input type="number" value={work.price} onChange={(e) => update(work.id, { price: Number(e.target.value) })} className={fieldClass} />
                      </label>
                      <label className="block space-y-2">
                        <span className={labelClass}>Oldindan to'lov</span>
                        <input type="number" value={work.prepaid} onChange={(e) => update(work.id, { prepaid: Number(e.target.value) })} className={fieldClass} />
                      </label>
                      <label className="block space-y-2">
                        <span className={labelClass}>Deadline</span>
                        <input type="date" value={work.deadline} onChange={(e) => update(work.id, { deadline: e.target.value })} className={fieldClass} />
                      </label>
                      <label className="block space-y-2">
                        <span className={labelClass}>Holat</span>
                        <select value={work.status} onChange={(e) => update(work.id, { status: e.target.value })} className={fieldClass}>
                          {WORK_STATUS.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-2 md:col-span-2">
                        <span className={labelClass}>Bajarilish: {progress}%</span>
                        <input type="range" min="0" max="100" step="5" value={progress} onChange={(e) => update(work.id, { progress: Number(e.target.value) })} className="w-full accent-[var(--color-accent)]" />
                      </label>
                      <label className="block space-y-2 md:col-span-3">
                        <span className={labelClass}>Izoh</span>
                        <textarea value={work.note} onChange={(e) => update(work.id, { note: e.target.value })} className={`${fieldClass} min-h-16`} />
                      </label>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <DeleteButton onClick={() => remove(work.id)} />
                    </div>
                  </details>
                </div>
              );
            })}
          </div>
        </>
      )}
    </SectionShell>
  );
}

/* -------------------------------- To'lovlar ------------------------------ */

function PaymentsEditor({ workspace, setWorkspace }) {
  const payments = workspace.payments;
  const [statusFilter, setStatusFilter] = useState("all");
  const clientNames = workspace.clients.map((c) => c.name);
  const workTitles = workspace.works.map((w) => w.title);
  const totalPaid = useMemo(
    () => payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + toNumber(p.amount), 0),
    [payments]
  );
  const totalPending = useMemo(
    () => payments.filter((p) => p.status !== "paid").reduce((sum, p) => sum + toNumber(p.amount), 0),
    [payments]
  );
  const monthly = useMemo(() => {
    const map = {};
    payments
      .filter((p) => p.status === "paid")
      .forEach((p) => {
        const month = (p.date || "").slice(0, 7);
        if (!month) return;
        map[month] = (map[month] || 0) + toNumber(p.amount);
      });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, total]) => ({ month, total }));
  }, [payments]);

  const reorder = useReorder(payments, (next) => setWorkspace((c) => ({ ...c, payments: next })));
  const canReorder = statusFilter === "all";

  function update(id, patch) {
    setWorkspace((current) => ({
      ...current,
      payments: current.payments.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }
  function add() {
    setWorkspace((current) => ({
      ...current,
      payments: [
        { id: `pay-${Date.now()}`, client: "", work: "", amount: 0, date: new Date().toISOString().slice(0, 10), status: "pending", note: "" },
        ...current.payments,
      ],
    }));
  }
  function remove(id) {
    setWorkspace((current) => ({ ...current, payments: current.payments.filter((item) => item.id !== id) }));
  }

  function exportCsv() {
    downloadCsv("tolovlar.csv", [
      ["Mijoz", "Ish", "Summa", "Sana", "Holat"],
      ...payments.map((p) => [p.client, p.work, p.amount, p.date, p.status === "paid" ? "To'langan" : "Kutilmoqda"]),
    ]);
  }

  return (
    <SectionShell
      icon={Wallet}
      label="To'lovlar"
      title="Daromad va to'lovlar"
      action={
        <div className="flex flex-wrap gap-2">
          {payments.length > 0 && <ExportButton onClick={exportCsv} />}
          <AddButton onClick={add}>To'lov qo'shish</AddButton>
        </div>
      }
    >
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-accent/5 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">To'langan</div>
          <div className="mt-1 font-display text-2xl font-bold">{formatSom(totalPaid)} so'm</div>
        </div>
        <div className="rounded-xl border bg-amber-500/5 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-600">Kutilmoqda</div>
          <div className="mt-1 font-display text-2xl font-bold">{formatSom(totalPending)} so'm</div>
        </div>
      </div>

      {monthly.length > 0 && (
        <div className="mt-4 rounded-xl border bg-card p-4">
          <div className={labelClass}>Oylik daromad (so'm)</div>
          <div className="mt-3">
            <Suspense fallback={<div className="h-56 animate-pulse rounded-lg bg-muted" />}>
              <IncomeChart data={monthly} />
            </Suspense>
          </div>
        </div>
      )}

      {payments.length === 0 ? (
        <EmptyState icon={Wallet} title="Hozircha to'lov yozuvi yo'q" hint="Har bir to'lovni qo'shib boring — jami daromad va qarzdorlar avtomatik hisoblanadi." />
      ) : (
        <>
          <div className="mt-5">
            <FilterTabs
              value={statusFilter}
              onChange={setStatusFilter}
              tabs={[
                { id: "all", label: "Hammasi", count: payments.length },
                { id: "paid", label: "To'langan", count: payments.filter((p) => p.status === "paid").length },
                { id: "pending", label: "Kutilmoqda", count: payments.filter((p) => p.status !== "paid").length },
              ]}
            />
          </div>

          <datalist id="pay-clients">
            {clientNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <datalist id="pay-works">
            {workTitles.map((title) => (
              <option key={title} value={title} />
            ))}
          </datalist>

          <div className="mt-5 grid gap-4">
            {payments
              .filter((p) => statusFilter === "all" || (statusFilter === "paid" ? p.status === "paid" : p.status !== "paid"))
              .map((payment, index) => (
                <div
                  key={payment.id}
                  {...(canReorder ? reorder.rowProps(index) : {})}
                  className="rounded-2xl border bg-card p-4 transition data-[over=true]:border-accent data-[over=true]:ring-2 data-[over=true]:ring-accent/30"
                >
                  {canReorder && (
                    <div className="mb-3">
                      <ReorderControls index={index} count={payments.length} move={reorder.move} handleProps={reorder.handleProps(index)} />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-display text-lg font-bold">{formatSom(payment.amount)} <span className="text-xs font-normal text-muted-foreground">so'm</span></div>
                      <div className="text-sm text-muted-foreground">
                        {payment.client || "—"}{payment.work ? ` · ${payment.work}` : ""}{payment.date ? ` · ${formatDate(payment.date)}` : ""}
                      </div>
                    </div>
                    <Pill tone={payment.status === "paid" ? "green" : "amber"}>
                      {payment.status === "paid" ? "✅ To'langan" : "⏳ Kutilmoqda"}
                    </Pill>
                  </div>

                  <details className="mt-3 border-t pt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-accent">Tahrirlash</summary>
                    <div className="mt-3 grid gap-4 md:grid-cols-5">
                      <label className="block space-y-2">
                        <span className={labelClass}>Mijoz</span>
                        <input list="pay-clients" value={payment.client} onChange={(e) => update(payment.id, { client: e.target.value })} className={fieldClass} />
                      </label>
                      <label className="block space-y-2">
                        <span className={labelClass}>Ish</span>
                        <input list="pay-works" value={payment.work} onChange={(e) => update(payment.id, { work: e.target.value })} className={fieldClass} />
                      </label>
                      <label className="block space-y-2">
                        <span className={labelClass}>Summa</span>
                        <input type="number" value={payment.amount} onChange={(e) => update(payment.id, { amount: Number(e.target.value) })} className={fieldClass} />
                      </label>
                      <label className="block space-y-2">
                        <span className={labelClass}>Sana</span>
                        <input type="date" value={payment.date} onChange={(e) => update(payment.id, { date: e.target.value })} className={fieldClass} />
                      </label>
                      <label className="block space-y-2">
                        <span className={labelClass}>Holat</span>
                        <select value={payment.status} onChange={(e) => update(payment.id, { status: e.target.value })} className={fieldClass}>
                          <option value="pending">⏳ Kutilmoqda</option>
                          <option value="paid">✅ To'langan</option>
                        </select>
                      </label>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <DeleteButton onClick={() => remove(payment.id)} />
                    </div>
                  </details>
                </div>
              ))}
          </div>
        </>
      )}
    </SectionShell>
  );
}

/* ------------------------------- Vazifalar ------------------------------- */

const TASK_COLS = [
  ["todo", "Qilinadi"],
  ["doing", "Jarayonda"],
  ["done", "Tayyor"],
];

function TasksBoard({ workspace, setWorkspace }) {
  const [title, setTitle] = useState("");
  const tasks = workspace.tasks;

  function add() {
    if (!title.trim()) return;
    setWorkspace((current) => ({
      ...current,
      tasks: [{ id: `task-${Date.now()}`, title: title.trim(), status: "todo", createdAt: new Date().toISOString() }, ...current.tasks],
    }));
    setTitle("");
  }
  function setStatus(id, status) {
    setWorkspace((current) => ({
      ...current,
      tasks: current.tasks.map((task) => (task.id === id ? { ...task, status } : task)),
    }));
  }
  function remove(id) {
    setWorkspace((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
  }

  return (
    <SectionShell icon={ListTodo} label="Vazifalar" title="Kunlik ishlar">
      <div className="mt-6 flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Yangi vazifa..."
          className={fieldClass}
        />
        <button type="button" onClick={add} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-accent">
          <Plus className="h-4 w-4" /> Qo'shish
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {TASK_COLS.map(([colId, colLabel], colIndex) => {
          const colTone = { todo: "gray", doing: "blue", done: "green" }[colId];
          const dotColor = { todo: "bg-muted-foreground/40", doing: "bg-sky", done: "bg-emerald-500" }[colId];
          const colTasks = tasks.filter((task) => task.status === colId);
          return (
            <div key={colId} className="rounded-2xl border bg-surface/40 p-3">
              <div className="flex items-center justify-between px-1 pb-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <span className={`h-2 w-2 rounded-full ${dotColor}`} /> {colLabel}
                </span>
                <Pill tone={colTone}>{colTasks.length}</Pill>
              </div>
              <div className="grid gap-2">
                {colTasks.length === 0 && (
                  <div className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">Bo'sh</div>
                )}
                {colTasks.map((task) => (
                  <div key={task.id} className="group rounded-xl border bg-card p-3 text-sm shadow-card">
                    <div className={colId === "done" ? "text-muted-foreground line-through" : ""}>{task.title}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex gap-1">
                        {colIndex > 0 && (
                          <button type="button" onClick={() => setStatus(task.id, TASK_COLS[colIndex - 1][0])} className="inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs transition hover:border-accent hover:text-accent">◀</button>
                        )}
                        {colIndex < TASK_COLS.length - 1 && (
                          <button type="button" onClick={() => setStatus(task.id, TASK_COLS[colIndex + 1][0])} className="inline-flex h-6 w-6 items-center justify-center rounded-md border text-xs transition hover:border-accent hover:text-accent">▶</button>
                        )}
                      </div>
                      <button type="button" onClick={() => remove(task.id)} className="text-destructive/60 transition hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

/* ------------------------------- Eslatmalar ------------------------------ */

function NotesEditor({ workspace, setWorkspace }) {
  const [text, setText] = useState("");
  const notes = workspace.notes;

  function add() {
    if (!text.trim()) return;
    setWorkspace((current) => ({
      ...current,
      notes: [{ id: `note-${Date.now()}`, text: text.trim(), updatedAt: new Date().toISOString() }, ...current.notes],
    }));
    setText("");
  }
  function update(id, value) {
    setWorkspace((current) => ({
      ...current,
      notes: current.notes.map((note) => (note.id === id ? { ...note, text: value, updatedAt: new Date().toISOString() } : note)),
    }));
  }
  function remove(id) {
    setWorkspace((current) => ({ ...current, notes: current.notes.filter((note) => note.id !== id) }));
  }

  return (
    <SectionShell icon={StickyNote} label="Eslatmalar" title="Tez eslatmalar">
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Yangi eslatma..." className={`${fieldClass} min-h-12`} />
        <button type="button" onClick={add} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-accent">
          <Plus className="h-4 w-4" /> Qo'shish
        </button>
      </div>

      {notes.length === 0 ? (
        <EmptyState icon={StickyNote} title="Hozircha eslatma yo'q" hint="G'oya, eslatma yoki kerakli matnni tez yozib qo'ying." />
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <div key={note.id} className="flex flex-col rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4 shadow-card">
              <textarea
                value={note.text}
                onChange={(e) => update(note.id, e.target.value)}
                className="min-h-24 flex-1 resize-none border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              />
              <div className="mt-2 flex items-center justify-between border-t border-amber-500/15 pt-2 text-xs text-muted-foreground">
                <span>{note.updatedAt ? formatDate(note.updatedAt) : ""}</span>
                <button type="button" onClick={() => remove(note.id)} className="text-destructive/60 transition hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

/* ------------------------------ Kalkulyator ------------------------------ */

function Calculator({ data, setData }) {
  const services = data.services || [];
  const addons = data.settings?.calcAddons || [];
  const [baseId, setBaseId] = useState(services[0]?.id || "");
  const [selected, setSelected] = useState({});
  const [rush, setRush] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const base = services.find((service) => service.id === baseId) || services[0];
  const basePrice = base ? toNumber(base.price) : 0;
  const addonsSum = addons.reduce((sum, addon) => (selected[addon.key] ? sum + toNumber(addon.price) : sum), 0);
  let subtotal = basePrice + addonsSum;
  if (rush) subtotal = Math.round(subtotal * 1.3);
  const total = Math.round(subtotal * (1 - (Number(discount) || 0) / 100));

  function buildLines() {
    const lines = [`Asosiy xizmat: ${base?.title || "—"} — ${formatSom(basePrice)} so'm`];
    addons.forEach((addon) => {
      if (selected[addon.key]) lines.push(`+ ${addon.label}: ${formatSom(addon.price)} so'm`);
    });
    if (rush) lines.push("+ Tezkor bajarish: +30%");
    if (Number(discount) > 0) lines.push(`Chegirma: -${discount}%`);
    return lines;
  }

  function quoteText() {
    return ["OzodFlow — taxminiy hisob", "", ...buildLines(), "", `Jami: ${formatSom(total)} so'm`].join("\n");
  }

  function copy() {
    navigator.clipboard?.writeText(quoteText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  async function downloadImage() {
    setDownloading(true);
    try {
      await downloadDocImage({
        fileName: "ozodflow-hisob.png",
        heading: "Taxminiy hisob",
        lines: buildLines(),
        highlight: { label: "Jami narx", value: `${formatSom(total)} so'm` },
      });
    } finally {
      setDownloading(false);
    }
  }

  function updateAddon(key, patch) {
    setData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        calcAddons: (current.settings?.calcAddons || []).map((a) => (a.key === key ? { ...a, ...patch } : a)),
      },
    }));
  }

  return (
    <SectionShell icon={CalculatorIcon} label="Kalkulyator" title="Narx kalkulyatori">
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className={labelClass}>Asosiy xizmat</span>
            <select value={baseId} onChange={(e) => setBaseId(e.target.value)} className={fieldClass}>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.title} — {service.price} so'm
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <span className={labelClass}>Qo'shimchalar</span>
            {addons.map((addon) => (
              <label key={addon.key} className="flex items-center justify-between rounded-xl border bg-card px-3 py-2.5 text-sm transition hover:border-accent/40">
                <span className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={Boolean(selected[addon.key])}
                    onChange={(e) => setSelected((current) => ({ ...current, [addon.key]: e.target.checked }))}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  {addon.label}
                </span>
                <span className="font-semibold text-muted-foreground">+{formatSom(addon.price)}</span>
              </label>
            ))}
            <label className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-sm transition hover:border-accent/40">
              <input type="checkbox" checked={rush} onChange={(e) => setRush(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
              Tezkor bajarish (+30%)
            </label>
          </div>

          <label className="block space-y-2">
            <span className={labelClass}>Chegirma (%)</span>
            <input type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className={fieldClass} />
          </label>

          <details className="rounded-xl border bg-card p-4">
            <summary className="cursor-pointer text-sm font-semibold">⚙️ Qo'shimcha narxlarni tahrirlash</summary>
            <p className="mt-2 text-xs text-muted-foreground">O'zgartirib, yuqoridagi "Saqlash" tugmasini bosing.</p>
            <div className="mt-3 grid gap-2">
              {addons.map((addon) => (
                <div key={addon.key} className="flex items-center gap-2">
                  <input value={addon.label} onChange={(e) => updateAddon(addon.key, { label: e.target.value })} className={`${fieldClass} flex-1`} />
                  <input type="number" value={addon.price} onChange={(e) => updateAddon(addon.key, { price: Number(e.target.value) })} className={`${fieldClass} w-36`} />
                </div>
              ))}
            </div>
          </details>
        </div>

        <div className="flex flex-col rounded-2xl border bg-gradient-to-br from-primary/[0.03] to-accent/[0.05] p-6">
          <div className="flex items-center gap-2.5">
            <img src="/logo-mark.png" alt="" className="h-9 w-9 rounded-lg" />
            <div>
              <div className="font-display font-bold leading-tight">OzodFlow</div>
              <div className="text-xs text-muted-foreground">Taxminiy hisob</div>
            </div>
          </div>

          <div className="mt-4 flex-1 space-y-1.5 border-y py-4 text-sm">
            {buildLines().map((line, i) => (
              <div key={i} className="flex justify-between gap-4 text-muted-foreground">
                <span>{line}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-primary px-5 py-4 text-primary-foreground">
            <div className="text-xs uppercase tracking-wider opacity-70">Jami narx</div>
            <div className="font-display text-3xl font-bold">{formatSom(total)} <span className="text-base font-normal opacity-70">so'm</span></div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-semibold transition hover:border-accent hover:text-accent">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Nusxalandi" : "Nusxalash"}
            </button>
            <button type="button" onClick={downloadImage} disabled={downloading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-accent disabled:opacity-60">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Rasm (PNG)
            </button>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

/* ------------------------------- Hujjatlar ------------------------------- */

function DocGenerator({ workspace }) {
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState("invoice");
  const [client, setClient] = useState("");
  const [service, setService] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(today);
  const [deadline, setDeadline] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isInvoice = type === "invoice";
  const heading = isInvoice ? "Hisob-faktura" : "Shartnoma";
  const docNo = date.replace(/-/g, "");

  const rows = [
    ["Hujjat", `${heading} № ${docNo}`],
    ["Sana", formatDate(date)],
    [isInvoice ? "Mijoz" : "Buyurtmachi", client || "—"],
    [isInvoice ? "Xizmat" : "Ish", service || "—"],
    ...(!isInvoice && deadline ? [["Topshirish muddati", formatDate(deadline)]] : []),
  ];

  const conditions = isInvoice
    ? ["To'lov: 50% oldindan, 50% topshirilganda."]
    : [
        "1. To'lov: 50% oldindan, 50% topshirilganda.",
        "2. 30 kun bepul texnik yordam va kafolat.",
        "3. Texnik topshiriq kelishilgach ish boshlanadi.",
      ];

  function docText() {
    return [
      heading.toUpperCase() + ` № ${docNo}`,
      "OzodFlow — raqamli yechimlar",
      "",
      ...rows.slice(1).map(([k, v]) => `${k}: ${v}`),
      `Summa: ${formatSom(amount)} so'm`,
      "",
      ...conditions,
      "",
      "Aloqa: +998 93 230 34 10 | @OzodFlow_uz",
    ].join("\n");
  }

  function copy() {
    navigator.clipboard?.writeText(docText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  async function downloadImage() {
    setDownloading(true);
    try {
      await downloadDocImage({
        fileName: `${isInvoice ? "hisob-faktura" : "shartnoma"}-${docNo}.png`,
        heading: `${heading} № ${docNo}`,
        lines: [...rows.slice(1).map(([k, v]) => `${k}: ${v}`), "", ...conditions],
        highlight: { label: "Summa", value: `${formatSom(amount)} so'm` },
      });
    } finally {
      setDownloading(false);
    }
  }

  function printDoc() {
    const win = window.open("", "_blank", "width=820,height=1000");
    if (!win) return;
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const rowsHtml = rows
      .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`)
      .join("");
    const condHtml = conditions.map((c) => `<li>${esc(c)}</li>`).join("");
    win.document.write(
      `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>${esc(heading)} — OzodFlow</title>` +
        `<style>` +
        `*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#0b1530;margin:0;background:#f1f5f9}` +
        `.page{max-width:720px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.08)}` +
        `.bar{height:10px;background:#2563eb}` +
        `.inner{padding:40px}` +
        `.brand{display:flex;align-items:center;gap:14px;margin-bottom:8px}` +
        `.brand img{width:56px;height:56px;border-radius:14px}.brand b{font-size:26px}.brand span{color:#64748b;font-size:14px;display:block}` +
        `h1{font-size:20px;color:#2563eb;margin:24px 0 16px;letter-spacing:.5px}` +
        `table{width:100%;border-collapse:collapse;margin-bottom:20px}` +
        `td{padding:11px 0;border-bottom:1px solid #eef2f7;font-size:15px;vertical-align:top}` +
        `.k{color:#64748b;width:42%}.v{font-weight:600;text-align:right}` +
        `.total{display:flex;justify-content:space-between;align-items:center;background:#2563eb;color:#fff;border-radius:14px;padding:18px 22px;margin:8px 0 22px}` +
        `.total .lbl{opacity:.8;font-size:14px}.total .amt{font-size:28px;font-weight:700}` +
        `ul{padding-left:18px;color:#475569;font-size:14px;line-height:1.8;margin:0 0 22px}` +
        `.foot{border-top:1px solid #eef2f7;padding-top:16px;color:#94a3b8;font-size:13px;text-align:center}` +
        `@media print{body{background:#fff}.page{box-shadow:none;margin:0;border-radius:0}}` +
        `</style></head><body>` +
        `<div class="page"><div class="bar"></div><div class="inner">` +
        `<div class="brand"><img src="${window.location.origin}/logo-mark.png"/><div><b>OzodFlow</b><span>Raqamli yechimlar — sayt, bot, CRM</span></div></div>` +
        `<h1>${esc(heading.toUpperCase())} № ${esc(docNo)}</h1>` +
        `<table>${rowsHtml}</table>` +
        `<div class="total"><span class="lbl">Summa</span><span class="amt">${esc(formatSom(amount))} so'm</span></div>` +
        `<ul>${condHtml}</ul>` +
        `<div class="foot">+998 93 230 34 10 &nbsp;|&nbsp; @OzodFlow_uz &nbsp;|&nbsp; ozodflow.uz</div>` +
        `</div></div></body></html>`
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  return (
    <SectionShell icon={FileText} label="Hujjatlar" title="Hisob-faktura / Shartnoma">
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className={labelClass}>Hujjat turi</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className={fieldClass}>
              <option value="invoice">Hisob-faktura</option>
              <option value="contract">Shartnoma</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>Mijoz</span>
            <input list="doc-clients" value={client} onChange={(e) => setClient(e.target.value)} className={fieldClass} />
            <datalist id="doc-clients">
              {workspace.clients.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </label>
          <label className="block space-y-2">
            <span className={labelClass}>Xizmat / ish</span>
            <input value={service} onChange={(e) => setService(e.target.value)} className={fieldClass} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className={labelClass}>Summa (so'm)</span>
              <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={fieldClass} />
            </label>
            <label className="block space-y-2">
              <span className={labelClass}>Sana</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClass} />
            </label>
          </div>
          {!isInvoice && (
            <label className="block space-y-2">
              <span className={labelClass}>Topshirish muddati</span>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={fieldClass} />
            </label>
          )}
        </div>

        {/* Live preview — looks like the real document */}
        <div className="flex flex-col">
          <div className="overflow-hidden rounded-2xl border bg-white text-[#0b1530] shadow-card">
            <div className="h-2 bg-accent" />
            <div className="p-6">
              <div className="flex items-center gap-3">
                <img src="/logo-mark.png" alt="" className="h-12 w-12 rounded-xl" />
                <div>
                  <div className="font-display text-xl font-bold">OzodFlow</div>
                  <div className="text-xs text-slate-500">Raqamli yechimlar</div>
                </div>
              </div>
              <div className="mt-5 text-sm font-bold uppercase tracking-wide text-accent">{heading} № {docNo}</div>
              <div className="mt-3 divide-y">
                {rows.slice(1).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
                    <span className="text-slate-500">{k}</span>
                    <span className="text-right font-semibold">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-primary px-5 py-4 text-primary-foreground">
                <span className="text-sm opacity-80">Summa</span>
                <span className="font-display text-2xl font-bold">{formatSom(amount)} so'm</span>
              </div>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-slate-500">
                {conditions.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <div className="mt-4 border-t pt-3 text-center text-xs text-slate-400">
                +998 93 230 34 10 | @OzodFlow_uz | ozodflow.uz
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-semibold transition hover:border-accent hover:text-accent">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Nusxalandi" : "Nusxalash"}
            </button>
            <button type="button" onClick={downloadImage} disabled={downloading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-accent disabled:opacity-60">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Rasm (PNG)
            </button>
            <button type="button" onClick={printDoc} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-semibold transition hover:border-accent hover:text-accent">
              <Printer className="h-4 w-4" /> PDF
            </button>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

/* ------------------------------- Hisobotlar ------------------------------ */

function Reports({ workspace, leads }) {
  const paid = workspace.payments.filter((p) => p.status === "paid").reduce((s, p) => s + toNumber(p.amount), 0);
  const pending = workspace.payments.filter((p) => p.status !== "paid").reduce((s, p) => s + toNumber(p.amount), 0);
  const newLeads = leads.filter((l) => l.status === "new").length;
  const activeWorks = workspace.works.filter((w) => w.status !== "done").length;

  const monthly = useMemo(() => {
    const map = {};
    workspace.payments
      .filter((p) => p.status === "paid")
      .forEach((p) => {
        const month = (p.date || "").slice(0, 7);
        if (!month) return;
        map[month] = (map[month] || 0) + toNumber(p.amount);
      });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([month, total]) => ({ month, total }));
  }, [workspace.payments]);

  const byType = useMemo(() => {
    const map = {};
    workspace.works.forEach((w) => {
      const key = w.type?.trim() || "Boshqa";
      map[key] = (map[key] || 0) + toNumber(w.price);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([type, value]) => ({ type, value, percent: Math.round((value / total) * 100) }));
  }, [workspace.works]);

  const topClients = useMemo(() => {
    const map = {};
    workspace.payments
      .filter((p) => p.status === "paid")
      .forEach((p) => {
        const key = p.client?.trim() || "—";
        map[key] = (map[key] || 0) + toNumber(p.amount);
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
  }, [workspace.payments]);

  function printReport() {
    const win = window.open("", "_blank", "width=820,height=1000");
    if (!win) return;
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const section = (title, rows) =>
      `<h2>${esc(title)}</h2><table>${rows || '<tr><td class="muted">Ma\'lumot yo\'q</td></tr>'}</table>`;
    const monthRows = monthly.map((m) => `<tr><td>${esc(m.month)}</td><td class="r">${esc(formatSom(m.total))} so'm</td></tr>`).join("");
    const typeRows = byType.map((t) => `<tr><td>${esc(t.type)}</td><td class="r">${esc(formatSom(t.value))} so'm · ${t.percent}%</td></tr>`).join("");
    const clientRows = topClients.map((c, i) => `<tr><td>${i + 1}. ${esc(c.name)}</td><td class="r">${esc(formatSom(c.value))} so'm</td></tr>`).join("");
    win.document.write(
      `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>Hisobot — OzodFlow</title><style>` +
        `*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#0b1530;margin:0;background:#f1f5f9}` +
        `.page{max-width:760px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.08)}` +
        `.bar{height:10px;background:#2563eb}.inner{padding:40px}` +
        `.brand{display:flex;align-items:center;gap:14px}.brand img{width:52px;height:52px;border-radius:13px}.brand b{font-size:24px}.brand span{display:block;color:#64748b;font-size:13px}` +
        `.stats{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}` +
        `.stat{flex:1;min-width:150px;border:1px solid #eef2f7;border-radius:12px;padding:14px}` +
        `.stat .l{font-size:12px;color:#64748b}.stat .v{font-size:20px;font-weight:700;margin-top:4px}` +
        `h2{font-size:15px;color:#2563eb;margin:22px 0 8px}` +
        `table{width:100%;border-collapse:collapse}td{padding:9px 0;border-bottom:1px solid #eef2f7;font-size:14px}` +
        `.r{text-align:right;font-weight:600}.muted{color:#94a3b8}` +
        `.foot{margin-top:24px;border-top:1px solid #eef2f7;padding-top:14px;color:#94a3b8;font-size:13px;text-align:center}` +
        `@media print{body{background:#fff}.page{box-shadow:none;margin:0;border-radius:0}}` +
        `</style></head><body><div class="page"><div class="bar"></div><div class="inner">` +
        `<div class="brand"><img src="${window.location.origin}/logo-mark.png"/><div><b>OzodFlow</b><span>Hisobot — ${esc(formatDate(new Date().toISOString().slice(0, 10)))}</span></div></div>` +
        `<div class="stats">` +
        `<div class="stat"><div class="l">Jami daromad</div><div class="v">${esc(formatSom(paid))} so'm</div></div>` +
        `<div class="stat"><div class="l">Kutilayotgan</div><div class="v">${esc(formatSom(pending))} so'm</div></div>` +
        `<div class="stat"><div class="l">Faol ishlar</div><div class="v">${activeWorks}</div></div>` +
        `<div class="stat"><div class="l">Yangi arizalar</div><div class="v">${newLeads}</div></div>` +
        `</div>` +
        section("Oylik daromad", monthRows) +
        section("Ish turlari bo'yicha", typeRows) +
        section("Eng ko'p daromad keltirgan mijozlar", clientRows) +
        `<div class="foot">+998 93 230 34 10 &nbsp;|&nbsp; @OzodFlow_uz &nbsp;|&nbsp; ozodflow.uz</div>` +
        `</div></div></body></html>`
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  return (
    <SectionShell
      icon={BarChart3}
      label="Hisobot"
      title="Umumiy ko'rsatkichlar"
      action={
        <button
          type="button"
          onClick={printReport}
          className="inline-flex w-fit items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold transition hover:border-accent hover:text-accent"
        >
          <Printer className="h-4 w-4" /> PDF hisobot
        </button>
      }
    >
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatChip label="Jami daromad" value={`${formatSom(paid)} so'm`} tone="text-emerald-600" />
        <StatChip label="Kutilayotgan" value={`${formatSom(pending)} so'm`} tone="text-amber-600" />
        <StatChip label="Faol ishlar" value={activeWorks} tone="text-sky" />
        <StatChip label="Yangi arizalar" value={newLeads} tone="text-accent" />
      </div>

      {monthly.length > 0 && (
        <div className="mt-5 rounded-2xl border bg-card p-4">
          <div className={labelClass}>Oylik daromad (so'm)</div>
          <div className="mt-3">
            <Suspense fallback={<div className="h-56 animate-pulse rounded-lg bg-muted" />}>
              <IncomeChart data={monthly} />
            </Suspense>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <div className={labelClass}>Ish turlari bo'yicha qiymat</div>
          {byType.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Ma'lumot yo'q.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {byType.map((row) => (
                <div key={row.type}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{row.type}</span>
                    <span className="text-muted-foreground">{formatSom(row.value)} so'm · {row.percent}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${row.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-5">
          <div className={labelClass}>Eng ko'p daromad keltirgan mijozlar</div>
          {topClients.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Ma'lumot yo'q.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {topClients.map((row, i) => (
                <div key={row.name} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2.5 text-sm">
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">{i + 1}</span>
                    {row.name}
                  </span>
                  <span className="font-semibold">{formatSom(row.value)} so'm</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  );
}

/* -------------------------------- Kalendar ------------------------------- */

const MONTHS_UZ = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
const WEEKDAYS_UZ = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];

function CalendarView({ workspace }) {
  const [view, setView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const events = useMemo(() => {
    const map = {};
    workspace.works.forEach((w) => {
      if (w.deadline && w.status !== "done") {
        (map[w.deadline] = map[w.deadline] || []).push({ type: "deadline", label: `⏰ ${w.title}` });
      }
    });
    workspace.payments.forEach((p) => {
      if (p.date && p.status !== "paid") {
        (map[p.date] = map[p.date] || []).push({ type: "payment", label: `💰 ${p.client || "To'lov"} — ${formatSom(p.amount)}` });
      }
    });
    return map;
  }, [workspace.works, workspace.payments]);

  const first = new Date(view.year, view.month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const todayStr = new Date().toISOString().slice(0, 10);
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = (d) => `${view.year}-${pad(view.month + 1)}-${pad(d)}`;

  function shift(delta) {
    setView((current) => {
      const m = current.month + delta;
      return { year: current.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  }

  const upcoming = Object.entries(events)
    .filter(([d]) => d >= todayStr)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 8);

  return (
    <SectionShell icon={CalendarDays} label="Kalendar" title="Deadline va to'lovlar">
      <div className="mt-5 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-card transition hover:border-accent hover:text-accent">
          <ChevronUp className="h-4 w-4 -rotate-90" />
        </button>
        <div className="font-display text-lg font-bold">{MONTHS_UZ[view.month]} {view.year}</div>
        <button type="button" onClick={() => shift(1)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-card transition hover:border-accent hover:text-accent">
          <ChevronDown className="h-4 w-4 -rotate-90" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground">
        {WEEKDAYS_UZ.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`e-${i}`} />;
          const ds = dateStr(d);
          const dayEvents = events[ds] || [];
          const isToday = ds === todayStr;
          return (
            <div
              key={ds}
              className={`min-h-16 rounded-lg border p-1.5 text-left ${isToday ? "border-accent bg-accent/5" : "bg-card"}`}
            >
              <div className={`text-xs font-semibold ${isToday ? "text-accent" : "text-muted-foreground"}`}>{d}</div>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 2).map((ev, idx) => (
                  <div
                    key={idx}
                    title={ev.label}
                    className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${ev.type === "deadline" ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600"}`}
                  >
                    {ev.label}
                  </div>
                ))}
                {dayEvents.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <div className={labelClass}>Yaqin sanalar</div>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Yaqin deadline yoki to'lov yo'q.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {upcoming.flatMap(([d, evs]) =>
              evs.map((ev, idx) => (
                <div key={`${d}-${idx}`} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
                  <span className="font-medium text-muted-foreground">{formatDate(d)}</span>
                  <span>{ev.label}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </SectionShell>
  );
}
