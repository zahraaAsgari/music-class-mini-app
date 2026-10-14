import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  addMonthsClamped,
  diffDays,
  faDigits,
  faMoney,
  faNum,
  faWeekday,
  normalizeDigits,
  todayISO,
  weeklyLessonDates,
} from "@/lib/datetime";

/** تست محاسبات تاریخ هفتگی، مرز ماه/کبیسه و رفتار منطقه‌ی زمانی تهران. */

test("weeklyLessonDates: روز کلاس = تاریخ شروع → شامل خودِ شروع، دقیقاً ۴ جلسه، فاصله‌ی ۷روزه", () => {
  // 2026-10-16 جمعه است (persianDay=6)
  const dates = weeklyLessonDates("2026-10-16", 6);
  assert.deepEqual(dates, ["2026-10-16", "2026-10-23", "2026-10-30", "2026-11-06"]);
  assert.equal(dates.length, 4);
  for (let i = 1; i < dates.length; i++) assert.equal(diffDays(dates[i - 1], dates[i]), 7);
  for (const d of dates) assert.equal(faWeekday(d), "جمعه");
});

test("weeklyLessonDates: روز کلاس متفاوت از شروع → انتقال به هفته‌ی جاری/بعد", () => {
  const dates = weeklyLessonDates("2026-10-17", 2); // شنبه شروع، کلاس دوشنبه
  assert.deepEqual(dates, ["2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09"]);
  for (const d of dates) assert.equal(faWeekday(d), "دوشنبه");
});

test("weeklyLessonDates: عبور از مرز سال درست است", () => {
  const dates = weeklyLessonDates("2026-12-30", 4); // چهارشنبه
  assert.deepEqual(dates, ["2026-12-30", "2027-01-06", "2027-01-13", "2027-01-20"]);
  for (const d of dates) assert.equal(faWeekday(d), "چهارشنبه");
});

test("addMonthsClamped: گیره‌ی آخر ماه و سال کبیسه", () => {
  assert.equal(addMonthsClamped("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonthsClamped("2024-01-31", 1), "2024-02-29"); // کبیسه
  assert.equal(addMonthsClamped("2026-10-14", 1), "2026-11-14");
  assert.equal(addMonthsClamped("2026-10-14", 12), "2027-10-14");
});

test("addDays و diffDays", () => {
  assert.equal(addDays("2026-10-14", 6), "2026-10-20");
  assert.equal(diffDays("2026-10-14", "2026-10-20"), 6);
  assert.equal(diffDays("2026-10-20", "2026-10-14"), -6);
  assert.equal(diffDays("2026-10-14", "2026-10-14"), 0);
});

test("todayISO: قالب ISO و بدون انحراف بیش از یک روز از تاریخ سیستم (منطقه‌ی تهران نزدیک UTC)", () => {
  const iso = todayISO();
  assert.match(iso, /^\d{4}-\d{2}-\d{2}$/);
  const sysDay = new Date().toISOString().slice(0, 10);
  assert.ok(Math.abs(diffDays(sysDay, iso)) <= 1);
});

test("faDigits/faNum/faMoney و نرمال‌سازی ارقام فارسی/عربی", () => {
  assert.equal(faDigits(240), "۲۴۰");
  assert.equal(normalizeDigits("۲۴۰۰۰۰۰"), "2400000");
  assert.equal(normalizeDigits("٢٤٠"), "240"); // ارقام عربی
  assert.match(faNum(1250000), /^۱٬۲۵۰٬۰۰۰$/);
  assert.equal(faMoney(null), "نامشخص");
  assert.match(faMoney(2800000), /تومان$/);
});
