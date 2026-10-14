import {
  pgTable,
  serial,
  integer,
  smallint,
  text,
  boolean,
  timestamp,
  date,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * مدل داده‌ی «دفتر سه‌تار» — کوچک‌ترین مدل وفادار به قواعد کسب‌وکار تأییدشده:
 *
 * - هر ترم یک رکورد تاریخی مستقل است؛ ساخت ترم جدید هیچ‌وقت ترم قبلی را بازنویسی نمی‌کند.
 * - ترم هنگام ساخت، عکس‌فوری (snapshot) از روز/ساعت/مدت/مکانِ فعلی شاگرد می‌گیرد تا
 *   تغییر تنظیمات فعلی، سوابق گذشته را تغییر ندهد.
 * - هر ترم دقیقاً ۴ جلسه‌ی منظم دارد (قانون ثابت) و unique(term_id, lesson_number) از
 *   تکرار شمارش هنگام اصلاح حضور جلوگیری می‌کند.
 * - جلسات اضافه در اختیار ۴ جلسه‌ی ترم نیستند و مبلغشان هنگام ثبت کپی می‌شود تا تغییر
 *   تعرفه‌های پیش‌فرض، مبالغ ثبت‌شده را تغییر ندهد.
 * - مبالغ nullable‌اند: هیچ مبلغی جعل نمی‌شود؛ تا استاد مقدار ندهد «نامشخص» است.
 */

/* ─────────────────────────── مکان‌های ذخیره‌شده ─────────────────────────── */

export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ──────────────────────────────── شاگردان ──────────────────────────────── */

export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    registeredOn: date("registered_on", { mode: "string" }).notNull(),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    /** ۳۰ یا ۶۰ دقیقه — سایر مقادیر از نظر کسب‌وکاری نامعتبرند */
    lessonDuration: integer("lesson_duration").notNull(),
    /** ۰=شنبه … ۶=جمعه (هفته‌ی ایرانی) */
    lessonDay: smallint("lesson_day").notNull(),
    /** "HH:MM" */
    lessonTime: text("lesson_time").notNull(),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("students_duration_chk", sql`${t.lessonDuration} in (30, 60)`),
    check("students_lesson_day_chk", sql`${t.lessonDay} between 0 and 6`),
    index("students_is_active_idx").on(t.isActive),
  ],
);

/* ─────────────────────────────── ترم‌های ماهانه ─────────────────────────────── */

export const terms = pgTable(
  "terms",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    startDate: date("start_date", { mode: "string" }).notNull(),
    /** پایان اعتبار: پیش‌فرض یک ماه تقویمی پس از شروع، قابل ویرایش توسط استاد */
    expiryDate: date("expiry_date", { mode: "string" }).notNull(),
    /** شهریه‌ی همین ترم؛ مستقل از تعرفه‌های فعلی */
    tuitionAmount: integer("tuition_amount"),
    isPaid: boolean("is_paid").notNull().default(false),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    /* عکس‌فوری برنامه‌ی هفتگی و مکان در زمان ساخت ترم */
    lessonDay: smallint("lesson_day").notNull(),
    lessonTime: text("lesson_time").notNull(),
    lessonDuration: integer("lesson_duration").notNull(),
    locationName: text("location_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("terms_student_id_idx").on(t.studentId),
    /** نگهبان نهایی ضد تکرار (F3): یک ترم به‌ازای هر شاگرد در هر تاریخ شروع */
    uniqueIndex("terms_student_start_unique").on(t.studentId, t.startDate),
    check("terms_duration_chk", sql`${t.lessonDuration} in (30, 60)`),
    check("terms_expiry_chk", sql`${t.expiryDate} >= ${t.startDate}`),
  ],
);

/* ─────────────────────────── جلسات منظم (۴ تایی هر ترم) ─────────────────────────── */

/** وضعیت حضور: scheduled (هنوز ثبت نشده) | present | absent */
export const LESSON_STATUSES = ["scheduled", "present", "absent"] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];

/** پیگیری جبرانی: none | pending | done */
export const MAKEUP_STATUSES = ["none", "pending", "done"] as const;
export type MakeupStatus = (typeof MAKEUP_STATUSES)[number];

export const lessons = pgTable(
  "lessons",
  {
    id: serial("id").primaryKey(),
    termId: integer("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    lessonNumber: smallint("lesson_number").notNull(),
    scheduledDate: date("scheduled_date", { mode: "string" }).notNull(),
    lessonTime: text("lesson_time").notNull(),
    status: text("status").notNull().default("scheduled"),
    /* درخواست ویدیو و ارسال آن دو وضعیت مجزا هستند (ارسال به‌صورت دستی توسط استاد) */
    videoRequested: boolean("video_requested").notNull().default(false),
    videoSent: boolean("video_sent").notNull().default(false),
    makeupStatus: text("makeup_status").notNull().default("none"),
  },
  (t) => [
    /** یک رکورد به ازای هر جلسه — اصلاح حضور هرگز شمارش تکراری نمی‌سازد */
    uniqueIndex("lessons_term_number_unique").on(t.termId, t.lessonNumber),
    check("lessons_number_chk", sql`${t.lessonNumber} between 1 and 4`),
    check("lessons_status_chk", sql`${t.status} in ('scheduled', 'present', 'absent')`),
    check("lessons_makeup_chk", sql`${t.makeupStatus} in ('none', 'pending', 'done')`),
    index("lessons_scheduled_date_idx").on(t.scheduledDate),
  ],
);

/* ─────────────────────────────── جلسات اضافه ─────────────────────────────── */

export const EXTRA_STATUSES = ["scheduled", "completed", "canceled"] as const;
export type ExtraStatus = (typeof EXTRA_STATUSES)[number];

export const extraLessons = pgTable(
  "extra_lessons",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    lessonDate: date("lesson_date", { mode: "string" }).notNull(),
    lessonTime: text("lesson_time").notNull(),
    duration: integer("duration").notNull().default(60),
    /** مبلغ هنگام ثبت کپی می‌شود؛ تغییر تعرفه‌ی پیش‌فرض اثری بر آن ندارد */
    feeAmount: integer("fee_amount"),
    status: text("status").notNull().default("scheduled"),
    isPaid: boolean("is_paid").notNull().default(false),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("extra_lessons_student_id_idx").on(t.studentId),
    index("extra_lessons_date_idx").on(t.lessonDate),
    check("extra_duration_chk", sql`${t.duration} in (30, 60)`),
    check("extra_status_chk", sql`${t.status} in ('scheduled', 'completed', 'canceled')`),
  ],
);

/* ─────────────────────────── تنظیمات تک‌ردیفه‌ی استاد ─────────────────────────── */

export const settings = pgTable(
  "settings",
  {
    /** همیشه ۱ — تک‌ردیفه با CHECK */
    id: smallint("id").primaryKey().default(1),
    /** شهریه‌ی پیش‌فرض ترم ۳۰/۶۰ دقیقه‌ای؛ تا استاد تعیین نکند null (بدون جعل مبلغ) */
    tuition30: integer("tuition_30"),
    tuition60: integer("tuition_60"),
    /** دستمزد پیش‌فرض جلسه‌ی اضافه‌ی ۳۰/۶۰ دقیقه‌ای */
    extraFee30: integer("extra_fee_30"),
    extraFee60: integer("extra_fee_60"),
    classConditions: text("class_conditions"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /** F6: تک‌ردیفه‌بودن تنظیمات از قرارداد به قید دیتابیس تبدیل شد (ریسک مهاجرت صفر: ردیف موجود id=1 است) */
    check("settings_single_row_chk", sql`${t.id} = 1`),
  ],
);

export type Location = typeof locations.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Term = typeof terms.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type ExtraLesson = typeof extraLessons.$inferSelect;
export type Settings = typeof settings.$inferSelect;
