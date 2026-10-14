import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { locations, settings } from "@/db/schema";
import { requireTeacher, isPreviewAuthAllowed } from "@/lib/auth";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ambient";
import { SettingsPanels } from "@/components/settings-panels";

export const dynamic = "force-dynamic";

/** تنظیمات: تعرفه‌های پیش‌فرض، مکان‌های ذخیره‌شده و شرایط کلاس. */
export default async function SettingsPage() {
  const session = await requireTeacher();
  if (!session) return <AuthGate allowPreview={isPreviewAuthAllowed()} />;

  const [rows, allLocations] = await Promise.all([
    db.select().from(settings).where(eq(settings.id, 1)).limit(1),
    db.select().from(locations).orderBy(asc(locations.name)),
  ]);
  const config = rows[0] ?? null;

  return (
    <AppShell>
      <PageHeader title="تنظیمات" subtitle="تعرفه‌ها فقط پیش‌پرکننده‌ی فرم‌ها هستند؛ سوابق ثبت‌شده تغییر نمی‌کند." />
      <SettingsPanels
        fees={{
          tuition30: config?.tuition30 ?? null,
          tuition60: config?.tuition60 ?? null,
          extraFee30: config?.extraFee30 ?? null,
          extraFee60: config?.extraFee60 ?? null,
        }}
        classConditions={config?.classConditions ?? null}
        locations={allLocations.map((l) => ({ id: l.id, name: l.name }))}
      />
    </AppShell>
  );
}
