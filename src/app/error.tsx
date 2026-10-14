"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

/** مرز خطای سرتاسری: به‌جای صفحه‌ی سفید، پیام امن + تلاش مجدد. جزئیات سرور لو نمی‌رود. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-cream-200 px-6">
      <div className="w-full max-w-85 rounded-[2rem] border border-cream-300 bg-cream-50 p-8 text-center shadow-[0_20px_50px_rgba(24,62,58,0.12)]">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-wine-100 text-wine-700">
          <AlertCircle size={24} aria-hidden />
        </span>
        <h1 className="font-display mt-4 text-2xl text-jade-900">مشکلی پیش آمد</h1>
        <p className="mt-2 text-xs leading-6 text-jade-950/55">
          خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید؛ اطلاعات شما امن است.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-jade-900 px-5 py-2.5 text-sm font-bold text-cream-100 transition hover:bg-jade-800"
        >
          <RotateCcw size={15} aria-hidden />
          تلاش دوباره
        </button>
      </div>
    </main>
  );
}
