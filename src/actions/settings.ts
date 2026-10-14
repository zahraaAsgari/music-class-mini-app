"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { locations, settings } from "@/db/schema";
import { requireTeacher } from "@/lib/auth";
import {
  type FormState,
  INVALID_SESSION,
  formRecord,
  idSchema,
  optionalMoneySchema,
  optionalText,
  zodFieldErrors,
} from "@/lib/forms";

/**
 * تنظیمات تک‌ردیفه‌ی استاد: تعرفه‌های پیش‌فرض فقط «پیش‌پرکننده‌ی فرم» هستند؛
 * مبالغ ترم‌ها و جلسات اضافه هنگام ثبت کپی می‌شوند و با تغییر این مقادیر ثابت می‌مانند.
 * تعرفه‌ها و شرایط کلاس دو اکشن مجزا دارند تا ذخیره‌ی یکی، مقدار دیگری را پاک نکند.
 */
const feesSchema = z.object({
  tuition30: optionalMoneySchema("شهریه‌ی ۳۰ دقیقه"),
  tuition60: optionalMoneySchema("شهریه‌ی ۶۰ دقیقه"),
  extraFee30: optionalMoneySchema("دستمزد اضافه‌ی ۳۰ دقیقه"),
  extraFee60: optionalMoneySchema("دستمزد اضافه‌ی ۶۰ دقیقه"),
});

export async function saveFees(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;

  const parsed = feesSchema.safeParse(formRecord(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  await db
    .insert(settings)
    .values({ id: 1, ...parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.id,
      set: { ...parsed.data, updatedAt: new Date() },
    });

  revalidatePath("/settings");
  revalidatePath("/students");
  revalidatePath("/students/[id]", "page");
  return { ok: true };
}

const conditionsSchema = z.object({
  classConditions: optionalText(3000, "متن شرایط بیش از حد طولانی است."),
});

export async function saveClassConditions(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;

  const parsed = conditionsSchema.safeParse(formRecord(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  await db
    .insert(settings)
    .values({ id: 1, ...parsed.data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.id,
      set: { classConditions: parsed.data.classConditions, updatedAt: new Date() },
    });

  revalidatePath("/settings");
  return { ok: true };
}

const locationSchema = z.object({
  name: z
    .string({ error: "نام مکان الزامی است." })
    .trim()
    .min(2, "نام مکان کوتاه است.")
    .max(60, "نام مکان بیش از حد طولانی است."),
});

export async function addLocation(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;

  const parsed = locationSchema.safeParse(formRecord(formData));
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  await db
    .insert(locations)
    .values({ name: parsed.data.name })
    .onConflictDoNothing({ target: locations.name });

  revalidatePath("/settings");
  revalidatePath("/students/new");
  revalidatePath("/students/[id]", "page");
  return { ok: true };
}

/** حذف مکان ذخیره‌شده: شاگردانِ حاضر به‌همان مکان، مکانشان null می‌شود؛
 *  عکس‌فوریِ مکان روی ترم‌های گذشته (locationName) دست نمی‌خورد. */
export async function removeLocation(locationId: number): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;
  const checked = idSchema("مکان").safeParse(locationId);
  if (!checked.success) return { error: "شناسه‌ی نامعتبر." };

  await db.delete(locations).where(eq(locations.id, checked.data));

  revalidatePath("/settings");
  revalidatePath("/students");
  revalidatePath("/students/[id]", "page");
  return { ok: true };
}
