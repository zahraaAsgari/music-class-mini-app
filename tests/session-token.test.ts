import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PREVIEW_TEACHER_ID,
  SESSION_TTL_SECONDS,
  createSessionToken,
  sessionIdentityMatchesMode,
  verifySessionToken,
} from "@/lib/session-token";

/** تست توکن نشست + تطبیق حالت احراز هویت (قانون F2) — مقادیر ساختگی. */
const SECRET = "qa-secret-64hex-not-production";

test("صدور و تأیید توکن: همان شناسه برمی‌گردد و TTL اعمال شده", () => {
  const now = 1_760_000_000;
  const token = createSessionToken(424242, SECRET, now);
  assert.equal(verifySessionToken(token, SECRET, now + 60), 424242);
  const exp = Number(token.split(".")[2]);
  assert.equal(exp, Math.floor(now) + SESSION_TTL_SECONDS);
});

test("امضای دست‌کاری‌شده رد می‌شود", () => {
  const token = createSessionToken(424242, SECRET);
  const tampered = token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");
  assert.equal(verifySessionToken(tampered, SECRET), null);
});

test("راز اشتباه رد می‌شود", () => {
  const token = createSessionToken(424242, SECRET);
  assert.equal(verifySessionToken(token, "another-secret"), null);
});

test("توکن منقضی رد می‌شود", () => {
  const t0 = 1_760_000_000;
  const token = createSessionToken(424242, SECRET, t0);
  assert.equal(verifySessionToken(token, SECRET, t0 + SESSION_TTL_SECONDS + 1), null);
});

test("ورودی‌های ناسازگار رد می‌شوند", () => {
  assert.equal(verifySessionToken("", SECRET), null);
  assert.equal(verifySessionToken("abc", SECRET), null);
  assert.equal(verifySessionToken("v2.5.999999.abc", SECRET), null);
  assert.equal(verifySessionToken("v1.5.notanumber.abc", SECRET), null);
  assert.equal(verifySessionToken(createSessionToken(1, SECRET), ""), null); // فقدان راز = رد همیشگی
});

test("تطبیق حالت واقعی: فقط شناسه‌ی مجاز فعلی معتبر است (F2)", () => {
  const cfg = { hasBotToken: true, allowedTeacherId: 424242, previewAllowed: true };
  assert.equal(sessionIdentityMatchesMode(424242, cfg), true);
  assert.equal(sessionIdentityMatchesMode(PREVIEW_TEACHER_ID, cfg), false, "نشست پیش‌نمایش در حالت واقعی رد می‌شود");
  assert.equal(sessionIdentityMatchesMode(999999, cfg), false, "نشست استادِ سابق (شناسه‌ی مجاز تغییرکرده) رد می‌شود");
});

test("تطبیق حالت واقعی بدون TEACHER_TELEGRAM_ID: fail-closed", () => {
  const cfg = { hasBotToken: true, allowedTeacherId: null, previewAllowed: true };
  assert.equal(sessionIdentityMatchesMode(424242, cfg), false);
  assert.equal(sessionIdentityMatchesMode(PREVIEW_TEACHER_ID, cfg), false);
});

test("تطبیق حالت بدون توکن: فقط نشست پیش‌نمایش و فقط در مجازبودن (F2)", () => {
  assert.equal(sessionIdentityMatchesMode(PREVIEW_TEACHER_ID, { hasBotToken: false, allowedTeacherId: null, previewAllowed: true }), true);
  assert.equal(sessionIdentityMatchesMode(PREVIEW_TEACHER_ID, { hasBotToken: false, allowedTeacherId: null, previewAllowed: false }), false, "پس از خاموش‌شدن پیش‌نمایش نشستش باطل است");
  assert.equal(sessionIdentityMatchesMode(12345, { hasBotToken: false, allowedTeacherId: null, previewAllowed: true }), false);
});
