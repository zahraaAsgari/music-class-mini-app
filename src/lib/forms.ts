import { z } from "zod";
import { normalizeDigits } from "./datetime";

/**
 * پایه‌ی مشترک Server Actionها: وضعیت فرم، اسکیماهای zod و پیام‌های فارسی.
 * تمام ورودی‌های بیرونی در سرور با zod اعتبارسنجی زمان‌اجرا می‌شوند —
 * تایپ TypeScript به‌تنهایی ورودی HTTP را معتبر نمی‌کند.
 */

export interface FormState {
  ok?: boolean;
  /** خطای کلی (مثل نبود نشست یا خطای سرور) */
  error?: string;
  /** خطاهای فیلدبه‌فیلد برای نمایش زیر هر ورودی */
  fieldErrors?: Record<string, string>;
  /** پس از موفقیت برای هدایت کلاینت */
  studentId?: number;
}

export const INVALID_SESSION: FormState = { error: "نشست معتبر نیست؛ لطفاً دوباره وارد شوید." };

/** تبدیل خطای zod به نگاشت فیلد→اولین پیام فارسی. */
export function zodFieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(iso: string): boolean {
  if (!ISO_DATE_RE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** تاریخ ISO میلادی از input[type=date] — ذخیره‌سازی دیتابیس میلادی است. */
export const isoDateSchema = z
  .string({ error: "تاریخ الزامی است." })
  .refine(isRealDate, { message: "تاریخ معتبر نیست (قالب میلادی)." });

/** ساعت "HH:MM". */
export const timeSchema = z
  .string({ error: "ساعت الزامی است." })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "ساعت معتبر نیست.");

/** مبلغ تومان اختیاری: ارقام فارسی هم پذیرفته می‌شود؛ خالی → null. */
export function optionalMoneySchema(label: string) {
  return z.preprocess(
    (v) => {
      if (v === null || v === undefined) return null;
      const s = normalizeDigits(String(v)).replace(/[٬,\s]/g, "");
      if (s === "") return null;
      return Number(s);
    },
    z
      .number({ error: `${label} باید عدد باشد.` })
      .int(`${label} باید عدد صحیح باشد.`)
      .min(0, `${label} نمی‌تواند منفی باشد.`)
      .max(1_000_000_000, `${label} نامعقول است.`)
      .nullable(),
  );
}

/** عدد صحیح کوچک (مثل شناسه‌ها و روز هفته) با تحمل ارقام فارسی. */
export function intSchema(label: string, min: number, max: number) {
  return z.preprocess(
    (v) => {
      const s = normalizeDigits(String(v ?? "")).trim();
      return s === "" ? NaN : Number(s);
    },
    z
      .number({ error: `${label} نامعتبر است.` })
      .int(`${label} نامعتبر است.`)
      .min(min, `${label} نامعتبر است.`)
      .max(max, `${label} نامعتبر است.`),
  );
}

/** مدت جلسه: فقط ۳۰ یا ۶۰ دقیقه — قانون ثابت کسب‌وکار. */
export const durationSchema = z.preprocess(
  (v) => {
    const s = normalizeDigits(String(v ?? "")).trim();
    return s === "" ? NaN : Number(s);
  },
  z.union([z.literal(30), z.literal(60)], { error: "مدت جلسه باید ۳۰ یا ۶۰ دقیقه باشد." }),
);

/** شناسه‌ی عددی مثبت. */
export function idSchema(label: string) {
  return intSchema(label, 1, 1_000_000_000);
}

/** رشته‌ی اختیاری که خالی را به null تبدیل می‌کند. */
export function optionalText(max: number, message: string) {
  return z.preprocess(
    (v) => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      return s === "" ? null : s;
    },
    z.string().max(max, message).nullable(),
  );
}

/** خواندن امن FormData به رکورد رشته‌ای برای zod. */
export function formRecord(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}
