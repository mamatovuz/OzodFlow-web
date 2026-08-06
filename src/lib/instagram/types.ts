/** Instagram Automation — umumiy tiplar */

export type IgTrigger = "COMMENT" | "DM" | "COMMENT_DM";
export type IgMatchType = "CONTAINS" | "EQUALS" | "STARTS_WITH" | "ENDS_WITH";
export type IgScope = "GLOBAL" | "POST";
export type IgMessageKind = "TEXT" | "IMAGE" | "VIDEO";
export type IgButtonAction = "URL" | "NEXT_STEP" | "POSTBACK";
export type IgLogStatus = "SENT" | "SKIPPED" | "FAILED" | "PENDING";

/** Ishlash jadvali (rule.schedule JSON) */
export type IgSchedule = {
  mode: "ALWAYS" | "HOURS" | "WEEKEND" | "CUSTOM";
  from?: string; // "09:00"
  to?: string; // "18:00"
  days?: number[]; // 0=yakshanba ... 6=shanba (CUSTOM uchun)
  tz?: string; // "Asia/Tashkent"
};

/** Instagram profil (Graph API /me) */
export type IgProfile = {
  user_id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
};

/** Instagram media (post) */
export type IgMediaItem = {
  id: string;
  caption?: string;
  media_type?: string; // IMAGE | VIDEO | CAROUSEL_ALBUM
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
  comments_count?: number;
  like_count?: number;
};

/** Webhook'dan chiqarilgan normallashtirilgan hodisa */
export type IgIncoming =
  | {
      kind: "COMMENT";
      commentId: string;
      mediaId: string;
      text: string;
      fromId: string; // commenter ig id
      fromUsername?: string;
    }
  | {
      kind: "DM";
      messageId: string; // mid
      text: string;
      senderId: string; // IGSID
    }
  | {
      kind: "POSTBACK";
      messageId: string; // mid/postback id
      payload: string; // tugma payload (ozf_next:<ruleId>:<step>)
      senderId: string; // IGSID
    };

/** Instagram API cheklovi izohi (UI'da ko'rsatiladi) */
export const IG_LIMITS = {
  maxButtons: 3,
  messagingWindowHours: 24,
  note:
    "Instagram Graph API cheklovlari: bitta xabarda eng ko'pi 3 ta tugma; " +
    "foydalanuvchiga faqat oxirgi 24 soat ichida yozgan bo'lsa DM yuborish mumkin; " +
    "tugmalar faqat havola (URL) yoki flow'ning keyingi bosqichini ochadi.",
};
