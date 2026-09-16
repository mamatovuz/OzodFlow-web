"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  UtensilsCrossed,
  ChevronUp,
  ChevronDown,
  Search,
  EyeOff,
  Flame,
  Leaf,
  X,
  GripVertical,
} from "lucide-react";
import { Button, Input, Textarea, Label, Select, Card, Badge, Switch } from "@/components/ui";
import { parseModifiers, type ModifierGroup } from "@/lib/orders";

// Forma ichidagi bo'lim sarlavhasi (§24) — maydonlarni mantiqiy guruhlaydi
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-border pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </p>
  );
}
import { Modal } from "@/components/ui-modal";
import { MultiImageUpload, ImageUpload } from "@/components/dashboard/image-upload";
import { ExcelImport } from "@/components/dashboard/excel-import";
import { AiImport } from "@/components/dashboard/ai-import";
import { formatPrice, parseJson } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  nameRu: string | null;
  nameEn: string | null;
  description: string | null;
  image: string | null;
  isVisible: boolean;
  sortOrder: number;
  _count?: { products: number };
};

type Product = {
  id: string;
  categoryId: string;
  name: string;
  nameRu: string | null;
  nameEn: string | null;
  description: string | null;
  descriptionRu: string | null;
  descriptionEn: string | null;
  images: string | null;
  crop: string | null;
  price: number;
  oldPrice: number | null;
  weight: string | null;
  calories: number | null;
  spicyLevel: number;
  modifiers?: string | null;
  isVegetarian: boolean;
  isHalal: boolean;
  isNew: boolean;
  isBestseller: boolean;
  isRecommended: boolean;
  isAvailable: boolean;
  isVisible: boolean;
};

export function MenuManager({ currency }: { currency: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [availFilter, setAvailFilter] = useState<"all" | "available" | "stopped">("all");
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "name">("default");

  const [catModal, setCatModal] = useState<{ open: boolean; edit?: Category }>({
    open: false,
  });
  const [prodModal, setProdModal] = useState<{ open: boolean; edit?: Product }>({
    open: false,
  });

  const loadCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    const json = await res.json();
    if (json.success) {
      setCategories(json.data);
      setActiveCat((prev) => prev ?? json.data[0]?.id ?? null);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    const res = await fetch("/api/products");
    const json = await res.json();
    if (json.success) setProducts(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, [loadCategories, loadProducts]);

  // Kategoriyani tepaga (-1) yoki pastga (+1) siljitadi
  async function moveCategory(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next); // darhol ko'rsatamiz
    await fetch("/api/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((c) => c.id) }),
    });
  }

  async function deleteCategory(id: string) {
    if (!confirm("Kategoriya va undagi barcha mahsulotlar o'chiriladi. Davom etilsinmi?"))
      return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (activeCat === id) setActiveCat(null);
    loadCategories();
    loadProducts();
  }

  async function deleteProduct(id: string) {
    if (!confirm("Mahsulot o'chirilsinmi?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    loadProducts();
  }

  async function toggleAvailable(p: Product) {
    await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !p.isAvailable }),
    });
    loadProducts();
  }

  // ─── Global qidiruv ───
  // Qidiruv yozilganda — kategoriyadan qat'i nazar BARCHA taomlar orasidan
  // qidiradi (nom uz/ru/en bo'yicha). Bo'sh bo'lsa — tanlangan kategoriya ichida.
  const q = search.trim().toLowerCase();
  const catNameById = new Map(categories.map((c) => [c.id, c.name]));
  const visibleProducts = products
    .filter((p) => (q ? true : activeCat ? p.categoryId === activeCat : true))
    .filter((p) =>
      !q
        ? true
        : [p.name, p.nameRu, p.nameEn]
            .filter(Boolean)
            .some((n) => n!.toLowerCase().includes(q))
    )
    // Mavjudlik filtri (§23)
    .filter((p) =>
      availFilter === "all"
        ? true
        : availFilter === "available"
        ? p.isAvailable
        : !p.isAvailable
    )
    // Saralash (§23) — "default" bo'lsa asl (server) tartibi saqlanadi
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "name") return a.name.localeCompare(b.name, "uz");
      return 0;
    });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[260px_1fr]">
      {/* Kategoriyalar */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Kategoriyalar</h2>
          <Button size="sm" variant="outline" onClick={() => setCatModal({ open: true })}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1.5 max-xl:max-h-[46vh] max-xl:overflow-y-auto max-xl:pr-1">
          {categories.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted">
              Kategoriya yo'q. Qo'shing.
            </p>
          )}
          {categories.map((c, index) => (
            <div
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              className={`group flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors ${
                activeCat === c.id
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-card hover:bg-surface-2"
              }`}
            >
              <div className="flex shrink-0 flex-col">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveCategory(index, -1);
                  }}
                  disabled={index === 0}
                  className="rounded p-0.5 text-muted hover:text-foreground disabled:opacity-30 disabled:hover:text-muted"
                  title="Tepaga"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveCategory(index, 1);
                  }}
                  disabled={index === categories.length - 1}
                  className="rounded p-0.5 text-muted hover:text-foreground disabled:opacity-30 disabled:hover:text-muted"
                  title="Pastga"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-foreground">
                    {c.name}
                  </span>
                  {!c.isVisible && <EyeOff className="h-3 w-3 text-muted" />}
                </div>
                <span className="text-xs text-muted">
                  {c._count?.products ?? 0} mahsulot
                </span>
              </div>
              <div className="flex shrink-0 gap-0.5 opacity-100 transition-opacity xl:opacity-0 xl:group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCatModal({ open: true, edit: c });
                  }}
                  className="rounded p-1 text-muted hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCategory(c.id);
                  }}
                  className="rounded p-1 text-muted hover:text-error"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mahsulotlar */}
      <div>
        <div className="mb-3 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Barcha taomlardan qidirish..."
                className="pl-9"
              />
            </div>
            <Button
              onClick={() => setProdModal({ open: true })}
              disabled={categories.length === 0}
            >
              <Plus className="h-4 w-4" /> Mahsulot
            </Button>
          </div>

          {/* Mavjudlik filtri + saralash + natija soni (§23) */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "all", label: "Barchasi" },
              { key: "available", label: "Mavjud" },
              { key: "stopped", label: "Tugagan" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setAvailFilter(f.key as typeof availFilter)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  availFilter === f.key
                    ? "bg-accent text-white"
                    : "border border-border bg-card text-muted hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-8 w-auto px-2 text-xs"
            >
              <option value="default">Tartib: standart</option>
              <option value="name">Nomi (A→Z)</option>
              <option value="price-asc">Narx (arzon→qimmat)</option>
              <option value="price-desc">Narx (qimmat→arzon)</option>
            </Select>
            <span className="ml-auto text-xs text-muted">{visibleProducts.length} ta mahsulot</span>
          </div>
        </div>

        {visibleProducts.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <UtensilsCrossed className="h-10 w-10 text-muted/40" />
            <p className="mt-3 font-medium text-foreground">
              {q ? `"${search}" bo'yicha hech narsa topilmadi` : "Mahsulot yo'q"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {q
                ? "Boshqa nom bilan qidirib ko'ring"
                : categories.length === 0
                ? "Avval kategoriya qo'shing"
                : "Birinchi mahsulotni qo'shing"}
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))]">
            {visibleProducts.map((p) => {
              const imgs = parseJson<string[]>(p.images, []);
              return (
                <Card key={p.id} className="overflow-hidden">
                  <div className="flex gap-3 p-3">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                      {imgs[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imgs[0]}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted/40">
                          <UtensilsCrossed className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 font-medium leading-snug text-foreground">
                          {p.name}
                        </p>
                        <div className="flex shrink-0 gap-0.5">
                          <button
                            onClick={() => setProdModal({ open: true, edit: p })}
                            className="rounded p-1 text-muted hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => deleteProduct(p.id)}
                            className="rounded p-1 text-muted hover:text-error"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {q && (
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {catNameById.get(p.categoryId) || "Kategoriyasiz"}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">
                          {formatPrice(p.price, currency)}
                        </span>
                        {p.oldPrice && (
                          <span className="text-xs text-muted line-through">
                            {formatPrice(p.oldPrice, currency)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {p.isBestseller && <Badge variant="warning">Xit</Badge>}
                        {p.isNew && <Badge variant="success">Yangi</Badge>}
                        {p.isVegetarian && (
                          <Badge variant="success">
                            <Leaf className="h-2.5 w-2.5" />
                          </Badge>
                        )}
                        {p.spicyLevel > 0 && (
                          <Badge variant="error">
                            <Flame className="h-2.5 w-2.5" /> {p.spicyLevel}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border px-3 py-2">
                    <span className="text-xs text-muted">Mavjud</span>
                    <Switch
                      checked={p.isAvailable}
                      onChange={() => toggleAvailable(p)}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      </div>

      {/* AI bilan menyu import — eng tez usul */}
      <AiImport
        onImported={() => {
          loadProducts();
          loadCategories();
        }}
      />

      {/* Excel orqali ommaviy qo'shish — menyu qo'shish joyi ostida */}
      <ExcelImport
        onImported={() => {
          loadProducts();
          loadCategories();
        }}
      />

      {/* Kategoriya modal */}
      <CategoryModal
        state={catModal}
        onClose={() => setCatModal({ open: false })}
        onSaved={() => {
          setCatModal({ open: false });
          loadCategories();
        }}
      />

      {/* Mahsulot modal */}
      <ProductModal
        state={prodModal}
        categories={categories}
        activeCat={activeCat}
        currency={currency}
        onClose={() => setProdModal({ open: false })}
        onSaved={() => {
          setProdModal({ open: false });
          loadProducts();
          loadCategories();
        }}
      />
    </div>
  );
}

// ─── Kategoriya modal ───
function CategoryModal({
  state,
  onClose,
  onSaved,
}: {
  state: { open: boolean; edit?: Category };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const edit = state.edit;
  const [image, setImage] = useState(edit?.image ?? "");

  // Modal doim mount holatida turadi — har ochilganda rasmni o'sha
  // kategoriyaning rasmiga tiklaymiz (aks holda oldingi kategoriya rasmi qoladi).
  useEffect(() => {
    if (state.open) setImage(state.edit?.image ?? "");
  }, [state.open, state.edit?.id]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const payload = {
      name: f.get("name"),
      nameRu: f.get("nameRu"),
      nameEn: f.get("nameEn"),
      description: f.get("description"),
      image: image || null,
      isVisible: f.get("isVisible") === "on",
    };
    const res = await fetch(
      edit ? `/api/categories/${edit.id}` : "/api/categories",
      {
        method: edit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setLoading(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error || "Xatolik");
      return;
    }
    onSaved();
  }

  return (
    <Modal
      open={state.open}
      onClose={onClose}
      title={edit ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}
        <div>
          <Label>Nomi (o'zbekcha) *</Label>
          <Input name="name" defaultValue={edit?.name} required autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Название (RU)</Label>
            <Input name="nameRu" defaultValue={edit?.nameRu ?? ""} placeholder="Ruscha" />
          </div>
          <div>
            <Label>Name (EN)</Label>
            <Input name="nameEn" defaultValue={edit?.nameEn ?? ""} placeholder="Inglizcha" />
          </div>
        </div>
        <div>
          <Label>Tavsif</Label>
          <Textarea
            name="description"
            defaultValue={edit?.description ?? ""}
            rows={2}
          />
        </div>
        <div>
          <Label>Kategoriya rasmi (banner)</Label>
          <ImageUpload value={image} onChange={setImage} aspect="wide" label="Kategoriya" />
          <p className="mt-1 text-xs text-muted">
            Menyuda kategoriya katta rasmli karta bo'lib chiqadi. Bosilganda mahsulotlar ochiladi.
          </p>
        </div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isVisible"
            defaultChecked={edit?.isVisible ?? true}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          <span className="text-sm text-foreground">Menyuda ko'rinsin</span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Mahsulot modal ───
function ProductModal({
  state,
  categories,
  activeCat,
  currency,
  onClose,
  onSaved,
}: {
  state: { open: boolean; edit?: Product };
  categories: Category[];
  activeCat: string | null;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [modGroups, setModGroups] = useState<ModifierGroup[]>([]);
  const edit = state.edit;

  useEffect(() => {
    setImages(parseJson<string[]>(edit?.images, []));
    setModGroups(parseModifiers(edit?.modifiers));
    setError("");
  }, [edit, state.open]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const f = new FormData(e.currentTarget);
    const num = (v: FormDataEntryValue | null) =>
      v && String(v).trim() !== "" ? Number(v) : undefined;
    const payload = {
      categoryId: f.get("categoryId"),
      name: f.get("name"),
      nameRu: f.get("nameRu"),
      nameEn: f.get("nameEn"),
      description: f.get("description"),
      descriptionRu: f.get("descriptionRu"),
      descriptionEn: f.get("descriptionEn"),
      price: Number(f.get("price") || 0),
      oldPrice: num(f.get("oldPrice")) ?? null,
      weight: f.get("weight"),
      calories: num(f.get("calories")) ?? null,
      ingredients: f.get("ingredients"),
      spicyLevel: Number(f.get("spicyLevel") || 0),
      images,
      modifiers: JSON.stringify(cleanModifiers(modGroups)),
      crop: (f.get("crop") as string) || "auto",
      isVegetarian: f.get("isVegetarian") === "on",
      isHalal: f.get("isHalal") === "on",
      isNew: f.get("isNew") === "on",
      isBestseller: f.get("isBestseller") === "on",
      isRecommended: f.get("isRecommended") === "on",
      isVisible: f.get("isVisible") === "on",
    };
    const res = await fetch(
      edit ? `/api/products/${edit.id}` : "/api/products",
      {
        method: edit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    setLoading(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error || "Xatolik");
      return;
    }
    onSaved();
  }

  return (
    <Modal
      open={state.open}
      onClose={onClose}
      title={edit ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}
      wide
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}

        {/* Rasmlar */}
        <div>
          <Label>Rasmlar</Label>
          <MultiImageUpload images={images} onChange={setImages} max={5} />
        </div>

        {/* Rasm kesish pozitsiyasi — taom noto'g'ri kesilsa shu yerda tuzatiladi */}
        {images.length > 0 && (
          <div>
            <Label>Rasm kesish (menyuda qaysi qismi ko'rinsin)</Label>
            <Select name="crop" defaultValue={edit?.crop || "auto"}>
              <option value="auto">Avtomatik (aqlli — taomni o'zi topadi)</option>
              <option value="center">Markaz</option>
              <option value="top">Tepa</option>
              <option value="bottom">Past</option>
            </Select>
            <p className="mt-1 text-xs text-muted">
              Agar taom rasmda noto'g'ri (masalan tepaga) kesilib qolsa —
              &quot;Markaz&quot; yoki &quot;Past&quot;ni tanlang.
            </p>
          </div>
        )}

        <SectionTitle>Asosiy ma'lumotlar</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nomi (o'zbekcha) *</Label>
            <Input name="name" defaultValue={edit?.name} required />
          </div>
          <div>
            <Label>Название (RU)</Label>
            <Input name="nameRu" defaultValue={edit?.nameRu ?? ""} placeholder="Ruscha nomi" />
          </div>
          <div>
            <Label>Name (EN)</Label>
            <Input name="nameEn" defaultValue={edit?.nameEn ?? ""} placeholder="Inglizcha nomi" />
          </div>
          <div>
            <Label>Kategoriya *</Label>
            <Select
              name="categoryId"
              defaultValue={edit?.categoryId || activeCat || ""}
              required
            >
              <option value="" disabled>
                Tanlang
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Narx *</Label>
            <Input
              name="price"
              type="number"
              step="any"
              defaultValue={edit?.price ?? ""}
              required
            />
          </div>
          <div>
            <Label>Eski narx</Label>
            <Input
              name="oldPrice"
              type="number"
              step="any"
              defaultValue={edit?.oldPrice ?? ""}
            />
          </div>
          <div>
            <Label>Og'irligi</Label>
            <Input
              name="weight"
              defaultValue={edit?.weight ?? ""}
              placeholder="250g"
            />
          </div>
          <div>
            <Label>Kaloriya</Label>
            <Input
              name="calories"
              type="number"
              defaultValue={edit?.calories ?? ""}
            />
          </div>
          <div>
            <Label>Achchiqlik (0-3)</Label>
            <Select name="spicyLevel" defaultValue={String(edit?.spicyLevel ?? 0)}>
              <option value="0">Yo'q</option>
              <option value="1">Kam</option>
              <option value="2">O'rta</option>
              <option value="3">Achchiq</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Tavsif (o'zbekcha)</Label>
            <Textarea name="description" defaultValue={edit?.description ?? ""} rows={2} />
          </div>
          <div>
            <Label>Описание (RU)</Label>
            <Textarea name="descriptionRu" defaultValue={edit?.descriptionRu ?? ""} rows={2} />
          </div>
          <div>
            <Label>Description (EN)</Label>
            <Textarea name="descriptionEn" defaultValue={edit?.descriptionEn ?? ""} rows={2} />
          </div>
          <div className="sm:col-span-2">
            <Label>Tarkibi</Label>
            <Input name="ingredients" placeholder="Go'sht, guruch, sabzi..." />
          </div>
        </div>

        {/* Modifierlar (variant / qo'shimcha) */}
        <SectionTitle>Modifierlar (variant / qo'shimcha)</SectionTitle>
        <ModifierEditor groups={modGroups} onChange={setModGroups} currency={currency} />

        {/* Belgilar */}
        <SectionTitle>Belgilar va ko'rinish</SectionTitle>
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-2 p-3 sm:grid-cols-3">
          {[
            { name: "isVegetarian", label: "Vegetarian", def: edit?.isVegetarian },
            { name: "isHalal", label: "Halol", def: edit?.isHalal },
            { name: "isNew", label: "Yangi", def: edit?.isNew },
            { name: "isBestseller", label: "Bestseller", def: edit?.isBestseller },
            { name: "isRecommended", label: "Tavsiya", def: edit?.isRecommended },
            { name: "isVisible", label: "Ko'rinsin", def: edit?.isVisible ?? true },
          ].map((c) => (
            <label key={c.name} className="flex items-center gap-2">
              <input
                type="checkbox"
                name={c.name}
                defaultChecked={c.def ?? false}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              <span className="text-sm text-foreground">{c.label}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Bo'sh nom/optionlarni tozalaydi (saqlashdan oldin)
function cleanModifiers(groups: ModifierGroup[]): ModifierGroup[] {
  return groups
    .map((g) => ({
      name: g.name.trim(),
      required: g.required,
      multi: g.multi,
      options: g.options
        .filter((o) => o.name.trim())
        .map((o) => ({ name: o.name.trim(), price: Number(o.price) || 0 })),
    }))
    .filter((g) => g.name && g.options.length > 0);
}

// ─── Modifier editor (egasi har taomga variant/qo'shimcha belgilaydi) ───
function ModifierEditor({
  groups,
  onChange,
  currency,
}: {
  groups: ModifierGroup[];
  onChange: (g: ModifierGroup[]) => void;
  currency: string;
}) {
  function addGroup() {
    onChange([...groups, { name: "", required: false, multi: false, options: [{ name: "", price: 0 }] }]);
  }
  function updateGroup(i: number, patch: Partial<ModifierGroup>) {
    onChange(groups.map((g, gi) => (gi === i ? { ...g, ...patch } : g)));
  }
  function removeGroup(i: number) {
    onChange(groups.filter((_, gi) => gi !== i));
  }
  function addOption(gi: number) {
    onChange(groups.map((g, i) => (i === gi ? { ...g, options: [...g.options, { name: "", price: 0 }] } : g)));
  }
  function updateOption(gi: number, oi: number, patch: Partial<{ name: string; price: number }>) {
    onChange(
      groups.map((g, i) =>
        i === gi ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) } : g
      )
    );
  }
  function removeOption(gi: number, oi: number) {
    onChange(groups.map((g, i) => (i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g)));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Masalan: <b>Porsiya</b> (Oddiy / Katta +10 000) yoki <b>Qo'shimcha</b> (Non +3000, Achchiq).
        Ofitsant taom qo'shganda tanlaydi, narx avtomatik qo'shiladi. Bo'sh qoldirsangiz — modifier bo'lmaydi.
      </p>

      {groups.map((g, gi) => (
        <div key={gi} className="rounded-xl border border-border bg-surface-2 p-3">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 shrink-0 text-muted/50" />
            <Input
              value={g.name}
              onChange={(e) => updateGroup(gi, { name: e.target.value })}
              placeholder="Guruh nomi (Porsiya, Qo'shimcha...)"
              className="flex-1"
            />
            <button type="button" onClick={() => removeGroup(gi)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-error/10 hover:text-error">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-3 pl-6">
            <label className="flex items-center gap-1.5 text-xs text-foreground">
              <input type="checkbox" checked={g.required} onChange={(e) => updateGroup(gi, { required: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
              Majburiy
            </label>
            <label className="flex items-center gap-1.5 text-xs text-foreground">
              <input type="checkbox" checked={g.multi} onChange={(e) => updateGroup(gi, { multi: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
              Bir nechta tanlansin
            </label>
          </div>

          <div className="mt-2 space-y-1.5 pl-6">
            {g.options.map((o, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <Input
                  value={o.name}
                  onChange={(e) => updateOption(gi, oi, { name: e.target.value })}
                  placeholder="Variant nomi"
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={o.price === 0 ? "" : String(o.price)}
                  onChange={(e) => updateOption(gi, oi, { price: Number(e.target.value) || 0 })}
                  placeholder="+ narx"
                  className="w-28"
                />
                <button type="button" onClick={() => removeOption(gi, oi)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-error/10 hover:text-error">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addOption(gi)} className="text-xs font-medium text-accent hover:underline">
              + Variant qo'shish
            </button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" onClick={addGroup} className="w-full">
        <Plus className="h-4 w-4" /> Modifier guruh qo'shish {currency ? "" : ""}
      </Button>
    </div>
  );
}
