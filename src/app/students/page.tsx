import Link from "next/link";
import { asc, desc, inArray } from "drizzle-orm";
import { Plus, Users } from "lucide-react";
import { db } from "@/db";
import { lessons, locations, students, terms } from "@/db/schema";
import { requireTeacher, isPreviewAuthAllowed } from "@/lib/auth";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ambient";
import { EmptyState } from "@/components/ui";
import { StudentsBrowser, type StudentListItem } from "@/components/students-browser";
import { DAY_NAMES_FA, faDigits, faNum } from "@/lib/datetime";

export const dynamic = "force-dynamic";

/** شاگردان: فهرست قابل‌جست‌وجو + وضعیت ترم جاری هر شاگرد. */
export default async function StudentsPage() {
  const session = await requireTeacher();
  if (!session) return <AuthGate allowPreview={isPreviewAuthAllowed()} />;

  const [allStudents, allLocations] = await Promise.all([
    db.select().from(students),
    db.select().from(locations),
  ]);

  const locationName = new Map(allLocations.map((l) => [l.id, l.name] as const));

  /* داده‌ی موردنیاز فهرست (F4 — فیلتر در SQL):
   * برچسب هر شاگرد فقط به «آخرین ترم» او وابسته است؛ پس به‌جای واکشی کل ترم‌ها
   * و کل جلسات، فقط DISTINCT ON آخرین ترم هر شاگرد و جلساتِ همان ترم‌ها خوانده
   * می‌شود. تاریخچه‌ی کامل هر شاگرد همچنان در صفحه‌ی پروفایل در دسترس است.
   */
  const studentIds = allStudents.map((s) => s.id);
  const latestTerms =
    studentIds.length > 0
      ? await db
          .selectDistinctOn([terms.studentId])
          .from(terms)
          .where(inArray(terms.studentId, studentIds))
          .orderBy(asc(terms.studentId), desc(terms.startDate), desc(terms.id))
      : [];
  const latestTerm = new Map(latestTerms.map((t) => [t.studentId, t] as const));

  const latestTermIds = latestTerms.map((t) => t.id);
  const latestTermLessonRows =
    latestTermIds.length > 0
      ? await db
          .select({ termId: lessons.termId, status: lessons.status })
          .from(lessons)
          .where(inArray(lessons.termId, latestTermIds))
      : [];
  const remainingByTerm = new Map<number, number>();
  for (const lesson of latestTermLessonRows) {
    if (lesson.status === "scheduled") {
      remainingByTerm.set(lesson.termId, (remainingByTerm.get(lesson.termId) ?? 0) + 1);
    }
  }

  const items: StudentListItem[] = allStudents
    .map((s) => {
      const term = latestTerm.get(s.id);
      const remaining = term ? (remainingByTerm.get(term.id) ?? 0) : null;
      return {
        id: s.id,
        fullName: s.fullName,
        phone: s.phone ? faDigits(s.phone) : null,
        isActive: s.isActive,
        scheduleLabel: `${DAY_NAMES_FA[s.lessonDay]}‌ها، ساعت ${faDigits(s.lessonTime)} · ${faNum(s.lessonDuration)} دقیقه`,
        locationLabel: (s.locationId && locationName.get(s.locationId)) || null,
        remainingLabel:
          term === undefined
            ? "بدون ترم"
            : remaining !== null && remaining > 0
              ? `${faNum(remaining)} جلسه باقی مانده`
              : term && !term.isPaid
                ? "شهریه پرداخت نشده"
                : "ترم تکمیل شده",
        hasActiveTerm: remaining !== null && remaining > 0,
      };
    })
    // فعال‌ها اول، بعد بر اساس نام
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.fullName.localeCompare(b.fullName, "fa"));

  return (
    <AppShell>
      <PageHeader
        title="شاگردان"
        subtitle={items.length > 0 ? `${faNum(items.filter((i) => i.isActive).length)} شاگرد فعال` : undefined}
        action={
          <Link
            href="/students/new"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-jade-900 px-3.5 py-2 text-xs font-bold text-cream-100 shadow-[0_6px_16px_rgba(24,62,58,0.25)] transition hover:bg-jade-800"
          >
            <Plus size={14} aria-hidden />
            شاگرد جدید
          </Link>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="هنوز شاگردی ثبت نشده است"
          hint="اولین شاگرد را اضافه کنید تا ترم‌ها و جلساتش مدیریت شود."
        />
      ) : (
        <StudentsBrowser items={items} />
      )}
    </AppShell>
  );
}
