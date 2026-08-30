import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Ism kamida 2 belgi bo'lishi kerak"),
  email: z.string().email("Email noto'g'ri").optional().or(z.literal("")),
  phone: z.string().min(9, "Telefon noto'g'ri").optional().or(z.literal("")),
  password: z.string().min(6, "Parol kamida 6 belgi bo'lishi kerak"),
  restaurantName: z.string().min(2, "Restoran nomi kamida 2 belgi"),
});

export const loginSchema = z.object({
  identifier: z.string().min(3, "Email yoki telefon kiriting"),
  password: z.string().min(1, "Parol kiriting"),
});

export const restaurantSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  descriptionRu: z.string().optional(),
  descriptionEn: z.string().optional(),
  logo: z.string().optional(),
  cover: z.string().optional(),
  phone: z.string().optional(),
  telegram: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
  mapUrl: z.string().optional(),
  address: z.string().optional(),
  workHours: z.string().optional(),
  currency: z.string().optional(),
  hasDelivery: z.boolean().optional(),
  payMethods: z.string().optional(),
  primaryColor: z.string().optional(),
  menuTheme: z.string().optional(),
  designConfig: z.string().optional(),
  waiterCodeEnabled: z.boolean().optional(),
  askPhone: z.boolean().optional(),
  orderBotToken: z.string().max(120).optional().nullable(),
  orderChatId: z.string().max(120).optional().nullable(),
  customDomain: z.string().optional().nullable(),
});

export const waiterSchema = z.object({
  name: z.string().min(1, "Ism kiriting").max(60),
  lastName: z.string().max(60).optional().nullable(),
  age: z.number().int().min(10).max(120).optional().nullable(),
  code: z
    .string()
    .min(1, "Kod kiriting")
    .max(24, "Kod juda uzun")
    .regex(/^\S+$/, "Kodda bo'sh joy bo'lmasin"),
  isActive: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Nom kiriting"),
  nameRu: z.string().optional(),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  image: z.string().optional().nullable(),
  isVisible: z.boolean().optional(),
});

export const productSchema = z.object({
  categoryId: z.string().min(1, "Kategoriya tanlang"),
  name: z.string().min(1, "Nom kiriting"),
  nameRu: z.string().optional(),
  nameEn: z.string().optional(),
  description: z.string().optional(),
  descriptionRu: z.string().optional(),
  descriptionEn: z.string().optional(),
  images: z.array(z.string()).optional(),
  crop: z.enum(["auto", "center", "top", "bottom"]).optional(),
  price: z.number().min(0),
  oldPrice: z.number().min(0).optional().nullable(),
  ingredients: z.string().optional(),
  weight: z.string().optional(),
  calories: z.number().int().min(0).optional().nullable(),
  spicyLevel: z.number().int().min(0).max(3).optional(),
  isVegetarian: z.boolean().optional(),
  isHalal: z.boolean().optional(),
  isNew: z.boolean().optional(),
  isBestseller: z.boolean().optional(),
  isRecommended: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  isVisible: z.boolean().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
