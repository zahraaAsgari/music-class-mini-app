"use client";

import { useState, useTransition } from "react";
import { Pencil, Phone, CalendarDays, MapPin, StickyNote, UserCheck, UserX } from "lucide-react";
import { setStudentActive } from "@/actions/students";
import { ActionButton, Badge, Card } from "./ui";
import { StudentForm, type StudentFormInitial } from "./student-form";

export interface StudentProfile {
  initial: StudentFormInitial;
  registeredFa: string;
  scheduleFa: string;
  locationName: string | null;
  phoneFa: string | null;
}

/** کارت اطلاعات شاگرد + ویرایش درجا + فعال/غیرفعال. */
export function StudentInfoPanel({
  student,
  locations,
}: {
  student: StudentProfile;
  locations: { id: number; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const { initial } = student;

  return (
    <Card className="mt-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-jade-900 font-display text-xl text-gold-300" aria-hidden>
            {initial.fullName.trim().charAt(0)}
          </span>
          <div>
            <h1 className="font-display text-2xl leading-snug text-jade-900">{initial.fullName}</h1>
            <div className="mt-0.5 flex items-center gap-1.5">
              {initial.isActive ? <Badge tone="jade">فعال</Badge> : <Badge tone="muted">غیرفعال</Badge>}
            </div>
          </div>
        </div>
      </div>

      {!editing ? (
        <>
          <dl className="mt-3 space-y-1.5 border-t border-cream-300/70 pt-3 text-xs leading-5 text-jade-950/65">
            <div className="flex items-center gap-2">
              <CalendarDays size={13} className="shrink-0 text-jade-400" aria-hidden />
              <dt className="sr-only">برنامه‌ی هفتگی</dt>
              <dd>{student.scheduleFa}</dd>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={13} className="shrink-0 text-jade-400" aria-hidden />
              <dt className="sr-only">مکان</dt>
              <dd>{student.locationName ?? "مکان ثبت نشده"}</dd>
            </div>
            {student.phoneFa ? (
              <div className="flex items-center gap-2">
                <Phone size={13} className="shrink-0 text-jade-400" aria-hidden />
                <dt className="sr-only">تماس</dt>
                <dd>
                  <a href={`tel:${initial.phone ?? ""}`} className="text-jade-700 underline decoration-gold-400 underline-offset-4" dir="ltr">
                    {student.phoneFa}
                  </a>
                </dd>
              </div>
            ) : null}
            {initial.notes ? (
              <div className="flex items-start gap-2">
                <StickyNote size={13} className="mt-1 shrink-0 text-jade-400" aria-hidden />
                <dt className="sr-only">یادداشت</dt>
                <dd className="leading-5">{initial.notes}</dd>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <dt className="sr-only">ثبت‌نام</dt>
              <dd className="text-[10px] text-jade-950/40">ثبت‌نام: {student.registeredFa}</dd>
            </div>
          </dl>

          <div className="mt-3 flex gap-1.5 border-t border-cream-300/70 pt-3">
            <ActionButton onClick={() => setEditing(true)}>
              <Pencil size={13} aria-hidden /> ویرایش مشخصات
            </ActionButton>
            <ActionButton
              tone={initial.isActive ? "absent" : "present"}
              pending={pending}
              onClick={() => startTransition(async () => { await setStudentActive(initial.id, !initial.isActive); })}
            >
              {initial.isActive ? (
                <>
                  <UserX size={13} aria-hidden /> غیرفعال‌سازی
                </>
              ) : (
                <>
                  <UserCheck size={13} aria-hidden /> فعال‌سازی مجدد
                </>
              )}
            </ActionButton>
          </div>
        </>
      ) : (
        <div className="mt-3 border-t border-cream-300/70 pt-3">
          <StudentForm
            mode="edit"
            initial={initial}
            locations={locations}
            defaultRegisteredOn={initial.registeredOn}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
    </Card>
  );
}
