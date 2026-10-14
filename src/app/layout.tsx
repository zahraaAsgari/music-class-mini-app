import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Vazirmatn, Lalezar } from "next/font/google";
import Script from "next/script";
import "./globals.css";

/**
 * دوفونتی مطابق راهنمای بصری:
 * - Lalezar: فقط عنوان‌های نمایشی انتخابی (سطح OFL، گلیف فارسی کامل).
 * - Vazirmatn: متن بدنه، فرم‌ها، اعداد و تاریخ‌ها (خوانا، وزن‌های محدود برای حجم کم).
 * next/font فونت‌ها را سلف‌هاست می‌کند: بدون درخواست خارجی و بدون CLS.
 */
const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-vazir",
});

const lalezar = Lalezar({
  subsets: ["arabic", "latin"],
  weight: "400",
  variable: "--font-lalezar",
});

export const metadata: Metadata = {
  title: "دفتر سه‌تار",
  description: "مینی‌اپ خصوصی مدیریت شاگردان، ترم‌ها و جلسات سه‌تار",
  applicationName: "Setar Ledger",
  // برنامه‌ی خصوصی استاد — هرگز ایندکس نشود
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // F11: زوم کاربر غیرفعال نمی‌شود؛ هیچ قید فنی مینی‌اپ تلگرام ممانعت‌کننده از
  // بزرگ‌نمایی ندارد و maximumScale/userScalable دسترس‌پذیری را می‌شکند.
  viewportFit: "cover",
  themeColor: "#F6F0E5",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body
        className={`${vazir.variable} ${lalezar.variable} font-sans text-jade-950 antialiased min-h-dvh`}
      >
        {/* SDK رسمی تلگرام: بعد از تعاملی‌شدن و غیرمسدودکننده؛ نبود CDN هرگز برنامه را متوقف نمی‌کند */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
