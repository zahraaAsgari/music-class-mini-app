"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { lessons, locations, students, terms } from "@/db/schema";
import { requireTeacher } from "@/lib/auth";
import {
  type FormState,
  INVALID_SESSION,
  formRecord,
  idSchema,
  isoDateSchema,
  optionalMoneySchema,
  zodFieldErrors,
} from "@/lib/forms";
import { weeklyLessonDates } from "@/lib/datetime";

/**
 * قانون ترم: هر ترم رکوردی مستقل و تاریخی است که با ۴ جلسه‌ی منظم آغاز می‌شود.
 * ساخت ترم جدید هیچ‌وقت ترم قبلی را تغییر نمی‌دهد؛ روز/ساعت/مدت/مکان به‌صورت
 * عکس‌فوری از تنظیمات فعلی شاگرد کپی می‌شود تا سوابق بعداً بازنویسی نشوند.
 */
const termSchema = z
  .object({
    studentId: idSchema("شاگرد"),
    startDate: isoDateSchema,
    expiryDate: isoDateSchema,
    tuitionAmount: optionalMoneySchema("شهریه"),
  })
  .refine((d) => d.expiryDate >= d.startDate, {
    message: "تاریخ پایان نمی‌تواند قبل از شروع باشد.",
    path: ["expiryDate"],
  });

/** پیام واحد ردِ ترم تکراری — هم برای چک نرم و هم برای نقض قید دیتابیس */
const DUPLICATE_TERM_MESSAGE = "برای این شاگرد، در این تاریخ شروع، ترمی ثبت شده است.";

/** نقض قید یکتا در PostgreSQL (کد 23505) بدون افشای خطای خام دیتابیس */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "23505"
  );
}

export async function createTerm(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;

  const parsed = termSchema.safeParse(formRecord(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const input = parsed.data;

  const [student] = await db.select().from(students).where(eq(students.id, input.studentId)).limit(1);
  if (!student) return { error: "شاگرد پیدا نشد." };

  // چک نرم سطح اپلیکیشن: پیام فارسی شفاف پیش از درج (متن واحد با شاخه‌ی قید دیتابیس)
  const [existingTerm] = await db
    .select({ id: terms.id })
    .from(terms)
    .where(and(eq(terms.studentId, input.studentId), eq(terms.startDate, input.startDate)))
    .limit(1);
  if (existingTerm) {
    return { fieldErrors: { startDate: DUPLICATE_TERM_MESSAGE } };
  }

  let locationName: string | null = null;
  if (student.locationId) {
    const [loc] = await db.select().from(locations).where(eq(locations.id, student.locationId)).limit(1);
    locationName = loc?.name ?? null;
  }

  try {
    // تراکنش: ترم و ۴ جلسه‌اش یا هر دو ثبت می‌شوند یا هیچ‌کدام (یکپارچگی داده).
    await db.transaction(async (tx) => {
      const [term] = await tx
        .insert(terms)
        .values({
          studentId: student.id,
          startDate: input.startDate,
          expiryDate: input.expiryDate,
          tuitionAmount: input.tuitionAmount,
          lessonDay: student.lessonDay,
          lessonTime: student.lessonTime,
          lessonDuration: student.lessonDuration,
          locationName,
        })
        .returning({ id: terms.id });

      const dates = weeklyLessonDates(input.startDate, student.lessonDay, 4);
      await tx.insert(lessons).values(
        dates.map((scheduledDate, i) => ({
          termId: term.id,
          lessonNumber: i + 1,
          scheduledDate,
          lessonTime: student.lessonTime,
        })),
      );
    });
  } catch (err) {
    // صورت‌بندی هم‌زمان (double-submit در دو تب/دستگاه): قید یکتای دیتابیس نگهبان
    // نهایی است؛ خطای خام دیتابیس به کاربر افشا نمی‌شود.
    if (isUniqueViolation(err)) {
      return { fieldErrors: { startDate: DUPLICATE_TERM_MESSAGE } };
    }
    throw err;
  }

  revalidatePath(`/students/${student.id}`);
  revalidatePath("/students");
  revalidatePath("/sessions");
  revalidatePath("/");
  return { ok: true, studentId: student.id };
}

/** تغییر وضعیت پرداخت شهریه‌ی یک ترم مشخص؛ سوابق ترم‌های دیگر دست نمی‌خورند. */
export async function setTermPaid(termId: number, paid: boolean): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;
  const id = Number(termId);
  if (!Number.isSafeInteger(id) || id < 1) return { error: "شناسه‌ی نامعتبر." };

  const [term] = await db
    .update(terms)
    .set({ isPaid: paid, paidAt: paid ? new Date() : null })
    .where(eq(terms.id, id))
    .returning({ studentId: terms.studentId });

  if (!term) return { error: "ترم پیدا نشد." };

  revalidatePath(`/students/${term.studentId}`);
  revalidatePath("/students");
  revalidatePath("/");
  return { ok: true };
}
