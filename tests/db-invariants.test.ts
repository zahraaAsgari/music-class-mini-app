import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { Client } from "pg";
import { execSync } from "node:child_process";
import { weeklyLessonDates } from "@/lib/datetime";

/**
 * تست‌های ایزوله‌ی قواعد دیتابیس روی دیتابیس موقت جداگانه (نه app_db) — F14.
 * DDL از خودِ اسکیمای پروژه با `drizzle-kit export` ساخته می‌شود تا انحراف از
 * اسکیمای واقعی اتفاق نیفتد؛ داده‌ها ساختگی‌اند و در پایان دیتابیس حذف می‌شود.
 */
const TEST_DB = "setar_qa_isolated";
const ADMIN_URL = "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

let admin: Client;
let db: Client;

before(async () => {
  admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);

  const ddl = execSync("npx drizzle-kit export", { encoding: "utf8" });
  assert.match(ddl, /CREATE TABLE "terms"/);

  db = new Client({ connectionString: `postgresql://postgres:postgres@127.0.0.1:5432/${TEST_DB}` });
  await db.connect();
  await db.query(ddl);
}, { timeout: 120_000 });

after(async () => {
  try {
    await db.end();
  } catch {}
  try {
    await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  } finally {
    await admin.end();
  }
});

// داده‌ی ساختگی کمکی — هیچ رکورد واقعی شاگردی استفاده نمی‌شود.
async function seedTerm(studentName: string, startDate: string, lessonDay: number) {
  const loc = await db.query(`INSERT INTO locations (name) VALUES ($1) RETURNING id`, [`QA-LOC-${studentName}`]);
  const stu = await db.query(
    `INSERT INTO students (full_name, registered_on, lesson_duration, lesson_day, lesson_time, location_id)
     VALUES ($1, $2, 60, $3, '17:00', $4) RETURNING id`,
    [studentName, "2099-01-01", lessonDay, loc.rows[0].id],
  );
  const studentId = stu.rows[0].id as number;
  const term = await db.query(
    `INSERT INTO terms (student_id, start_date, expiry_date, tuition_amount, lesson_day, lesson_time, lesson_duration, location_name)
     VALUES ($1, $2, $3, 100, $4, '17:00', 60, $5) RETURNING id`,
    [studentId, startDate, "2099-12-31", lessonDay, `QA-LOC-${studentName}`],
  );
  return { studentId, termId: term.rows[0].id as number };
}

test("قید یکتا: ترم تکراری (student_id, start_date) با 23505 رد می‌شود", async () => {
  await seedTerm("QA_STUDENT_DUP", "2099-02-01", 6);
  await assert.rejects(
    db.query(
      `INSERT INTO terms (student_id, start_date, expiry_date, lesson_day, lesson_time, lesson_duration)
       VALUES ((SELECT id FROM students WHERE full_name='QA_STUDENT_DUP'), '2099-02-01', '2099-12-31', 6, '17:00', 60)`,
    ),
    (err: unknown) => (err as { code?: string }).code === "23505",
  );
});

test("ناوردای ترم: ساخت ترم دقیقاً ۴ جلسه‌ی منظم هفتگی در همان روز هفته تولید می‌کند", async () => {
  const { termId } = await seedTerm("QA_STUDENT_4", "2099-01-10", 6); // جمعه
  const dates = weeklyLessonDates("2099-01-10", 6);
  assert.equal(dates.length, 4);
  await db.query(
    `INSERT INTO lessons (term_id, lesson_number, scheduled_date, lesson_time)
     SELECT $1, n, d::date, '17:00' FROM unnest(ARRAY[$2,$3,$4,$5]) WITH ORDINALITY AS t(d,n)`,
    [termId, dates[0], dates[1], dates[2], dates[3]],
  );
  const lessons = await db.query(
    `SELECT lesson_number, scheduled_date, EXTRACT(DOW FROM scheduled_date) AS dow FROM lessons WHERE term_id = $1 ORDER BY lesson_number`,
    [termId],
  );
  assert.equal(lessons.rows.length, 4);
  assert.deepEqual(lessons.rows.map((r) => r.lesson_number), [1, 2, 3, 4]);
  for (const row of lessons.rows) assert.equal(Number(row.dow), 5, "همه‌ی جلسات روز جمعه‌اند");
});

test("قید یکتای جلسه: تکرار (term_id, lesson_number) رد می‌شود", async () => {
  const { termId } = await seedTerm("QA_STUDENT_UNIQ", "2099-03-01", 0);
  await db.query(`INSERT INTO lessons (term_id, lesson_number, scheduled_date, lesson_time) VALUES ($1, 1, '2099-03-07', '17:00')`, [termId]);
  await assert.rejects(
    db.query(`INSERT INTO lessons (term_id, lesson_number, scheduled_date, lesson_time) VALUES ($1, 1, '2099-03-08', '17:00')`, [termId]),
    (err: unknown) => (err as { code?: string }).code === "23505",
  );
});

test("چک‌قیود: مدت نامعتبر و شماره‌ی جلسه‌ی خارج از ۱..۴ رد می‌شوند", async () => {
  await assert.rejects(
    db.query(`INSERT INTO students (full_name, registered_on, lesson_duration, lesson_day, lesson_time) VALUES ('QA_BAD_DUR', '2099-01-01', 45, 0, '10:00')`),
    (err: unknown) => (err as { code?: string }).code === "23514",
  );
  const { termId } = await seedTerm("QA_STUDENT_CHK", "2099-04-01", 1);
  await assert.rejects(
    db.query(`INSERT INTO lessons (term_id, lesson_number, scheduled_date, lesson_time) VALUES ($1, 5, '2099-04-05', '17:00')`, [termId]),
    (err: unknown) => (err as { code?: string }).code === "23514",
  );
});

test("settings تک‌ردیفه است (F6): درج id≠1 رد می‌شود", async () => {
  await assert.rejects(
    db.query(`INSERT INTO settings (id) VALUES (2)`),
    (err: unknown) => (err as { code?: string }).code === "23514",
  );
});
