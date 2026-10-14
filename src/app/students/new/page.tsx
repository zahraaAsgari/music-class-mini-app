import { db } from "@/db";
import { locations, settings } from "@/db/schema";
import { requireTeacher, isPreviewAuthAllowed } from "@/lib/auth";
import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/ambient";
import { StudentForm } from "@/components/student-form";
import { todayISO } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  const session = await requireTeacher();
  if (!session) return <AuthGate allowPreview={isPreviewAuthAllowed()} />;

  const allLocations = await db.select().from(locations).orderBy(locations.name);

  return (
    <AppShell>
      <PageHeader title="شاگرد جدید" subtitle="مشخصات و برنامه‌ی هفتگی شاگرد را ثبت کنید." />
      <StudentForm
        mode="create"
        locations={allLocations.map((l) => ({ id: l.id, name: l.name }))}
        defaultRegisteredOn={todayISO()}
      />
    </AppShell>
  );
}
