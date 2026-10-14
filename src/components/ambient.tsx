import { Music4, Music2, Star, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

/**
 * عناصر تزئینی سبک — فقط SVG/CSS، aria-hidden، بدون efekt سنگین و بدون کتابخانه‌ی انیمیشن.
 * انیمیشن‌ها فقط روی transform/opacity و با motion-safe اعمال می‌شوند؛
 * prefers-reduced-motion در globals.css همه را متوقف می‌کند.
 */

/** نگاره‌ی خطیِ سه‌تار (کاسه‌ی گلابی + دسته‌ی کشیده + سیم‌ها و بندهای دسته). */
export function SetarArt({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 264"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* کاسه */}
      <path d="M100 176 C72 176 58 205 66 228 C74 251 94 258 100 258 C106 258 126 251 134 228 C142 205 128 176 100 176 Z" />
      {/* سوراخ صفحه */}
      <circle cx="100" cy="212" r="6.5" />
      {/* دسته */}
      <path d="M96.5 176 L96.5 46 M103.5 176 L103.5 46" />
      {/* بندهای دسته (دستان) */}
      <path d="M95 62 L105 62 M95 84 L105 84 M95 108 L105 108 M95 134 L105 134 M95 160 L105 160" strokeWidth="1.6" opacity="0.8" />
      {/* سر دسته */}
      <path d="M93 46 C93 30 92 20 97 12 C100 8 104 8 106 12 C108.5 20 107 32 107 46" />
      {/* گوشی‌ها */}
      <circle cx="90" cy="18" r="2.6" />
      <circle cx="111" cy="24" r="2.6" />
      <circle cx="90" cy="32" r="2.6" />
      <circle cx="111" cy="38" r="2.6" />
      {/* سیم‌ها */}
      <path d="M99 12 L98.4 244 M100.8 12 L101.6 244" strokeWidth="1.1" opacity="0.85" />
      {/* خرک */}
      <path d="M93 244 L107 244" />
    </svg>
  );
}

/** نُت‌های شناور و ستاره‌های ریز — فقط برای هیرو/صفحه‌ی ورود، نه فرم‌ها. */
export function FloatingNotes({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <Music4 size={22} className="motion-safe:animate-note-float absolute top-[18%] right-[12%] text-gold-300/70" />
      <Music2 size={16} className="motion-safe:animate-note-float-slow absolute top-[58%] right-[30%] text-gold-400/50" style={{ animationDelay: "-4s" }} />
      <Music4 size={14} className="motion-safe:animate-note-float absolute bottom-[14%] right-[8%] text-jade-100/40" style={{ animationDelay: "-7s" }} />
      <Music2 size={18} className="motion-safe:animate-note-float-slow absolute top-[30%] left-[16%] text-gold-300/45" style={{ animationDelay: "-2s" }} />
      <Star size={10} className="motion-safe:animate-star-twinkle absolute top-[12%] left-[38%] text-cream-100/50" />
      <Star size={8} className="motion-safe:animate-star-twinkle absolute bottom-[24%] left-[8%] text-gold-300/60" style={{ animationDelay: "-1.6s" }} />
      <Sparkles size={12} className="motion-safe:animate-star-twinkle absolute top-[70%] left-[40%] text-cream-100/35" style={{ animationDelay: "-3s" }} />
    </div>
  );
}

/** سربرگ یکدست صفحات: عنوان نمایشی + خط سیم تزئینی. */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] leading-snug text-jade-900">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-xs leading-5 text-jade-950/50">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="string-divider mt-3" aria-hidden="true" />
    </header>
  );
}
