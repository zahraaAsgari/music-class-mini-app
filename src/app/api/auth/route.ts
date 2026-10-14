import { NextResponse } from "next/server";
import { validateTelegramInitData } from "@/lib/telegram";
import {
  PREVIEW_TEACHER_ID,
  allowedTeacherTelegramId,
  isPreviewAuthAllowed,
  sessionSigningConfigured,
  setSessionCookie,
  telegramBotToken,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * تنها مسیر صدور نشست:
 * ۱) حالت واقعی — initData تلگرام باید با توکن بات معتبر باشد و شناسه‌ی کاربر
 *    دقیقاً با TEACHER_TELEGRAM_ID برابر باشد. بدون TEACHER_TELEGRAM_ID → fail-closed.
 * ۲) حالت پیش‌نمایش — فقط وقتی توکن تنظیم نشده و ALLOW_DEMO_AUTH=true باشد.
 * هویتِ ادعاشده از سمت کلاینت هرگز بدون راستی‌آزمایی پذیرفته نمی‌شود.
 */
export async function POST(req: Request) {
  let body: { initData?: unknown; preview?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "بدنه‌ی درخواست نامعتبر است." }, { status: 400 });
  }

  const botToken = telegramBotToken();

  if (botToken) {
    const teacherId = allowedTeacherTelegramId();
    if (!teacherId) {
      return NextResponse.json(
        { message: "پیکربندی سرور ناقص است: TEACHER_TELEGRAM_ID تنظیم نشده." },
        { status: 503 },
      );
    }
    const initData = typeof body.initData === "string" ? body.initData : "";
    const maxAge = Number(process.env.TELEGRAM_AUTH_MAX_AGE ?? "86400");
    const parsed = initData ? validateTelegramInitData(initData, botToken, maxAge) : null;
    if (!parsed) {
      return NextResponse.json({ message: "اعتبارسنجی تلگرام ناموفق بود." }, { status: 401 });
    }
    if (parsed.user.id !== teacherId) {
      return NextResponse.json({ message: "این برنامه فقط در اختیار استاد است." }, { status: 403 });
    }
    await setSessionCookie(parsed.user.id);
    return NextResponse.json({ ok: true, mode: "telegram" });
  }

  if (isPreviewAuthAllowed() && body.preview === true) {
    // تولید بدون SESSION_SECRET (و بدون توکن بات) → fail-closed به‌جای کلید ساختگی
    if (!sessionSigningConfigured()) {
      return NextResponse.json(
        { message: "پیکربندی سرور ناقص است: SESSION_SECRET تنظیم نشده." },
        { status: 503 },
      );
    }
    await setSessionCookie(PREVIEW_TEACHER_ID);
    return NextResponse.json({ ok: true, mode: "preview" });
  }

  return NextResponse.json({ message: "داده‌های تلگرام یافت نشد." }, { status: 401 });
}
