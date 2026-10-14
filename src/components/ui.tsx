"use client";

import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/* ── کلاس‌های پایه‌ی فرم (منبع واحد برای همه‌ی فرم‌ها) ── */
export const inputCls =
  "w-full rounded-xl border border-jade-100 bg-cream-50 px-3.5 py-2.5 text-sm text-jade-950 placeholder:text-jade-950/35 shadow-[inset_0_1px_2px_rgba(24,62,58,0.05)] focus:border-gold-500 focus:outline-none transition-colors";

export const labelCls = "mb-1.5 block text-[13px] font-medium text-jade-800";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelCls}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-wine-700">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] leading-5 text-jade-950/45">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input(props, ref) {
  return <input ref={ref} {...props} className={`${inputCls} ${props.className ?? ""}`} />;
});

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={`${inputCls} resize-none ${props.className ?? ""}`} />;
}

/** دکمه‌ی ارسال فرم با حالت pending (useFormStatus) — جلوی ثبت تکراری را می‌گیرد. */
export function SubmitButton({
  children,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "gold" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();
  const styles =
    variant === "primary"
      ? "bg-jade-900 text-cream-100 hover:bg-jade-800 shadow-[0_6px_18px_rgba(24,62,58,0.25)]"
      : variant === "gold"
        ? "bg-gold-500 text-jade-950 hover:bg-gold-400 shadow-[0_6px_18px_rgba(182,138,81,0.35)]"
        : "bg-transparent text-jade-700 border border-jade-100 hover:bg-jade-50";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all disabled:opacity-60 ${styles} ${className}`}
    >
      {pending ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

/** دکمه‌ی اکشن سریع خارج از فرم، با pending محلی. */
export function ActionButton({
  onClick,
  pending,
  children,
  tone = "neutral",
  className = "",
  title,
}: {
  onClick: () => void;
  pending?: boolean;
  children: ReactNode;
  tone?: "neutral" | "present" | "absent" | "gold";
  className?: string;
  title?: string;
}) {
  const tones = {
    neutral: "border-jade-100 bg-cream-50 text-jade-800 hover:bg-jade-50",
    present: "border-transparent bg-jade-900 text-cream-100 shadow-sm",
    absent: "border-transparent bg-wine-700 text-cream-100 shadow-sm",
    gold: "border-transparent bg-gold-500 text-jade-950 shadow-sm",
  } as const;
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={pending}
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all disabled:opacity-50 ${tones[tone]} ${className}`}
    >
      {pending ? <Loader2 size={13} className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "jade",
  className = "",
}: {
  children: ReactNode;
  tone?: "jade" | "gold" | "wine" | "muted";
  className?: string;
}) {
  const tones = {
    jade: "bg-jade-50 text-jade-700 ring-jade-100",
    gold: "bg-gold-100 text-gold-700 ring-gold-200",
    wine: "bg-wine-100 text-wine-700 ring-wine-300/60",
    muted: "bg-cream-300/60 text-jade-950/55 ring-cream-300",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-cream-300/70 bg-cream-50/90 p-4 shadow-[0_10px_30px_rgba(24,62,58,0.07)] backdrop-blur-sm ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-display text-xl text-jade-900 mb-3">
      {children}
    </h2>
  );
}

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-jade-50 text-jade-400 [&>svg]:size-6" aria-hidden>
        {icon}
      </span>
      <p className="text-sm font-bold text-jade-800">{title}</p>
      {hint ? <p className="max-w-56 text-xs leading-5 text-jade-950/45">{hint}</p> : null}
    </div>
  );
}
