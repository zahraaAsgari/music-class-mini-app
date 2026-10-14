import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { ArrowRight } from "lucide-react";
import { db } from "@/db";
import { extraLessons, lessons, locations, settings, students, terms } from "@/db/schema";
import { requireTeacher, isPreviewAuthAllowed } from "@/lib/auth";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/app-shell";
import { SectionTitle } from "@/components/ui";
import { StudentInfoPanel, type StudentProfile } from "@/components/student-info-panel";
import { NewTermPanel, TermsHistory, type TermView } from "@/components/term-manager";
import { ExtraLessonsPanel, type ExtraLessonView } from "@/components/extra-panel";
import {
  DAY_NAMES_FA,
  diffDays,
  faDate,
  faDigits,
  faMoney,
  faNum,
  faWeekday,
  todayISO,
} from "@/lib/datetime";

export const dynamic = "force-dynamic";

/**
 * پروفایل شاگرد: اطلاعات، تاریخچه‌ی ترم‌ها (حفاظت‌شده در برابر بازنویسی)،
 * حضور و پیگیری‌ها، جلسات اضافه و وضعیت پرداخت — همه در یک مسیر.
 */
export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireTeacher();
  if (!session) return <AuthGate allowPreview={isPreviewAuthAllowed()} />;

  const { id } = await params;
  const studentId = Number(id);
  if (!Number.isSafeInteger(studentId) || studentId < 1) notFound();

  const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  if (!student) notFound();

  const [allLocations, termRows, extraRows, settingsRows] = await Promise.all([
    db.select().from(locations).orderBy(asc(locations.name)),
    db.select().from(terms).where(eq(terms.studentId, studentId)).orderBy(desc(terms.startDate), desc(terms.id)),
    db.select().from(extraLessons).where(eq(extraLessons.studentId, studentId)).orderBy(desc(extraLessons.lessonDate), desc(extraLessons.id)),
    db.select().from(settings).where(eq(settings.id, 1)).limit(1),
  ]);

  const termIds = termRows.map((t) => t.id);
  const lessonRows =
    termIds.length > 0
      ? await db.select().from(lessons).where(inArray(lessons.termId, termIds)).orderBy(asc(lessons.lessonNumber))
      : [];

  const lessonsByTerm = new Map<number, typeof lessonRows>();
  for (const lesson of lessonRows) {
    const list = lessonsByTerm.get(lesson.termId) ?? [];
    list.push(lesson);
    lessonsByTerm.set(lesson.termId, list);
  }

  const today = todayISO();
  const config = settingsRows[0] ?? null;
  const locationNameMap = new Map(allLocations.map((l) => [l.id, l.name] as const));

  const termViews: TermView[] = termRows.map((term, index) => {
    const termLessons = lessonsByTerm.get(term.id) ?? [];
    const used = termLessons.filter((l) => l.status === "present").length;
    const absent = termLessons.filter((l) => l.status === "absent").length;
    const remaining = termLessons.filter((l) => l.status === "scheduled").length;
    const daysToExpiry = diffDays(today, term.expiryDate);

    let expiryHint: string | null = null;
    let expiryUrgent = false;
    if (remaining > 0) {
      if (daysToExpiry < 0) {
        expiryHint = "اعتبار سپری شده";
        expiryUrgent = true;
      } else if (daysToExpiry <= 5) {
        expiryHint = daysToExpiry === 0 ? "امروز پایان می‌یابد" : `${faNum(daysToExpiry)} روز اعتبار مانده`;
        expiryUrgent = daysToExpiry <= 2;
      }
    }

    return {
      id: term.id,
      isCurrent: index === 0,
      startFa: faDate(term.startDate, { year: true }),
      expiryFa: faDate(term.expiryDate, { year: true }),
      expiryHint,
      expiryUrgent,
      tuitionFa: faMoney(term.tuitionAmount),
      isPaid: term.isPaid,
      scheduleFa: `${DAY_NAMES_FA[term.lessonDay]}‌ها ساعت ${faDigits(term.lessonTime)} · ${faNum(term.lessonDuration)} دقیقه`,
      locationName: term.locationName,
      used,
      absent,
      remaining,
      lessons: termLessons.map((l) => ({
        id: l.id,
        number: l.lessonNumber,
        dateLabel: `${faWeekday(l.scheduledDate)} ${faDate(l.scheduledDate, { short: true })}`,
        timeFa: faDigits(l.lessonTime),
        status: l.status as TermView["lessons"][number]["status"],
        videoRequested: l.videoRequested,
        videoSent: l.videoSent,
        makeupStatus: l.makeupStatus as TermView["lessons"][number]["makeupStatus"],
        overdue: l.status === "scheduled" && l.scheduledDate < today,
        rawDate: l.scheduledDate,
        rawTime: l.lessonTime,
      })),
    };
  });

  const extraViews: ExtraLessonView[] = extraRows.map((ex) => ({
    id: ex.id,
    dateFa: `${faWeekday(ex.lessonDate)} ${faDate(ex.lessonDate, { short: true })}`,
    timeFa: faDigits(ex.lessonTime),
    durationFa: `${faNum(ex.duration)} دقیقه`,
    feeFa: faMoney(ex.feeAmount),
    status: ex.status as ExtraLessonView["status"],
    isPaid: ex.isPaid,
    notes: ex.notes,
  }));

  const profile: StudentProfile = {
    initial: {
      id: student.id,
      fullName: student.fullName,
      phone: student.phone,
      registeredOn: student.registeredOn,
      lessonDuration: student.lessonDuration,
      lessonDay: student.lessonDay,
      lessonTime: student.lessonTime,
      locationId: student.locationId,
      notes: student.notes,
      isActive: student.isActive,
    },
    registeredFa: faDate(student.registeredOn, { year: true }),
    scheduleFa: `${DAY_NAMES_FA[student.lessonDay]}‌ها ساعت ${faDigits(student.lessonTime)} · ${faNum(student.lessonDuration)} دقیقه`,
    locationName: (student.locationId && locationNameMap.get(student.locationId)) || null,
    phoneFa: student.phone ? faDigits(student.phone) : null,
  };

  const defaultTuition =
    student.lessonDuration === 30 ? (config?.tuition30 ?? null) : (config?.tuition60 ?? null);

  return (
    <AppShell>
      <Link
        href="/students"
        className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-jade-950/50 transition hover:text-jade-700"
      >
        <ArrowRight size={14} aria-hidden />
        بازگشت به شاگردان
      </Link>

      <StudentInfoPanel student={profile} locations={allLocations.map((l) => ({ id: l.id, name: l.name }))} />

      <div className="mt-6">
        <SectionTitle>ترم‌ها و حضور</SectionTitle>
        <NewTermPanel studentId={student.id} defaultTuition={defaultTuition} todayIso={today} />
        <div className="mt-3">
          <TermsHistory terms={termViews} />
        </div>
      </div>

      <ExtraLessonsPanel
        studentId={student.id}
        items={extraViews}
        defaultFee30={config?.extraFee30 ?? null}
        defaultFee60={config?.extraFee60 ?? null}
        defaultDuration={student.lessonDuration}
        defaultTime={student.lessonTime}
        todayIso={today}
      />
    </AppShell>
  );
}
