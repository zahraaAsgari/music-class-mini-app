"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { EXTRA_STATUSES, extraLessons } from "@/db/schema";
import { requireTeacher } from "@/lib/auth";
import {
  type FormState,
  INVALID_SESSION,
  durationSchema,
  formRecord,
  idSchema,
  isoDateSchema,
  optionalMoneySchema,
  optionalText,
  timeSchema,
  zodFieldErrors,
} from "@/lib/forms";

/**
 * جلسات اضافه: مستقل از ۴ جلسه‌ی منظم ترم و فقط از پروفایل شاگرد مدیریت می‌شوند.
 * مبلغ هنگام ثبت ذخیره می‌شود؛ تغییر تعرفه‌ی پیش‌فرض در تنظیمات، مبالغ ثبت‌شده را
 * تغییر نمی‌دهد.
 */
const extraSchema = z.object({
  studentId: idSchema("شاگرد"),
  lessonDate: isoDateSchema,
  lessonTime: timeSchema,
  duration: durationSchema,
  feeAmount: optionalMoneySchema("دستمزد جلسه‌ی اضافه"),
  notes: optionalText(300, "یادداشت بیش از حد طولانی است."),
});

export async function addExtraLesson(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;

  const parsed = extraSchema.safeParse(formRecord(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const input = parsed.data;

  await db.insert(extraLessons).values({
    studentId: input.studentId,
    lessonDate: input.lessonDate,
    lessonTime: input.lessonTime,
    duration: input.duration,
    feeAmount: input.feeAmount,
    notes: input.notes,
  });

  revalidatePath(`/students/${input.studentId}`);
  revalidatePath("/sessions");
  revalidatePath("/");
  return { ok: true, studentId: input.studentId };
}

const extraStatusSchema = z.enum(EXTRA_STATUSES);

export async function setExtraStatus(extraId: number, status: string): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;
  const id = Number(extraId);
  if (!Number.isSafeInteger(id) || id < 1) return { error: "شناسه‌ی نامعتبر." };
  const parsed = extraStatusSchema.safeParse(status);
  if (!parsed.success) return { error: "وضعیت نامعتبر است." };

  const [row] = await db
    .update(extraLessons)
    .set({ status: parsed.data })
    .where(eq(extraLessons.id, id))
    .returning({ studentId: extraLessons.studentId });
  if (!row) return { error: "جلسه‌ی اضافه پیدا نشد." };

  revalidatePath(`/students/${row.studentId}`);
  revalidatePath("/sessions");
  return { ok: true };
}

export async function setExtraPaid(extraId: number, paid: boolean): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;
  const id = Number(extraId);
  if (!Number.isSafeInteger(id) || id < 1) return { error: "شناسه‌ی نامعتبر." };

  const [row] = await db
    .update(extraLessons)
    .set({ isPaid: paid, paidAt: paid ? new Date() : null })
    .where(eq(extraLessons.id, id))
    .returning({ studentId: extraLessons.studentId });
  if (!row) return { error: "جلسه‌ی اضافه پیدا نشد." };

  revalidatePath(`/students/${row.studentId}`);
  return { ok: true };
}

/** حذف فقط برای جلسات اضافه مجاز است (رکوردهای اصلی تاریخی‌اند و حذف نمی‌شوند). */
export async function deleteExtraLesson(extraId: number): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;
  const id = Number(extraId);
  if (!Number.isSafeInteger(id) || id < 1) return { error: "شناسه‌ی نامعتبر." };

  const [row] = await db
    .delete(extraLessons)
    .where(eq(extraLessons.id, id))
    .returning({ studentId: extraLessons.studentId });
  if (!row) return { error: "جلسه‌ی اضافه پیدا نشد." };

  revalidatePath(`/students/${row.studentId}`);
  revalidatePath("/sessions");
  revalidatePath("/");
  return { ok: true };
}
