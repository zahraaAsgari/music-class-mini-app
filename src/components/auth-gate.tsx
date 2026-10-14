"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, RefreshCw, LogIn, Music3 } from "lucide-react";
import { SetarArt, FloatingNotes } from "./ambient";

/**
 * دروازه‌ی ورود: تنها بخش کلاینتی که با Telegram WebApp SDK حرف می‌زند.
 * - وقتی داخل تلگرام باز شده: initData را به /api/auth می‌فرستد (امضا فقط سمت سرور بررسی می‌شود).
 * - خارج از تلگرام: در حالت پیش‌نمایش (ALLOW_DEMO_AUTH) دکمه‌ی ورود آزمایشی نمایش داده می‌شود؛
 *   در غیر این صورت فقط راهنما نشان می‌دهد و هیچ داده‌ای رندر نمی‌شود.
 */
type GateState = "boot" | "authing" | "failed" | "no-telegram";

interface TgWebApp {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export function AuthGate({ allowPreview }: { allowPreview: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<GateState>("boot");
  const [message, setMessage] = useState("");

  async function login(payload: { initData?: string; preview?: boolean }) {
    setState("authing");
    setMessage("");
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setMessage(data.message ?? "خطای ناشناخته در ورود.");
        setState("failed");
        return;
      }
      router.refresh();
    } catch {
      setMessage("اتصال برقرار نشد. اینترنت خود را بررسی کنید.");
      setState("failed");
    }
  }

  useEffect(() => {
    // اجرای یک‌باره پس از mount: تلاش برای خواندن initData از SDK تلگرام.
    // SDK با استراتژی afterInteractive لود می‌شود؛ کمی صبر می‌کنیم.
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts++;
      const tg = window.Telegram?.WebApp;
      if (tg) {
        window.clearInterval(timer);
        tg.ready?.();
        tg.expand?.();
        if (tg.initData) {
          void login({ initData: tg.initData });
        } else {
          setState("no-telegram");
        }
      } else if (attempts >= 10) {
        window.clearInterval(timer);
        setState("no-telegram");
      }
    }, 250);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const busy = state === "boot" || state === "authing";

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-jade-900 px-6">
      {/* تزئینات هیرو ورود */}
      <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-jade-700/50 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-32 -right-16 size-80 rounded-full bg-gold-500/15 blur-3xl" aria-hidden />
      <FloatingNotes />
      <SetarArt className="pointer-events-none absolute -right-12 bottom-6 w-44 text-gold-500/15 rotate-[-14deg]" aria-hidden />

      <div className="relative w-full max-w-85 rounded-[2rem] border border-jade-400/20 bg-jade-800/70 p-7 text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <SetarArt className="mx-auto w-24 text-gold-400 drop-shadow-[0_4px_16px_rgba(182,138,81,0.35)]" />
        <h1 className="font-display mt-3 text-4xl text-cream-100">دفتر سه‌تار</h1>
        <p className="mt-1.5 flex items-center justify-center gap-1.5 text-xs text-jade-100/65">
          <Music3 size={13} aria-hidden />
          دفترچه‌ی مدیریت کلاس استاد
        </p>
        <div className="string-divider mx-auto mt-4 w-28 opacity-70" aria-hidden />

        {busy ? (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-cream-100/85">
            <RefreshCw size={15} className="animate-spin" aria-hidden />
            در حال ورود امن…
          </p>
        ) : null}

        {state === "failed" ? (
          <div className="mt-6 space-y-3">
            <p className="flex items-center justify-center gap-1.5 text-xs leading-5 text-wine-100">
              <ShieldAlert size={14} className="shrink-0 text-wine-300" aria-hidden />
              {message || "ورود ناموفق بود."}
            </p>
            <button
              type="button"
              onClick={() => {
                setState("boot");
                window.location.reload();
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 text-sm font-bold text-jade-950 transition hover:bg-gold-400"
            >
              <RefreshCw size={14} aria-hidden />
              تلاش دوباره
            </button>
          </div>
        ) : null}

        {state === "no-telegram" ? (
          <div className="mt-6 space-y-3">
            <p className="text-xs leading-6 text-jade-100/75">
              این برنامه مخصوص استاد است و باید از داخل تلگرام باز شود.
            </p>
            {allowPreview ? (
              <button
                type="button"
                onClick={() => void login({ preview: true })}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold-500 px-4 py-2.5 text-sm font-bold text-jade-950 transition hover:bg-gold-400"
              >
                <LogIn size={15} aria-hidden />
                ورود به حالت پیش‌نمایش
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
