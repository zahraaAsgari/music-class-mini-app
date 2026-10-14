"use client";

import { useActionState, useState, useTransition } from "react";
import { Banknote, MapPin, ScrollText, Plus, Trash2 } from "lucide-react";
import { addLocation, removeLocation, saveClassConditions, saveFees } from "@/actions/settings";
import type { FormState } from "@/lib/forms";
import { faNum, normalizeDigits } from "@/lib/datetime";
import { Card, Field, Input, SubmitButton, Textarea } from "./ui";

interface Fees {
  tuition30: number | null;
  tuition60: number | null;
  extraFee30: number | null;
  extraFee60: number | null;
}

/**
 * پنل تنظیمات با سه مسئولیت مجزا: تعرفه‌ها، مکان‌ها، شرایط کلاس.
 * هیچ مبلغی جعل نمی‌شود: فیلد خالی = «نامشخص» و فرم‌ها خودشان را پیش‌پر نمی‌کنند.
 */
export function SettingsPanels({
  fees,
  classConditions,
  locations,
}: {
  fees: Fees;
  classConditions: string | null;
  locations: { id: number; name: string }[];
}) {
  return (
    <div className="space-y-4">
      <FeesCard fees={fees} />
      <LocationsCard locations={locations} />
      <ConditionsCard initial={classConditions} />
      <p className="px-1 pb-2 text-[10px] leading-5 text-jade-950/40">
        نکته: شهریه و دستمزدِ ثبت‌شده برای هر ترم و جلسه، عکس‌فوریِ همان لحظه است و با تغییر
        این تعرفه‌ها به‌روز نمی‌شود — سوابق مالی پایدار می‌ماند.
      </p>
    </div>
  );
}

function SavedNote({ state }: { state: FormState }) {
  if (state.ok) {
    return (
      <p role="status" className="rounded-xl bg-jade-50 px-3 py-2 text-xs font-bold text-jade-700">
        ذخیره شد.
      </p>
    );
  }
  if (state.error) {
    return (
      <p role="alert" className="rounded-xl bg-wine-100 px-3 py-2 text-xs font-bold text-wine-700">
        {state.error}
      </p>
    );
  }
  return null;
}

function MoneyField({
  id,
  name,
  label,
  initial,
  error,
}: {
  id: string;
  name: string;
  label: string;
  initial: number | null;
  error?: string;
}) {
  const [value, setValue] = useState(initial?.toString() ?? "");
  const normalized = normalizeDigits(value).replace(/[٬,\s]/g, "");
  const numeric = Number(normalized);
  const hint =
    normalized !== "" && Number.isFinite(numeric) && numeric >= 0
      ? `نمایش: ${faNum(numeric)} تومان`
      : "خالی = نامشخص؛ جعل مبلغ نمی‌کنیم";
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint}>
      <Input
        id={id}
        name={name}
        inputMode="numeric"
        dir="ltr"
        className="text-left"
        value={value}
        placeholder="مثلاً 2400000"
        onChange={(e) => setValue(e.target.value)}
      />
    </Field>
  );
}

function FeesCard({ fees }: { fees: Fees }) {
  const [state, formAction] = useActionState<FormState, FormData>(saveFees, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-1.5 font-display text-xl text-jade-900">
        <Banknote size={17} className="text-gold-500" aria-hidden />
        تعرفه‌ها (تومان)
      </h2>
      <form action={formAction} className="space-y-3.5">
        <SavedNote state={state} />
        <div className="grid grid-cols-2 gap-3">
          <MoneyField id="tuition30" name="tuition30" label="شهریه‌ی ترم ۳۰ دقیقه" initial={fees.tuition30} error={fe.tuition30} />
          <MoneyField id="tuition60" name="tuition60" label="شهریه‌ی ترم ۶۰ دقیقه" initial={fees.tuition60} error={fe.tuition60} />
          <MoneyField id="extraFee30" name="extraFee30" label="اضافه‌ی ۳۰ دقیقه" initial={fees.extraFee30} error={fe.extraFee30} />
          <MoneyField id="extraFee60" name="extraFee60" label="اضافه‌ی ۶۰ دقیقه" initial={fees.extraFee60} error={fe.extraFee60} />
        </div>
        <SubmitButton className="w-full">ذخیره‌ی تعرفه‌ها</SubmitButton>
      </form>
    </Card>
  );
}

function LocationsCard({ locations }: { locations: { id: number; name: string }[] }) {
  const [state, formAction] = useActionState<FormState, FormData>(addLocation, {});
  const fe = state.fieldErrors ?? {};
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-1.5 font-display text-xl text-jade-900">
        <MapPin size={17} className="text-gold-500" aria-hidden />
        مکان‌های ذخیره‌شده
      </h2>
      {locations.length === 0 ? (
        <p className="mb-3 text-xs leading-5 text-jade-950/45">هنوز مکانی ذخیره نشده است.</p>
      ) : (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {locations.map((l) => (
            <LocationChip key={l.id} id={l.id} name={l.name} />
          ))}
        </ul>
      )}
      <form action={formAction} className="flex items-start gap-2">
        <div className="flex-1">
          {/* F13: label واقعی و مرتبط با فیلد (به‌جای تگ label خالی یا اتکا به aria-label) */}
          <Field label="نام مکان" error={fe.name} htmlFor="loc-name">
            <Input id="loc-name" name="name" placeholder="مثلاً خانه‌ی استاد — سعادت‌آباد" maxLength={60} />
          </Field>
        </div>
        <SubmitButton variant="gold" className="shrink-0">
          <Plus size={15} aria-hidden />
          افزودن
        </SubmitButton>
      </form>
      <SavedNote state={state} />
      <p className="mt-3 text-[10px] leading-5 text-jade-950/40">
        حذف یک مکان، مکانِ ترم‌های گذشته را تغییر نمی‌دهد (عکس‌فوری تاریخی حفظ می‌شود).
      </p>
    </Card>
  );
}

function LocationChip({ id, name }: { id: number; name: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <li className="flex items-center gap-1 rounded-full bg-wine-100 py-0.5 pl-1 pr-3 text-[11px] font-bold text-wine-700">
        <Trash2 size={11} aria-hidden />
        {name}؟
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => { await removeLocation(id); })}
          className="rounded-full bg-wine-700 px-2 py-0.5 text-[10px] text-cream-100 disabled:opacity-50"
        >
          تأیید
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="rounded-full px-1.5 text-[10px] text-wine-700">
          انصراف
        </button>
      </li>
    );
  }
  return (
    <li className="flex items-center gap-1 rounded-full bg-jade-50 py-1 pl-1 pr-3 text-[11px] font-bold text-jade-700">
      {name}
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`حذف ${name}`}
        className="grid size-5 place-items-center rounded-full text-jade-950/35 transition hover:bg-wine-100 hover:text-wine-700"
      >
        <Trash2 size={11} aria-hidden />
      </button>
    </li>
  );
}

function ConditionsCard({ initial }: { initial: string | null }) {
  const [state, formAction] = useActionState<FormState, FormData>(saveClassConditions, {});
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-1.5 font-display text-xl text-jade-900">
        <ScrollText size={17} className="text-gold-500" aria-hidden />
        شرایط کلاس
      </h2>
      <form action={formAction} className="space-y-3">
        <SavedNote state={state} />
        <Field label="متن توافق‌شده با شاگردان" htmlFor="conditions" hint="فقط یک متن ساده برای مرجع استاد — سیاست‌ساز خودکار ندارد.">
          <Textarea id="conditions" name="classConditions" rows={6} defaultValue={initial ?? ""} maxLength={3000} placeholder="مثلاً قوانین غیبت، تمرین هفتگی، تجهیزات…" />
        </Field>
        <SubmitButton className="w-full">ذخیره‌ی شرایط</SubmitButton>
      </form>
    </Card>
  );
}
