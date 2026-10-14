import "server-only";
import { cookies, headers } from "next/headers";
import {
  SESSION_TTL_SECONDS,
  PREVIEW_TEACHER_ID,
  createSessionToken as mintSessionToken,
  verifySessionToken,
  sessionIdentityMatchesMode,
} from "./session-token";

/**
 * نشست تک‌کاربره‌ی استاد: کوکی امضاشده با HMAC (بدون جدول نشست در دیتابیس،
 * چون فقط یک استاد وجود دارد و ورود مجدد در تلگرام با initData تازه بی‌دردسر است).
 * توابع خالص توکن و تطبیق حالت در src/lib/session-token.ts (قابل‌تست، F14).
 *
 * قواعد امنیتی:
 * - در حالت واقعی فقط initData معتبر + شناسه‌ی تلگرام استاد (TEACHER_TELEGRAM_ID) پذیرفته می‌شود.
 * - اگر TEACHER_TELEGRAM_ID تنظیم نشده باشد، ورود واقعی «fail-closed» رد می‌شود.
 * - حالت پیش‌نمایش فقط وقتی توکن بات تنظیم نشده و ALLOW_DEMO_AUTH="true" است.
 * - در تولید، بدون SESSION_SECRET (یا توکن بات) هیچ نشستی صادر یا تأیید نمی‌شود:
 *   استقرارِ ناقص‌پیکربندی به‌جای استفاده از کلید ساختگی، بسته می‌ماند (fail-closed).
 * - هویت نشست با «پیکربندی فعلی» تطبیق داده می‌شود: کوکی پیش‌نمایش در حالت واقعی
 *   و کوکی استادِ سابق پس از تغییر TEACHER_TELEGRAM_ID، نامعتبر است.
 */

export const SESSION_COOKIE = "setar_session";
export { PREVIEW_TEACHER_ID };

export function isPreviewAuthAllowed(): boolean {
  return (process.env.ALLOW_DEMO_AUTH ?? "").trim().toLowerCase() === "true";
}

export function telegramBotToken(): string {
  return (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
}

export function allowedTeacherTelegramId(): number | null {
  const raw = (process.env.TEACHER_TELEGRAM_ID ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * راز امضای نشست: SESSION_SECRET صریح، در غیر این صورت توکن بات.
 * کلید ساختگی فقط برای توسعه‌ی محلی (NODE_ENV≠production) است؛ در تولیدِ
 * بدون پیکربندی امن، null برمی‌گردد و هیچ نشستی صادر/تأیید نمی‌شود.
 */
function sessionSecret(): string | null {
  const explicit = (process.env.SESSION_SECRET ?? "").trim();
  if (explicit) return explicit;
  const botToken = telegramBotToken();
  if (botToken) return botToken;
  if (process.env.NODE_ENV !== "production") return "setar-preview-insecure-key";
  return null;
}

/** آیا پیکربندی فعلی اجازه‌ی صدور نشست می‌دهد؟ (چک صریح در مسیر ورود) */
export function sessionSigningConfigured(): boolean {
  return sessionSecret() !== null;
}

function mintSession(teacherId: number): string {
  const secret = sessionSecret();
  if (!secret) {
    // مسیر ورود باید پیش از رسیدن به اینجا sessionSigningConfigured را چک کرده باشد.
    throw new Error("Session signing is not configured (SESSION_SECRET/TELEGRAM_BOT_TOKEN).");
  }
  return mintSessionToken(teacherId, secret);
}

/** تشخیص HTTPS پشت پراکسی — الگوی تأییدشده از پروژه‌ی مرجع. */
async function requestIsHttps(): Promise<boolean> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim().toLowerCase();
  if (proto === "https") return true;
  return process.env.NODE_ENV === "production";
}

export async function setSessionCookie(teacherId: number): Promise<void> {
  const https = await requestIsHttps();
  const store = await cookies();
  // تلگرام دسکتاپ/وب مینی‌اپ را در iframe بین‌دامنه‌ای باز می‌کند؛ SameSite=None+Secure
  // روی HTTPS لازم است و روی HTTP محلی به lax برمی‌گردیم.
  store.set(SESSION_COOKIE, mintSession(teacherId), {
    httpOnly: true,
    sameSite: https ? "none" : "lax",
    secure: https,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export interface SessionInfo {
  teacherId: number;
}

/**
 * خواندن نشست فعلی؛ null یعنی باید ورود انجام شود.
 * پس از بررسی امضا و انقضا، هویت نشست با «حالت احراز هویتِ فعلی سرور» تطبیق
 * داده می‌شود تا نشست‌های ناسازگار با پیکربندی جدید، طبیعی باطل شوند.
 */
export async function getSession(): Promise<SessionInfo | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const teacherId = verifySessionToken(token, sessionSecret() ?? "");
  if (teacherId === null) return null;

  if (
    !sessionIdentityMatchesMode(teacherId, {
      hasBotToken: telegramBotToken() !== "",
      allowedTeacherId: allowedTeacherTelegramId(),
      previewAllowed: isPreviewAuthAllowed(),
    })
  ) {
    return null;
  }

  return { teacherId };
}

/** برای Server Actionها و صفحات: نشست معتبر یا null. */
export async function requireTeacher(): Promise<SessionInfo | null> {
  return getSession();
}
