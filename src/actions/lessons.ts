"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { LESSON_STATUSES, MAKEUP_STATUSES, lessons, terms } from "@/db/schema";
import { requireTeacher } from "@/lib/auth";
import {
  type FormState,
  INVALID_SESSION,
  isoDateSchema,
  timeSchema,
} from "@/lib/forms";

/**
 * حضور و پیگیری غیبت — قواعد سروری معتبر:
 * - وضعیت حضور، درخواست ویدیو، ارسال ویدیو و پیگیری جبرانی رکوردهای مجزا هستند.
 * - پیگیری‌ها فقط برای جلسه‌ی «غایب» معنا دارند؛ با تغییر وضعیت به غیر غایب پاک می‌شوند
 *   تا یادآوری‌های سرگردان باقی نماند.
 * - هر جلسه یک رکورد واحد دارد (unique در دیتابیس)؛ اصلاح حضور شمارش تکراری نمی‌سازد.
 */

async function lessonWithTerm(lessonId: number) {
  const [row] = await db
    .select({ lesson: lessons, studentId: terms.studentId })
    .from(lessons)
    .innerJoin(terms, eq(lessons.termId, terms.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  return row ?? null;
}

function revalidateLessonViews(studentId: number) {
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/sessions");
  revalidatePath("/");
}

const statusSchema = z.enum(LESSON_STATUSES);

export async function setLessonStatus(lessonId: number, status: string): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;
  const id = Number(lessonId);
  if (!Number.isSafeInteger(id) || id < 1) return { error: "شناسه‌ی نامعتبر." };
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { error: "وضعیت حضور نامعتبر است." };

  const row = await lessonWithTerm(id);
  if (!row) return { error: "جلسه پیدا نشد." };

  const newStatus = parsed.data;
  await db
    .update(lessons)
    .set(
      newStatus === "absent"
        ? { status: newStatus }
        : {
            status: newStatus,
            videoRequested: false,
            videoSent: false,
            makeupStatus: "none",
          },
    )
    .where(eq(lessons.id, id));

  revalidateLessonViews(row.studentId);
  return { ok: true };
}

const followupsSchema = z.object({
  videoRequested: z.boolean(),
  videoSent: z.boolean(),
  makeupStatus: z.enum(MAKEUP_STATUSES),
});

export async function setLessonFollowups(
  lessonId: number,
  patch: { videoRequested: boolean; videoSent: boolean; makeupStatus: string },
): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;
  const id = Number(lessonId);
  if (!Number.isSafeInteger(id) || id < 1) return { error: "شناسه‌ی نامعتبر." };
  const parsed = followupsSchema.safeParse({
    videoRequested: patch.videoRequested === true,
    videoSent: patch.videoSent === true,
    makeupStatus: patch.makeupStatus,
  });
  if (!parsed.success) return { error: "داده‌ی پیگیری نامعتبر است." };

  const row = await lessonWithTerm(id);
  if (!row) return { error: "جلسه پیدا نشد." };
  if (row.lesson.status !== "absent") {
    return { error: "پیگیری فقط برای جلسه‌ی غایب امکان‌پذیر است." };
  }

  // نرمال‌سازی: ویدیوی ارسال‌شده حتماً قبلاً درخواست شده است
  const videoRequested = parsed.data.videoRequested || parsed.data.videoSent;
  await db
    .update(lessons)
    .set({
      videoRequested,
      videoSent: parsed.data.videoSent,
      makeupStatus: parsed.data.makeupStatus,
    })
    .where(eq(lessons.id, id));

  revalidateLessonViews(row.studentId);
  return { ok: true };
}

/** تغییر تاریخ/ساعت یک جلسه (مثل جابه‌جایی هفته‌ی تعطیل)؛ رکورد تاریخی حفظ می‌شود. */
export async function rescheduleLesson(
  lessonId: number,
  date: string,
  time: string,
): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;
  const id = Number(lessonId);
  if (!Number.isSafeInteger(id) || id < 1) return { error: "شناسه‌ی نامعتبر." };

  const dateOk = isoDateSchema.safeParse(date);
  const timeOk = timeSchema.safeParse(time);
  if (!dateOk.success || !timeOk.success) return { error: "تاریخ یا ساعت معتبر نیست." };

  const row = await lessonWithTerm(id);
  if (!row) return { error: "جلسه پیدا نشد." };

  await db
    .update(lessons)
    .set({ scheduledDate: dateOk.data, lessonTime: timeOk.data })
    .where(eq(lessons.id, id));

  revalidateLessonViews(row.studentId);
  return { ok: true };
}
