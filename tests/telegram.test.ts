import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { validateTelegramInitData } from "@/lib/telegram";

/**
 * تست‌های اعتبارسنجی initData تلگرام (پیاده‌سازی رسمی HMAC با کلید "WebAppData").
 * داده‌ها ساختگی‌اند؛ هیچ راز یا کاربر واقعی در تست‌ها استفاده نمی‌شود.
 */
const BOT = "1234567890:AA-TEST-BOT-TOKEN-NOT-REAL";

function mintInitData(
  opts: { botToken?: string; authAgeSeconds?: number; user?: unknown; omitUser?: boolean } = {},
): string {
  const botToken = opts.botToken ?? BOT;
  const authDate = Math.floor(Date.now() / 1000) - (opts.authAgeSeconds ?? 0);
  const params = new URLSearchParams();
  params.set("auth_date", String(authDate));
  if (!opts.omitUser) {
    params.set("user", JSON.stringify(opts.user ?? { id: 42, first_name: "QA" }));
  }
  const dcs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = crypto.createHmac("sha256", secret).update(dcs).digest("hex");
  return `${params.toString()}&hash=${hash}`;
}

test("داده‌ی معتبر پذیرفته می‌شود و کاربر + authDate برمی‌گردد", () => {
  const parsed = validateTelegramInitData(mintInitData(), BOT, 86400);
  assert.ok(parsed);
  assert.equal(parsed.user.id, 42);
  assert.ok(typeof parsed.authDate === "number" && parsed.authDate > 0);
});

test("هش دست‌کاری‌شده رد می‌شود (ته‌مانده‌ی payload یکسان، امضای متفاوت)", () => {
  const valid = mintInitData();
  const tampered = valid.replace(/hash=[0-9a-f]{64}$/, `hash=${"0".repeat(64)}`);
  assert.equal(validateTelegramInitData(tampered, BOT, 86400), null);
});

test("دست‌کاری مقدار user (بدون امضای مجدد) رد می‌شود", () => {
  const valid = mintInitData();
  // مقدار user عوض می‌شود ولی hash همان قبلی می‌ماند → امضا نامعتبر
  const forged = valid.replace(/user=[^&]+/, encodeURIComponent(JSON.stringify({ id: 999999 })));
  assert.equal(validateTelegramInitData(forged, BOT, 86400), null);
});

test("توکن اشتباه بات رد می‌شود", () => {
  assert.equal(validateTelegramInitData(mintInitData(), "999:WRONG-TOKEN", 86400), null);
});

test("auth_date کهنه (قدیمی‌تر از پنجره‌ی مجاز) رد می‌شود", () => {
  assert.equal(validateTelegramInitData(mintInitData({ authAgeSeconds: 90000 }), BOT, 86400), null);
});

test("auth_date از آینده با جهش غیرعادی رد می‌شود", () => {
  assert.equal(validateTelegramInitData(mintInitData({ authAgeSeconds: -600 }), BOT, 86400), null);
});

test("ورودی‌های ناقص رد می‌شوند", () => {
  assert.equal(validateTelegramInitData("", BOT, 86400), null);
  assert.equal(validateTelegramInitData("foo=bar", BOT, 86400), null);
  assert.equal(validateTelegramInitData("hash=abc", BOT, 86400), null);
  assert.equal(validateTelegramInitData(mintInitData({ omitUser: true }), BOT, 86400), null);
});

test("user بدون شناسه‌ی عددی رد می‌شود", () => {
  assert.equal(validateTelegramInitData(mintInitData({ user: { id: "42" } }), BOT, 86400), null);
  assert.equal(validateTelegramInitData(mintInitData({ user: { first_name: "X" } }), BOT, 86400), null);
});

test("شناسه‌ی کاربرِ غیرمجاز توسط لایه‌ی اعتبارسنجی قابل‌استخراج است تا مسیر ورود مقایسه کند (قرارداد F1)", () => {
  // self-check: خودِ validate فقط حامل هویت است؛ تطبیق با TEACHER_TELEGRAM_ID
  // در مسیر /api/auth و در تطبیق حالت نشست (session-token.test.ts) پوشش داده می‌شود.
  const parsed = validateTelegramInitData(mintInitData({ user: { id: 424242 } }), BOT, 86400);
  assert.ok(parsed);
  assert.notEqual(parsed.user.id, 42);
});
