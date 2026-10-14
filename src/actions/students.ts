"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { locations, students } from "@/db/schema";
import { requireTeacher } from "@/lib/auth";
import {
  type FormState,
  INVALID_SESSION,
  durationSchema,
  formRecord,
  idSchema,
  intSchema,
  isoDateSchema,
  optionalText,
  timeSchema,
  zodFieldErrors,
} from "@/lib/forms";
import { normalizeDigits } from "@/lib/datetime";

const checkbox = z.preprocess(
  (v) => v === "on" || v === "true" || v === "1" || v === true,
  z.boolean(),
);

const optionalLocationId = z.preprocess(
  (v) => {
    const s = String(v ?? "").trim();
    return s === "" ? null : Number(s);
  },
  z.number().int().positive("مکان نامعتبر است.").nullable(),
);

const studentSchema = z.object({
  fullName: z
    .string({ error: "نام کامل الزامی است." })
    .trim()
    .min(2, "نام کامل را صحیح وارد کنید.")
    .max(80, "نام بیش از حد طولانی است."),
  // F12: ارقام فارسی/عربی شماره تماس پیش از ذخیره به لاتین نرمال می‌شوند؛
  // قالب‌های پذیرفته‌شده‌ی فعلی (کادر آزاد تا ۲۰ نویسه) حفظ می‌شود.
  phone: z.preprocess(
    (v) => {
      if (v === null || v === undefined) return null;
      const s = normalizeDigits(String(v)).trim();
      return s === "" ? null : s;
    },
    z.string().max(20, "شماره تماس بیش از حد طولانی است.").nullable(),
  ),
  registeredOn: isoDateSchema,
  lessonDuration: durationSchema,
  lessonDay: intSchema("روز جلسه", 0, 6),
  lessonTime: timeSchema,
  locationId: optionalLocationId,
  newLocationName: optionalText(60, "نام مکان بیش از حد طولانی است."),
  notes: optionalText(500, "یادداشت بیش از حد طولانی است."),
  isActive: checkbox,
});

type StudentInput = z.infer<typeof studentSchema>;

/** مکان: استفاده از مکان ذخیره‌شده یا ایجاد مکان جدید (بدون تکرار نام). */
async function resolveLocationId(input: StudentInput): Promise<number | null> {
  if (input.locationId) return input.locationId;
  const name = input.newLocationName;
  if (!name) return null;

  const [existing] = await db.select().from(locations).where(eq(locations.name, name)).limit(1);
  if (existing) return existing.id;

  const [inserted] = await db
    .insert(locations)
    .values({ name })
    .onConflictDoNothing({ target: locations.name })
    .returning();
  if (inserted) return inserted.id;

  // برنده‌ی مسابقه‌ی درج هم‌زمانِ دیگری نام را گذاشته بود
  const [again] = await db.select().from(locations).where(eq(locations.name, name)).limit(1);
  return again?.id ?? null;
}

function studentValues(input: StudentInput, locationId: number | null) {
  return {
    fullName: input.fullName,
    phone: input.phone,
    registeredOn: input.registeredOn,
    lessonDuration: input.lessonDuration,
    lessonDay: input.lessonDay,
    lessonTime: input.lessonTime,
    locationId,
    notes: input.notes,
    isActive: input.isActive,
  };
}

const formError = (err: z.ZodError): FormState => ({ fieldErrors: zodFieldErrors(err) });

export async function createStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;

  const parsed = studentSchema.safeParse(formRecord(formData));
  if (!parsed.success) return formError(parsed.error);

  const locationId = await resolveLocationId(parsed.data);
  const [created] = await db
    .insert(students)
    .values(studentValues(parsed.data, locationId))
    .returning({ id: students.id });

  revalidatePath("/students");
  revalidatePath("/");
  return { ok: true, studentId: created.id };
}

export async function updateStudent(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;

  const withId = studentSchema.extend({ studentId: idSchema("شاگرد") });
  const parsed = withId.safeParse(formRecord(formData));
  if (!parsed.success) return formError(parsed.error);
  const { studentId, ...input } = parsed.data;

  const locationId = await resolveLocationId(input);
  const [updated] = await db
    .update(students)
    .set(studentValues(input, locationId))
    .where(eq(students.id, studentId))
    .returning({ id: students.id });

  if (!updated) return { error: "شاگرد پیدا نشد." };

  revalidatePath("/students");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/");
  revalidatePath("/sessions");
  return { ok: true, studentId };
}

/** F7: اعتبارسنجی ورودی اکشن با همان قرارداد zod پروژه */
const activePatchSchema = z.object({
  studentId: idSchema("شاگرد"),
  isActive: z.boolean({ error: "وضعیت فعال نامعتبر است." }),
});

export async function setStudentActive(studentId: number, isActive: boolean): Promise<FormState> {
  if (!(await requireTeacher())) return INVALID_SESSION;

  const parsed = activePatchSchema.safeParse({ studentId, isActive });
  if (!parsed.success) return { error: "ورودی نامعتبر است." };
  const { studentId: id, isActive: activeValue } = parsed.data;

  await db.update(students).set({ isActive: activeValue }).where(eq(students.id, id));
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  revalidatePath("/");
  revalidatePath("/sessions");
  return { ok: true };
}
