/**
 * ابزارهای تاریخ و نمایش فارسی — بدون وابستگی خارجی.
 *
 * - ذخیره‌سازی تاریخ‌ها در دیتابیس: رشته‌ای ISO میلادی ("YYYY-MM-DD"، ستون‌های date).
 * - نمایش: همیشه جلالی با اعداد فارسی از Intl داخلی Node/مرورگر (تأیید شده روی Node 22).
 * - «امروز» و منطق یادآوری‌ها با منطقه‌ی زمانی آسیا/تهران محاسبه می‌شود تا نیمه‌شب UTC
 *   برای استاد در ایران روز اشتباه نشان ندهد.
 * - تمام نمایش‌ها سمت سرور تعیینی‌اند؛ آب‌رسانی (hydration) با HTML سرور سازگار می‌ماند.
 */

export const TEHRAN_TZ = "Asia/Tehran";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** نام روزهای هفته به ترتیب هفته‌ی ایرانی؛ ایندکس ۰ = شنبه. */
export const DAY_NAMES_FA = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"] as const;

/** تبدیل getDay جاوااسکریپت (۰=یکشنبه) به ایندکس هفته‌ی ایرانی (۰=شنبه). */
export function toPersianDayIndex(jsDay: number): number {
  return (jsDay + 1) % 7;
}

export interface IsoParts { y: number; m: number; d: number }

export function parseIso(iso: string): IsoParts {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

export function toIso({ y, m, d }: IsoParts): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function partsToLocalDate(p: IsoParts): Date {
  return new Date(p.y, p.m - 1, p.d);
}

/** تاریخ امروز به وقت تهران، ISO میلادی. */
export function todayISO(): string {
  // en-CA خروجی YYYY-MM-DD می‌دهد
  return new Intl.DateTimeFormat("en-CA", { timeZone: TEHRAN_TZ }).format(new Date());
}

export function addDays(iso: string, days: number): string {
  const date = partsToLocalDate(parseIso(iso));
  date.setDate(date.getDate() + days);
  return toIso({ y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() });
}

/** افزودن ماه تقویمی با گیره‌گذاری آخر ماه (مثل ۳۱ ژانویه → ۲۸/۲۹ فوریه). */
export function addMonthsClamped(iso: string, months: number): string {
  const { y, m, d } = parseIso(iso);
  const target = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  return toIso({ y: target.getFullYear(), m: target.getMonth() + 1, d: target.getDate() });
}

/** اختلاف روز b − a (میلادی/ISO). مثبت یعنی b بعد از a است. */
export function diffDays(a: string, b: string): number {
  const ms = partsToLocalDate(parseIso(b)).getTime() - partsToLocalDate(parseIso(a)).getTime();
  return Math.round(ms / 86400000);
}

/** ایندکس روز هفته‌ی ایرانی برای تاریخ ISO. */
export function persianDayIndexOf(iso: string): number {
  return toPersianDayIndex(partsToLocalDate(parseIso(iso)).getDay());
}

/**
 * تاریخ چهار جلسه‌ی هفتگی ترم: اولین روزِ هدف در تاریخ شروع یا بعد از آن، سپس هفتگی.
 * قانون کسب‌وکار: هر ترم دقیقاً ۴ جلسه‌ی منظم دارد.
 */
export function weeklyLessonDates(startIso: string, persianDay: number, count = 4): string[] {
  const dates: string[] = [];
  let cursor = startIso;
  const shift = (persianDay - persianDayIndexOf(startIso) + 7) % 7;
  cursor = addDays(startIso, shift);
  for (let i = 0; i < count; i++) {
    dates.push(cursor);
    cursor = addDays(cursor, 7);
  }
  return dates;
}

/* ─────────────────────────── نمایش فارسی ─────────────────────────── */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** تبدیل همه‌ی ارقام لاتین/عربی رشته به ارقام فارسی. */
export function faDigits(input: string | number): string {
  return String(input).replace(/[0-9٠-٩]/g, (ch) => {
    if (ch >= "0" && ch <= "9") return FA_DIGITS[Number(ch)];
    return FA_DIGITS[AR_DIGITS.indexOf(ch)];
  });
}

/** نرمال‌سازی ارقام فارسی/عربی ورودی کاربر به لاتین برای اعتبارسنجی. */
export function normalizeDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (ch) => String(FA_DIGITS.indexOf(ch)))
    .replace(/[٠-٩]/g, (ch) => String(AR_DIGITS.indexOf(ch)));
}

const numFa = new Intl.NumberFormat("fa-IR");

export function faNum(n: number): string {
  return numFa.format(n);
}

/** مبلغ به تومان با جداکننده و واحد؛ null یعنی «نامشخص». */
export function faMoney(amount: number | null): string {
  if (amount === null || amount === undefined) return "نامشخص";
  return `${numFa.format(amount)} تومان`;
}

interface FaDateOpts {
  weekday?: boolean;
  year?: boolean;
  short?: boolean;
}

/** نمایش جلالی تعیینی با Timezone تهران (ایمن در برابر TZ سرور/مرورگر). */
export function faDate(iso: string, opts: FaDateOpts = {}): string {
  const { y, m, d } = parseIso(iso);
  const at = Date.UTC(y, m - 1, d, 12, 0, 0);
  const parts: Intl.DateTimeFormatOptions = {
    timeZone: TEHRAN_TZ,
    day: "numeric",
    month: opts.short ? "short" : "long",
  };
  if (opts.year) parts.year = "numeric";
  if (opts.weekday) parts.weekday = "long";
  return new Intl.DateTimeFormat("fa-IR", parts).format(at);
}

/** نام روز هفته‌ی فارسی برای تاریخ ISO. */
export function faWeekday(iso: string): string {
  return DAY_NAMES_FA[persianDayIndexOf(iso)];
}

/** ساعت "HH:MM" با ارقام فارسی. */
export function faTime(hhmm: string): string {
  return faDigits(hhmm);
}
