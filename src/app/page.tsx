import Link from "next/link";
import { eq, and, or, gte, lte, asc, desc, inArray } from "drizzle-orm";
import {
  Hourglass,
  AlertCircle,
  Video,
  Repeat2,
  Banknote,
  UserPlus,
  ChevronLeft,
  Users,
  CalendarCheck2,
  Clock3,
  MapPin,
} from "lucide-react";
import { db } from "@/db";
import { lessons, students, terms } from "@/db/schema";
import { requireTeacher, isPreviewAuthAllowed } from "@/lib/auth";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/app-shell";
import { SetarArt, FloatingNotes } from "@/components/ambient";
import { Badge, Card, EmptyState, SectionTitle } from "@/components/ui";
import {
  addDays,
  diffDays,
  faDate,
  faNum,
  faTime,
  faWeekday,
  todayISO,
} from "@/lib/datetime";

export const dynamic = "force-dynamic";

/**
 * خانه: تمرکز بر کارهای پیشِ رو و یادآوری‌های قابل‌اقدام، نه آمارهای نمایشی.
 * یادآوری‌ها «محاسباتی‌اند» (از روی داده‌ی واقعی هنگام رندر) — اعلان زمان‌دار
 * نیازمند تأیید دامنه و زیرساخت cron است و در MVP پیاده نشده است.
 */
export default async function HomePage() {
  const session = await requireTeacher();
  if (!session) return <AuthGate allowPreview={isPreviewAuthAllowed()} />;

  const today = todayISO();
  // F10: «این هفته» = امروز تا ۶ روز آینده (دقیقاً ۷ روز، دو سرِ بازه شامل)
  const weekEnd = addDays(today, 6);

  /* داده‌ی موردنیاز خانه (F4 — فیلترها در SQL، نه JS روی کل تاریخچه):
   * الف) همه‌ی شاگردان (نام‌ها + تفکیک فعال/غیرفعال) — جدول کوچک تک‌استاد.
   * ب) فقط «آخرین ترم» هر شاگرد فعال (DISTINCT ON) — منبع یادآوری‌های ترمی.
   * ج) جلساتِ فقط همان ترم‌های جاری — نه کل تاریخچه‌ی جلسات.
   * د) پیگیری‌های سرگردان غیبت در کل تاریخچه، ولی فیلترشده در SQL — یادآوری‌های
   *    حساس (ویدیو/جبرانی معوق، حتی متعلق به ترم‌های قدیمی) حذف نمی‌شوند.
   * هـ) جلسات برنامه‌ریزی‌شده‌ی امروز تا یک هفته — فیلتر/مرتب‌سازی/حد ۱۲ در SQL.
   */
  const allStudents = await db.select().from(students);
  const studentName = new Map(allStudents.map((s) => [s.id, s] as const));
  const activeStudents = allStudents.filter((s) => s.isActive);
  const activeIds = activeStudents.map((s) => s.id);

  const unresolvedFollowupsWhere = and(
    eq(lessons.status, "absent"),
    or(
      and(eq(lessons.videoRequested, true), eq(lessons.videoSent, false)),
      eq(lessons.makeupStatus, "pending"),
    ),
  );

  const [latestTerms, unresolvedFollowups, upcoming] = await Promise.all([
    activeIds.length > 0
      ? db
          .selectDistinctOn([terms.studentId])
          .from(terms)
          .where(inArray(terms.studentId, activeIds))
          .orderBy(asc(terms.studentId), desc(terms.startDate), desc(terms.id))
      : Promise.resolve([]),
    db
      .select({ id: lessons.id, videoSent: lessons.videoSent, makeupStatus: lessons.makeupStatus })
      .from(lessons)
      .where(unresolvedFollowupsWhere),
    db
      .select({
        id: lessons.id,
        scheduledDate: lessons.scheduledDate,
        lessonTime: lessons.lessonTime,
        studentId: terms.studentId,
      })
      .from(lessons)
      .innerJoin(terms, eq(lessons.termId, terms.id))
      .where(
        and(
          eq(lessons.status, "scheduled"),
          gte(lessons.scheduledDate, today),
          lte(lessons.scheduledDate, weekEnd),
        ),
      )
      .orderBy(asc(lessons.scheduledDate), asc(lessons.lessonTime))
      .limit(12),
  ]);

  const latestTermIds = latestTerms.map((t) => t.id);
  const latestTermLessonRows =
    latestTermIds.length > 0
      ? await db
          .select({ termId: lessons.termId, status: lessons.status })
          .from(lessons)
          .where(inArray(lessons.termId, latestTermIds))
      : [];

  /** آخرین ترم هر شاگرد فعال (تاریخی‌بودن ترم‌های پیشین حفظ می‌شود؛ فقط جدیدترین «جاری» است). */
  const latestTerm = new Map(latestTerms.map((t) => [t.studentId, t] as const));

  const remainingByTerm = new Map<number, number>();
  for (const row of latestTermLessonRows) {
    if (row.status === "scheduled") {
      remainingByTerm.set(row.termId, (remainingByTerm.get(row.termId) ?? 0) + 1);
    }
  }

  /* ── یادآوری‌ها ───────────────────────────── */
  interface Reminder {
    key: string;
    icon: "expiry" | "oneLeft" | "video" | "makeup" | "unpaid";
    text: string;
    href: string;
    urgent: boolean;
  }
  const reminders: Reminder[] = [];

  for (const student of activeStudents) {
    const term = latestTerm.get(student.id);
    if (!term) continue;
    const remaining = remainingByTerm.get(term.id) ?? 0;
    const daysToExpiry = diffDays(today, term.expiryDate);

    if (daysToExpiry < 0 && remaining > 0) {
      reminders.push({
        key: `expired-${term.id}`,
        icon: "expiry",
        text: `اعتبار ترم ${student.fullName} سپری شده و ${faNum(remaining)} جلسه باقی مانده است`,
        href: `/students/${student.id}`,
        urgent: true,
      });
    } else if (daysToExpiry >= 0 && daysToExpiry <= 5) {
      reminders.push({
        key: `expiring-${term.id}`,
        icon: "expiry",
        text: `اعتبار ترم ${student.fullName} ${daysToExpiry === 0 ? "امروز" : `${faNum(daysToExpiry)} روز دیگر`} پایان می‌یابد`,
        href: `/students/${student.id}`,
        urgent: daysToExpiry <= 2,
      });
    }
    if (remaining === 1) {
      reminders.push({
        key: `oneleft-${term.id}`,
        icon: "oneLeft",
        text: `فقط یک جلسه از ترم ${student.fullName} باقی مانده است`,
        href: `/students/${student.id}`,
        urgent: false,
      });
    }
    if (!term.isPaid) {
      reminders.push({
        key: `unpaid-${term.id}`,
        icon: "unpaid",
        text: `شهریه‌ی ترم ${student.fullName} پرداخت نشده است`,
        href: `/students/${student.id}`,
        urgent: false,
      });
    }
  }

  const pendingVideoCount = unresolvedFollowups.filter((l) => !l.videoSent).length;
  const pendingMakeupCount = unresolvedFollowups.filter((l) => l.makeupStatus === "pending").length;

  if (pendingVideoCount > 0) {
    reminders.push({
      key: "videos",
      icon: "video",
      text: `${faNum(pendingVideoCount)} درخواست ویدیو در انتظار ارسال است`,
      href: "/sessions",
      urgent: false,
    });
  }
  if (pendingMakeupCount > 0) {
    reminders.push({
      key: "makeups",
      icon: "makeup",
      text: `${faNum(pendingMakeupCount)} جلسه‌ی جبرانی منتظر پیگیری است`,
      href: "/sessions",
      urgent: false,
    });
  }

  /* ── جلسات پیشِ رو (۷ روز آینده) — مرتب‌شده و محدودشده در SQL ── */
  const todayCount = upcoming.filter((l) => l.scheduledDate === today).length;
  const weekCount = upcoming.length;
  const unpaidCount = activeStudents.filter((s) => {
    const t = latestTerm.get(s.id);
    return t && !t.isPaid;
  }).length;

  const summaryLine =
    todayCount > 0
      ? `امروز ${faNum(todayCount)} جلسه و در این هفته مجموعاً ${faNum(weekCount)} جلسه در پیش دارید.`
      : weekCount > 0
        ? `امروز جلسه‌ای ندارید؛ تا یک هفته‌ی آینده ${faNum(weekCount)} جلسه در پیش است.`
        : "در هفته‌ی پیشِ رو جلسه‌ای ثبت نشده است.";

  const reminderIcon = (kind: Reminder["icon"], urgent: boolean) => {
    const cls = urgent ? "text-wine-700" : "text-gold-600";
    switch (kind) {
      case "expiry": return <Hourglass size={16} className={cls} aria-hidden />;
      case "oneLeft": return <AlertCircle size={16} className={cls} aria-hidden />;
      case "video": return <Video size={16} className={cls} aria-hidden />;
      case "makeup": return <Repeat2 size={16} className={cls} aria-hidden />;
      case "unpaid": return <Banknote size={16} className={cls} aria-hidden />;
    }
  };

  return (
    <AppShell>
      {/* هیرو: تنها جایی که تزئینات متحرک آزاد است */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-bl from-jade-700 via-jade-900 to-jade-950 p-6 pb-7 text-cream-100 shadow-[0_20px_50px_rgba(24,62,58,0.35)]">
        <FloatingNotes />
        <SetarArt className="pointer-events-none absolute -left-7 -bottom-3 w-36 rotate-[-12deg] text-gold-500/20" />
        <p className="relative text-[11px] font-bold tracking-wide text-gold-300">
          {faDate(today, { weekday: true, year: true })}
        </p>
        <h1 className="font-display relative mt-1.5 text-[32px] leading-tight">
          روزتان به‌خیر، استاد
        </h1>
        <p className="relative mt-2 max-w-60 text-[13px] leading-6 text-jade-100/80">{summaryLine}</p>
      </section>

      {/* شمارش‌های کاربردی */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[
          { label: "شاگردان فعال", value: activeStudents.length, Icon: Users, href: "/students" },
          { label: "جلسات این هفته", value: weekCount, Icon: CalendarCheck2, href: "/sessions" },
          { label: "شهریه‌ی معوق", value: unpaidCount, Icon: Banknote, href: "/students" },
        ].map(({ label, value, Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-2xl border border-cream-300/80 bg-cream-50/90 p-3 text-center shadow-[0_6px_18px_rgba(24,62,58,0.06)] transition hover:border-gold-300"
          >
            <Icon size={16} className="mx-auto text-jade-400" aria-hidden />
            <p className="font-display mt-1 text-2xl text-jade-900">{faNum(value)}</p>
            <p className="text-[10px] font-medium text-jade-950/50">{label}</p>
          </Link>
        ))}
      </div>

      {/* یادآوری‌ها */}
      <Card className="mt-4">
        <SectionTitle>یادآوری‌ها</SectionTitle>
        {reminders.length === 0 ? (
          <p className="py-2 text-xs leading-5 text-jade-950/50">فعلاً کاری در نوبت توجه نیست. 🎵</p>
        ) : (
          <ul className="divide-y divide-cream-300/70">
            {reminders.map((r) => (
              <li key={r.key}>
                <Link href={r.href} className="group flex items-center gap-3 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-cream-200/80">
                    {reminderIcon(r.icon, r.urgent)}
                  </span>
                  <span className={`flex-1 text-xs leading-5 ${r.urgent ? "font-bold text-wine-700" : "text-jade-900/85"}`}>
                    {r.text}
                  </span>
                  <ChevronLeft size={14} className="shrink-0 text-jade-950/25 transition group-hover:text-jade-700" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* جلسات پیشِ رو */}
      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle>جلسات پیشِ رو</SectionTitle>
          <Link href="/sessions" className="text-[11px] font-bold text-gold-600 hover:text-gold-700">
            همه‌ی جلسات
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck2 />}
            title="جلسه‌ای در پیش نیست"
            hint="با ساخت ترم جدید در پروفایل هر شاگرد، جلسات هفتگی خودکار ساخته می‌شوند."
          />
        ) : (
          <ul className="space-y-2">
            {upcoming.map((l) => {
              const st = studentName.get(l.studentId);
              if (!st) return null;
              const isToday = l.scheduledDate === today;
              return (
                <li key={l.id}>
                  <Link
                    href="/sessions"
                    className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                      isToday
                        ? "border-gold-400/70 bg-gold-100/40 shadow-[0_4px_14px_rgba(182,138,81,0.15)]"
                        : "border-cream-300/70 bg-cream-100/60 hover:border-jade-200"
                    }`}
                  >
                    <span className="grid w-14 shrink-0 place-items-center rounded-xl bg-jade-900 px-1.5 py-1.5 text-center text-cream-100">
                      <span className="text-[9px] font-bold text-gold-300">{faWeekday(l.scheduledDate)}</span>
                      <span className="text-[11px] font-bold leading-4">{faDate(l.scheduledDate, { short: true })}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-jade-900">{st.fullName}</span>
                      <span className="mt-0.5 flex items-center gap-2 text-[11px] text-jade-950/50">
                        <Clock3 size={11} aria-hidden />
                        {faTime(l.lessonTime)}
                        <span aria-hidden>·</span>
                        {faNum(st.lessonDuration)} دقیقه
                      </span>
                    </span>
                    {isToday ? <Badge tone="gold">امروز</Badge> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* اکشن سریع */}
      <Link
        href="/students/new"
        className="mt-4 flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-gold-500 py-3.5 text-sm font-bold text-jade-950 shadow-[0_10px_26px_rgba(182,138,81,0.4)] transition hover:bg-gold-400"
      >
        <UserPlus size={17} aria-hidden />
        افزودن شاگرد جدید
      </Link>

      <p className="mt-5 text-center text-[10px] leading-5 text-jade-950/35">
        دفتر سه‌تار — امروز {faWeekday(today)} است.
      </p>
    </AppShell>
  );
}
