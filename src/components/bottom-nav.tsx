"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Users, CalendarDays, SlidersHorizontal } from "lucide-react";

/**
 * ناوبری اصلی چهاربخشی (خانه، شاگردان، جلسات، تنظیمات) — حداقلی و بدون تب اضافه.
 * جلسات اضافه عمداً در پروفایل شاگرد قرار دارند، نه اینجا.
 */
const ITEMS = [
  { href: "/", label: "خانه", Icon: House, exact: true },
  { href: "/students", label: "شاگردان", Icon: Users, exact: false },
  { href: "/sessions", label: "جلسات", Icon: CalendarDays, exact: false },
  { href: "/settings", label: "تنظیمات", Icon: SlidersHorizontal, exact: false },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="ناوبری اصلی"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-300/80 bg-cream-50/90 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-1.5 backdrop-blur-md"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {ITEMS.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group mx-auto flex max-w-24 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 transition-colors ${
                  active ? "text-jade-900" : "text-jade-950/40 hover:text-jade-700"
                }`}
              >
                <span
                  className={`grid size-9 place-items-center rounded-2xl transition-all ${
                    active
                      ? "bg-jade-900 text-gold-300 shadow-[0_6px_14px_rgba(24,62,58,0.3)]"
                      : "text-current group-hover:bg-jade-50"
                  }`}
                >
                  <Icon size={19} strokeWidth={active ? 2.4 : 2} aria-hidden />
                </span>
                <span className={`text-[11px] ${active ? "font-bold" : "font-medium"}`}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
