import crypto from "crypto";

/**
 * اعتبارسنجی initData مینی‌اپ تلگرام دقیقاً طبق مستندات رسمی:
 * secret = HMAC_SHA256(key="WebAppData", message=bot_token)
 * hash   = HMAC_SHA256(key=secret, message=data_check_string)
 * الگوی تأییدشده از پروژه‌ی مرجع (بدون تغییر منطقی) + تازگی auth_date.
 */
export interface TelegramInitUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface ParsedInitData {
  user: TelegramInitUser;
  authDate: number;
}

export function validateTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number,
): ParsedInitData | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    const pairs: string[] = [];
    for (const [key, value] of params.entries()) {
      if (key === "hash") continue;
      pairs.push(`${key}=${value}`);
    }
    pairs.sort();
    const dataCheckString = pairs.join("\n");

    const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const computed = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");

    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const authDate = Number(params.get("auth_date") ?? "0");
    if (!authDate) return null;
    const age = Math.floor(Date.now() / 1000) - authDate;
    if (maxAgeSeconds > 0 && (age > maxAgeSeconds || age < -60)) return null;

    const userJson = params.get("user");
    if (!userJson) return null;
    const user = JSON.parse(userJson) as TelegramInitUser;
    if (!user || typeof user.id !== "number") return null;

    return { user, authDate };
  } catch {
    return null;
  }
}
