import { test } from "node:test";
import assert from "node:assert/strict";
import {
  durationSchema,
  formRecord,
  idSchema,
  intSchema,
  isoDateSchema,
  optionalMoneySchema,
  optionalText,
  timeSchema,
  zodFieldErrors,
} from "@/lib/forms";
import { z } from "zod";

/** تست اعتبارسنجی ورودی zod — شامل ارقام فارسی/عربی، تاریخ‌ها و مبالغ. */

const money = optionalMoneySchema("شهریه");

test("مبلغ: ارقام فارسی و جداکننده هزارگان قبول، خالی null", () => {
  assert.equal(money.safeParse("۲۴۰۰۰۰۰").data, 2400000);
  assert.equal(money.safeParse("۲٬۴۰۰٬۰۰۰").data, 2400000);
  assert.equal(money.safeParse("2400000").data, 2400000);
  assert.equal(money.safeParse("").data, null);
});

test("مبلغ: منفی، متن و اعشار رد", () => {
  assert.equal(money.safeParse("-5").success, false);
  assert.equal(money.safeParse("abc").success, false);
  assert.equal(money.safeParse("1.5").success, false);
});

test("مدت جلسه: فقط ۳۰ یا ۶۰ — با تحمل ارقام فارسی", () => {
  assert.equal(durationSchema.safeParse("60").data, 60);
  assert.equal(durationSchema.safeParse("۳۰").data, 30);
  assert.equal(durationSchema.safeParse("45").success, false);
  assert.equal(durationSchema.safeParse("0").success, false);
});

test("تاریخ ISO: نامعتبرهای تقویمی رد، کبیسه بدون نقص", () => {
  assert.equal(isoDateSchema.safeParse("2025-02-30").success, false);
  assert.equal(isoDateSchema.safeParse("2026-02-29").success, false);
  assert.equal(isoDateSchema.safeParse("2024-02-29").success, true); // سال کبیسه
  assert.equal(isoDateSchema.safeParse("2026-10-14").success, true);
  assert.equal(isoDateSchema.safeParse("14/10/2026").success, false);
});

test("ساعت HH:MM", () => {
  assert.equal(timeSchema.safeParse("17:30").success, true);
  assert.equal(timeSchema.safeParse("25:00").success, false);
  assert.equal(timeSchema.safeParse("9:05").success, false); // قالب دو رقمی
});

test("شناسه: مثبتِ صحیح، ارقام فارسی پذیرفته می‌شود", () => {
  assert.equal(idSchema("شاگرد").safeParse("۷").data, 7);
  assert.equal(idSchema("شاگرد").safeParse("0").success, false);
  assert.equal(idSchema("شاگرد").safeParse("-3").success, false);
  assert.equal(intSchema("روز", 0, 6).safeParse("7").success, false);
});

test("optionalText: خالی → null و سقف طول", () => {
  const schema = optionalText(5, "طولانی");
  assert.equal(schema.safeParse("   ").data, null);
  assert.equal(schema.safeParse(" سلام ").data, "سلام");
  assert.equal(schema.safeParse("123456").success, false);
});

test("zodFieldErrors: نگاشت فیلد→اولین پیام", () => {
  const schema = z.object({ name: z.string().min(2, "کوتاه"), age: z.number({ error: "عدد نیست" }) });
  const parsed = schema.safeParse({ name: "آ", age: "x" });
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    const errors = zodFieldErrors(parsed.error);
    assert.equal(errors.name, "کوتاه");
    assert.equal(errors.age, "عدد نیست");
  }
});

test("formRecord: فقط مقدارهای رشته‌ای پذیرفته می‌شوند", () => {
  const fd = new FormData();
  fd.set("a", "۱۲");
  fd.set("b", new Blob(["x"]), "file.bin");
  const rec = formRecord(fd);
  assert.equal(rec.a, "۱۲");
  assert.equal(rec.b, undefined);
});
