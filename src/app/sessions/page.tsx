import { asc, eq, and, or } from "drizzle-orm";
import { db } from "@/db";
import { extraLessons, lessons, students, terms } from "@/db/schema";
import { requireTeacher, isPreviewAuthAllowed } from "@/lib/auth";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ambient";
import { SessionsAgenda, type SessionRow, type SessionExtraRow } from "@/components/sessions-agenda";
import { faDate, faDigits, faNum, faWeekday, todayISO } from "@/lib/datetime";

export const dynamic = "force-dynamic";

/**
 * جلسات: دستورکار قابل‌اقدام — ثبت حضورِ معوقه، جلسات پیشِ رو،
 * پیگیری‌های باز غیبت و جلسات اضافه‌ی برنامه‌ریزی‌شده.
 */
export default async function SessionsPage() {
  const session = await requireTeacher();
  if (!session) return <AuthGate allowPreview={isPreviewAuthAllowed()} />;

  const today = todayISO();

  const rows = await db
    .select({
      id: lessons.id,
      lessonNumber: lessons.lessonNumber,
      scheduledDate: lessons.scheduledDate,
      lessonTime: lessons.lessonTime,
      status: lessons.status,
      videoRequested: lessons.videoRequested,
      videoSent: lessons.videoSent,
      makeupStatus: lessons.makeupStatus,
      studentId: students.id,
      studentName: students.fullName,
    })
    .from(lessons)
    .innerJoin(terms, eq(lessons.termId, terms.id))
    .innerJoin(students, eq(terms.studentId, students.id))
    /* F4 — فیلتر در SQL بدون پنجره‌ی تاریخی: «برنامه‌ریزی‌شده‌ها» همه لازم‌اند
     * (گذشته‌ی ثبت‌نشده = برگه‌ی نیازمند ثبت؛ آینده = برگه‌ی پیشِ رو) و در کنارشان
     * فقط غیبت‌های سرگردانِ نیازمند پیگیری. رکوردهای حاضر/لغوشده و پیگیری‌های
     * تسویه‌شده در این صفحه هرگز نمایش داده نمی‌شدند و دیگر واکشی هم نمی‌شوند.
     */
    .where(
      or(
        eq(lessons.status, "scheduled"),
        and(
          eq(lessons.status, "absent"),
          or(
            and(eq(lessons.videoRequested, true), eq(lessons.videoSent, false)),
            eq(lessons.makeupStatus, "pending"),
          ),
        ),
      ),
    )
    .orderBy(asc(lessons.scheduledDate), asc(lessons.lessonTime));

  const toRow = (r: (typeof rows)[number]): SessionRow => ({
    studentId: r.studentId,
    studentName: r.studentName,
    lesson: {
      id: r.id,
      number: r.lessonNumber,
      dateLabel: `${faWeekday(r.scheduledDate)} ${faDate(r.scheduledDate, { short: true })}`,
      timeFa: faDigits(r.lessonTime),
      status: r.status as SessionRow["lesson"]["status"],
      videoRequested: r.videoRequested,
      videoSent: r.videoSent,
      makeupStatus: r.makeupStatus as SessionRow["lesson"]["makeupStatus"],
      overdue: r.status === "scheduled" && r.scheduledDate < today,
      rawDate: r.scheduledDate,
      rawTime: r.lessonTime,
    },
  });

  const overdue = rows.filter((r) => r.status === "scheduled" && r.scheduledDate < today).map(toRow);
  const upcomingAll = rows.filter((r) => r.status === "scheduled" && r.scheduledDate >= today);
  // نمایش به ۴۰ مورد محدود است؛ اگر بیشتر باشد، تعداد پنهان‌شده به UI گزارش می‌شود (F9)
  const upcoming = upcomingAll.slice(0, 40).map(toRow);
  const upcomingHiddenCount = upcomingAll.length - upcoming.length;
  const followups = rows
    .filter(
      (r) =>
        r.status === "absent" &&
        ((r.videoRequested && !r.videoSent) || r.makeupStatus === "pending"),
    )
    .map(toRow);

  const extraRows = await db
    .select({
      id: extraLessons.id,
      lessonDate: extraLessons.lessonDate,
      lessonTime: extraLessons.lessonTime,
      duration: extraLessons.duration,
      studentId: students.id,
      studentName: students.fullName,
    })
    .from(extraLessons)
    .innerJoin(students, eq(extraLessons.studentId, students.id))
    .where(eq(extraLessons.status, "scheduled"))
    .orderBy(asc(extraLessons.lessonDate))
    .limit(20);

  const scheduledExtras: SessionExtraRow[] = extraRows.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    studentName: r.studentName,
    label: `${faWeekday(r.lessonDate)} ${faDate(r.lessonDate, { short: true })} · ${faDigits(r.lessonTime)} · ${faNum(r.duration)} دقیقه`,
    overdue: r.lessonDate < today,
  }));

  return (
    <AppShell>
      <PageHeader title="جلسات" subtitle="ثبت حضور، پیگیری غیبت‌ها و برنامه‌ی پیشِ رو" />
      <SessionsAgenda overdue={overdue} upcoming={upcoming} followups={followups} extras={scheduledExtras} upcomingHiddenCount={upcomingHiddenCount} />
    </AppShell>
  );
}
