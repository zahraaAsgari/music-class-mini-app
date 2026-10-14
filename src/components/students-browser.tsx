"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Phone, MapPin, ChevronLeft } from "lucide-react";
import { normalizeDigits } from "@/lib/datetime";

export interface StudentListItem {
  id: number;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  scheduleLabel: string;
  locationLabel: string | null;
  remainingLabel: string;
  hasActiveTerm: boolean;
}

/** فهرست شاگردان با جست‌وجوی محلی (حجم داده‌ی تک‌استاد کوچک است؛ جست‌وجوی سروری لازم نیست). */
export function StudentsBrowser({ items }: { items: StudentListItem[] }) {
  const [query, setQuery] = useState("");
  const q = normalizeDigits(query.trim()).toLowerCase();

  const filtered = q
    ? items.filter(
        (i) =>
          i.fullName.toLowerCase().includes(q) ||
          (i.phone ? normalizeDigits(i.phone).includes(q) : false),
      )
    : items;

  return (
    <div>
      <div className="relative mb-3">
        <Search size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-jade-950/35" aria-hidden />
        <label htmlFor="student-search" className="sr-only">جست‌وجوی شاگرد</label>
        <input
          id="student-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جست‌وجو بر اساس نام یا شماره تماس…"
          className="w-full rounded-2xl border border-cream-300 bg-cream-50 py-3 pr-10 pl-4 text-sm text-jade-950 placeholder:text-jade-950/35 shadow-[0_4px_14px_rgba(24,62,58,0.05)] focus:border-gold-500 focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-xs text-jade-950/45">شاگردی با این مشخصات پیدا نشد.</p>
      ) : (
        <ul className="space-y-2.5">
          {filtered.map((s) => (
            <li key={s.id}>
              <Link
                href={`/students/${s.id}`}
                className={`flex items-center gap-3 rounded-2xl border p-3.5 shadow-[0_6px_18px_rgba(24,62,58,0.06)] transition hover:border-jade-200 ${
                  s.isActive ? "border-cream-300/80 bg-cream-50/95" : "border-cream-300/60 bg-cream-300/30"
                }`}
              >
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-2xl font-display text-lg ${
                    s.isActive ? "bg-jade-900 text-gold-300" : "bg-jade-200/60 text-jade-700/70"
                  }`}
                  aria-hidden
                >
                  {s.fullName.trim().charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-sm font-bold ${s.isActive ? "text-jade-900" : "text-jade-950/50"}`}>
                      {s.fullName}
                    </span>
                    {!s.isActive ? (
                      <span className="rounded-full bg-cream-300 px-2 py-0.5 text-[9px] font-bold text-jade-950/45">غیرفعال</span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-[11px] leading-4 text-jade-950/50">{s.scheduleLabel}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-jade-950/40">
                    {s.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={10} aria-hidden />
                        {s.phone}
                      </span>
                    ) : null}
                    {s.locationLabel ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={10} aria-hidden />
                        {s.locationLabel}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      s.hasActiveTerm
                        ? "bg-jade-50 text-jade-700"
                        : s.remainingLabel === "شهریه پرداخت نشده"
                          ? "bg-wine-100 text-wine-700"
                          : "bg-gold-100 text-gold-700"
                    }`}
                  >
                    {s.remainingLabel}
                  </span>
                  <ChevronLeft size={13} className="text-jade-950/20" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
