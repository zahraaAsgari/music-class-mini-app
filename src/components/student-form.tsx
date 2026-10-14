"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createStudent, updateStudent } from "@/actions/students";
import type { FormState } from "@/lib/forms";
import { DAY_NAMES_FA, faDate, faDigits } from "@/lib/datetime";
import { Card, Field, Input, Select, SubmitButton, Textarea } from "./ui";

export interface StudentFormInitial {
  id: number;
  fullName: string;
  phone: string | null;
  registeredOn: string;
  lessonDuration: number;
  lessonDay: number;
  lessonTime: string;
  locationId: number | null;
  notes: string | null;
  isActive: boolean;
}

const NEW_LOCATION = "__new__";

/**
 * فرم ایجاد/ویرایش شاگرد — مسئول واحد: ورودی و نمایش خطاها.
 * اعتبارسنجی معتبر در سرور انجام می‌شود؛ اینجا فقط تجربه‌ی کاربری است.
 * تاریخ ورودی input[type=date] میلادی است و معادل جلالی زیر آن نشان داده می‌شود.
 */
export function StudentForm({
  mode,
  locations,
  initial,
  defaultRegisteredOn,
  onSaved,
  onCancel,
}: {
  mode: "create" | "edit";
  locations: { id: number; name: string }[];
  initial?: StudentFormInitial;
  defaultRegisteredOn: string;
  onSaved?: (studentId: number) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const action = mode === "create" ? createStudent : updateStudent;
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [registeredOn, setRegisteredOn] = useState(initial?.registeredOn ?? defaultRegisteredOn);
  const [locationChoice, setLocationChoice] = useState<string>(
    initial?.locationId ? String(initial.locationId) : locations.length > 0 ? String(locations[0].id) : NEW_LOCATION,
  );
  const [duration, setDuration] = useState<number>(initial?.lessonDuration ?? 60);

  // پیمایش پس از موفقیت — اثر جانبی واقعی روی سیستم خارجی (router)
  useEffect(() => {
    if (state.ok && state.studentId) {
      if (mode === "create") router.push(`/students/${state.studentId}`);
      else onSaved?.(state.studentId);
    }
  }, [state, mode, router, onSaved]);

  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <form action={formAction} noValidate className="space-y-4">
        {mode === "edit" && initial ? <input type="hidden" name="studentId" value={initial.id} /> : null}

        {state.error ? (
          <p role="alert" className="rounded-xl bg-wine-100 px-3 py-2 text-xs font-bold text-wine-700">
            {state.error}
          </p>
        ) : null}

        <Field label="نام کامل" htmlFor="fullName" error={fe.fullName}>
          <Input id="fullName" name="fullName" defaultValue={initial?.fullName ?? ""} placeholder="مثلاً سارا محمدی" maxLength={80} autoComplete="off" />
        </Field>

        <Field label="شماره تماس (اختیاری)" htmlFor="phone" error={fe.phone}>
          <Input id="phone" name="phone" defaultValue={initial?.phone ?? ""} placeholder="۰۹۱۲…" inputMode="tel" maxLength={20} className="text-left" dir="ltr" autoComplete="off" />
        </Field>

        <Field label="تاریخ ثبت‌نام" htmlFor="registeredOn" error={fe.registeredOn} hint={`معادل جلالی: ${faDate(registeredOn, { year: true })}`}>
          <Input id="registeredOn" name="registeredOn" type="date" value={registeredOn} onChange={(e) => setRegisteredOn(e.target.value)} className="text-left" dir="ltr" />
        </Field>

        <Field label="مدت هر جلسه" error={fe.lessonDuration}>
          <div role="radiogroup" aria-label="مدت هر جلسه" className="grid grid-cols-2 gap-2">
            {[30, 60].map((d) => (
              <label
                key={d}
                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-bold transition ${
                  duration === d
                    ? "border-jade-900 bg-jade-900 text-cream-100 shadow-[0_4px_14px_rgba(24,62,58,0.25)]"
                    : "border-jade-100 bg-cream-50 text-jade-800 hover:bg-jade-50"
                }`}
              >
                <input
                  type="radio"
                  name="lessonDuration"
                  value={d}
                  checked={duration === d}
                  onChange={() => setDuration(d)}
                  className="sr-only"
                />
                {faDigits(d)} دقیقه
              </label>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="روز هفتگی جلسه" htmlFor="lessonDay" error={fe.lessonDay}>
            <Select id="lessonDay" name="lessonDay" defaultValue={String(initial?.lessonDay ?? 0)}>
              {DAY_NAMES_FA.map((name, i) => (
                <option key={i} value={i}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="ساعت جلسه" htmlFor="lessonTime" error={fe.lessonTime}>
            <Input id="lessonTime" name="lessonTime" type="time" defaultValue={initial?.lessonTime ?? "17:00"} className="text-left" dir="ltr" />
          </Field>
        </div>

        <Field label="مکان کلاس" error={fe.newLocationName ?? fe.locationId} hint="مکان‌های ذخیره‌شده قابل استفاده‌ی مجددند؛ مکان جدید همان‌جا ذخیره می‌شود.">
          <div className="space-y-2">
            <Select
              aria-label="مکان کلاس"
              name="locationId"
              value={locationChoice === NEW_LOCATION ? "" : locationChoice}
              onChange={(e) => setLocationChoice(e.target.value === "" ? NEW_LOCATION : e.target.value)}
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
              <option value="">{locations.length === 0 ? "بدون مکان — جدید بنویسید ↓" : "＋ مکان جدید / بدون مکان…"}</option>
            </Select>
            {locationChoice === NEW_LOCATION ? (
              <Input name="newLocationName" placeholder="مثلاً خانه‌ی استاد — سعادت‌آباد" maxLength={60} aria-label="نام مکان جدید" />
            ) : (
              <input type="hidden" name="newLocationName" value="" />
            )}
          </div>
        </Field>

        <Field label="یادداشت (اختیاری)" htmlFor="notes" error={fe.notes}>
          <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} placeholder="نکته‌ای درباره‌ی شاگرد…" maxLength={500} />
        </Field>

        <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-jade-100 bg-cream-50 px-3.5">
          <span className="text-sm font-medium text-jade-800">شاگرد فعال است</span>
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={initial?.isActive ?? true}
            className="size-5 accent-jade-900"
          />
        </label>

        <div className="flex items-center gap-2 pt-1">
          <SubmitButton className="flex-1">{mode === "create" ? "ثبت شاگرد" : "ذخیره‌ی تغییرات"}</SubmitButton>
          {onCancel ? (
            <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-jade-100 px-4 text-sm font-bold text-jade-700 transition hover:bg-jade-50">
              انصراف
            </button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
