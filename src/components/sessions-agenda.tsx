"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { faNum } from "@/lib/datetime";
import { AlarmClockCheck, CalendarClock, Repeat2, Sparkles, ChevronLeft } from "lucide-react";
import { Badge, Card, EmptyState, SectionTitle } from "./ui";
import { LessonRow, type LessonView } from "./lesson-row";

export interface SessionRow {
  studentId: number;
  studentName: string;
  lesson: LessonView;
}

export interface SessionExtraRow {
  id: number;
  studentId: number;
  studentName: string;
  label: string;
  overdue: boolean;
}

type SectionKey = "overdue" | "upcoming" | "followups" | "extras";

/**
 * دستورکار جلسات — با برگه‌های سبک برای تمرکز روی یک بخش در هر لحظه.
 * منطق حضور/پیگیری از LessonRow مشترک با پروفایل می‌آید (بدون تکرار منطق).
 */
export function SessionsAgenda({
  overdue,
  upcoming,
  followups,
  extras,
  upcomingHiddenCount,
}: {
  overdue: SessionRow[];
  upcoming: SessionRow[];
  followups: SessionRow[];
  extras: SessionExtraRow[];
  /** تعداد جلسات پیشِ روی بیشتر از حد نمایش (۴۰) که نمایش داده نشده‌اند */
  upcomingHiddenCount: number;
}) {
  const counts: Record<SectionKey, number> = {
    overdue: overdue.length,
    upcoming: upcoming.length,
    followups: followups.length,
    extras: extras.length,
  };
  const firstNonEmpty: SectionKey = overdue.length
    ? "overdue"
    : upcoming.length
      ? "upcoming"
      : followups.length
        ? "followups"
        : "extras";
  const [tab, setTab] = useState<SectionKey>(firstNonEmpty);

  const tabs: { key: SectionKey; label: string; icon: ReactNode }[] = [
    { key: "overdue", label: "نیازمند ثبت", icon: <AlarmClockCheck size={13} aria-hidden /> },
    { key: "upcoming", label: "پیشِ رو", icon: <CalendarClock size={13} aria-hidden /> },
    { key: "followups", label: "پیگیری‌ها", icon: <Repeat2 size={13} aria-hidden /> },
    { key: "extras", label: "جلسات اضافه", icon: <Sparkles size={13} aria-hidden /> },
  ];

  return (
    <div>
      <div role="tablist" aria-label="بخش‌های جلسات" className="mb-4 grid grid-cols-4 gap-1.5 rounded-2xl border border-cream-300/80 bg-cream-100/80 p-1.5">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-bold transition ${
              tab === key ? "bg-jade-900 text-cream-100 shadow-[0_4px_12px_rgba(24,62,58,0.25)]" : "text-jade-950/50 hover:bg-cream-50"
            }`}
          >
            <span className="flex items-center gap-1">
              {icon}
              {label}
            </span>
            <span className={tab === key ? "text-gold-300" : "text-jade-950/35"}>{faNum(counts[key])}</span>
          </button>
        ))}
      </div>

      <section role="tabpanel" aria-label={tabs.find((t) => t.key === tab)?.label}>
        {tab === "overdue" ? (
          overdue.length === 0 ? (
            <Card><EmptyState icon={<AlarmClockCheck />} title="چیزی ثبت‌نشده نمانده است" /></Card>
          ) : (
            <>
              <p className="mb-2 text-[11px] font-bold text-wine-700">این جلسات گذشته‌اند و هنوز حضورشان ثبت نشده:</p>
              <SessionList rows={overdue} />
            </>
          )
        ) : null}

        {tab === "upcoming" ? (
          upcoming.length === 0 ? (
            <Card><EmptyState icon={<CalendarClock />} title="جلسه‌ی آینده‌ای وجود ندارد" hint="با ساخت ترم جدید، جلسات هفتگی خودکار برنامه‌ریزی می‌شوند." /></Card>
          ) : (
            <>
              <SessionList rows={upcoming} />
              {upcomingHiddenCount > 0 ? (
                <p className="mt-3 rounded-xl bg-gold-100/70 px-3 py-2 text-center text-[11px] font-bold text-gold-700">
                  نمایش محدود به {faNum(40)} مورد است — {faNum(upcomingHiddenCount)} جلسه‌ی دیگر در پروفایل شاگردان در دسترس است.
                </p>
              ) : null}
            </>
          )
        ) : null}

        {tab === "followups" ? (
          followups.length === 0 ? (
            <Card><EmptyState icon={<Repeat2 />} title="پیگیری بازی وجود ندارد" hint="وقتی برای غیبتی ویدیو درخواست شود یا جبرانی در انتظار بماند، اینجا دیده می‌شود." /></Card>
          ) : (
            <>
              <p className="mb-2 text-[11px] font-bold text-gold-700">غیبت‌هایی که منتظر ویدیو یا جبرانی‌اند:</p>
              <SessionList rows={followups} />
            </>
          )
        ) : null}

        {tab === "extras" ? (
          extras.length === 0 ? (
            <Card><EmptyState icon={<Sparkles />} title="جلسه‌ی اضافه‌ی برنامه‌ریزی‌شده‌ای نیست" hint="جلسات اضافه از پروفایل هر شاگرد ثبت می‌شوند." /></Card>
          ) : (
            <ul className="space-y-2">
              {extras.map((ex) => (
                <li key={ex.id}>
                  <Link
                    href={`/students/${ex.studentId}`}
                    className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                      ex.overdue ? "border-wine-300/60 bg-wine-100/30" : "border-cream-300/80 bg-cream-50/95 hover:border-jade-200"
                    }`}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold-500/20 text-gold-700">
                      <Sparkles size={15} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-jade-900">{ex.studentName}</span>
                      <span className="mt-0.5 block text-[11px] text-jade-950/50">{ex.label}</span>
                    </span>
                    {ex.overdue ? <Badge tone="wine">گذشته</Badge> : null}
                    <ChevronLeft size={14} className="shrink-0 text-jade-950/25" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </section>
    </div>
  );
}

function SessionList({ rows }: { rows: SessionRow[] }) {
  return (
    <ul className="space-y-2.5">
      {rows.map(({ lesson, studentName }) => (
        <li key={lesson.id}>
          <LessonRow lesson={lesson} title={studentName} />
        </li>
      ))}
    </ul>
  );
}
