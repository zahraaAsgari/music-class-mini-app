import crypto from "crypto";

/**
 * توابع خالص توکن نشست و تطبیق حالت احراز هویت — بدون وابستگی به Next/env تا
 * در QA مستقیم تست شوند (F14). src/lib/auth.ts آن‌ها را با متغیرهای محیطی
 * و کوکی Next پیکربندی می‌کند؛ این فایل خودش با ورودی‌های صریح کار می‌کند.
 */

export const SESSION_TTL_SECONDS = 30 * 24 * 3600; // ۳۰ روز
/** شناسه‌ی مصنوعی استاد در حالت پیش‌نمایش */
export const PREVIEW_TEACHER_ID = 0;

export function createSessionToken(teacherId: number, secret: string, nowSeconds = Date.now() / 1000): string {
  const exp = Math.floor(nowSeconds) + SESSION_TTL_SECONDS;
  const payload = `v1.${teacherId}.${exp}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/** راستی‌آزمایی امضا و انقضای توکن؛ راز خالی/نامعتبر/منقضی → null. */
export function verifySessionToken(token: string, secret: string, nowSeconds = Date.now() / 1000): number | null {
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  const [, tidRaw, expRaw, sig] = parts;
  const payload = `${parts[0]}.${tidRaw}.${expRaw}`;
  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(payload).digest("hex"),
    "hex",
  );
  const actual = Buffer.from(sig, "hex");
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  const exp = Number(expRaw);
  const tid = Number(tidRaw);
  if (!Number.isSafeInteger(exp) || exp < nowSeconds) return null;
  if (!Number.isSafeInteger(tid) || tid < 0) return null;
  return tid;
}

export interface AuthModeConfig {
  hasBotToken: boolean;
  allowedTeacherId: number | null;
  previewAllowed: boolean;
}

/**
 * تطبیق هویت نشست با «حالت احراز هویتِ فعلی» (قانون F2):
 * - حالت واقعی (توکن بات): فقط tid برابر شناسه‌ی مجاز فعلی → کوکی پیش‌نمایش
 *   و کوکی استادِ سابق رد می‌شوند.
 * - بدون توکن بات: فقط نشست پیش‌نمایش (tid=0) و فقط اگر مجاز است.
 */
export function sessionIdentityMatchesMode(teacherId: number, config: AuthModeConfig): boolean {
  if (config.hasBotToken) {
    return config.allowedTeacherId !== null && teacherId === config.allowedTeacherId;
  }
  return teacherId === PREVIEW_TEACHER_ID && config.previewAllowed;
}
