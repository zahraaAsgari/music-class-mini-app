"use client";

import { useActionState, useState, useTransition } from "react";
import { Sparkles, Plus, Check, Ban, RotateCcw, Banknote, Trash2 } from "lucide-react";
import { addExtraLesson, deleteExtraLesson, setExtraPaid, setExtraStatus } from "@/actions/extras";
import type { FormState } from "@/lib/forms";
import { faDate, faDigits } from "@/lib/datetime";
import { ActionButton, Badge, Card, EmptyState, Field, Input, SubmitButton, Textarea } from "./ui";

export interface ExtraLessonView {
  id: number;
  dateFa: string;
  timeFa: string;
  durationFa: string;
  feeFa: string;
  status: "scheduled" | "completed" | "canceled";
  isPaid: boolean;
  notes: string | null;
}

/**
 * جلسات اضافه — فقط از مسیر پروفایل شاگرد (طبق الزامات، بدون تب جدا).
 * - از ۴ جلسه‌ی منظم ترم کم نمی‌شود (مدل داده کاملاً جداست).
 * - دستمزد از تعرفه‌ی پیش‌فرض پیش‌پر می‌شود ولی هنگام ثبت، مبلغِ همین رکورد ذخیره می‌شود.
 */
export function ExtraLessonsPanel({
  studentId,
  items,
  defaultFee30,
  defaultFee60,
  defaultDuration,
  defaultTime,
  todayIso,
}: {
  studentId: number;
  items: ExtraLessonView[];
  defaultFee30: number | null;
  defaultFee60: number | null;
  defaultDuration: number;
  defaultTime: string;
  /** «امروز» به وقت تهران — در سرور محاسبه و به‌صورت prop پاس داده می‌شود (F5: ایمن‌سازی hydration) */
  todayIso: string;
}) {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<number>(defaultDuration);
  const [date, setDate] = useState(todayIso);
  // fee فقط تا وقتی کاربر دستی تغییرش نداده با تغییر مدت به‌روز می‌شود
  const [fee, setFee] = useState<string>(
    (defaultDuration === 30 ? defaultFee30 : defaultFee60)?.toString() ?? "",
  );
  const [feeTouched, setFeeTouched] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(addExtraLesson, {});
  const fe = state.fieldErrors ?? {};

  // پس از ثبت موفق: فرم بسته و مقادیر به پیش‌فرض بازنشانی می‌شوند تا ثبتِ تصادفیِ
  // دوباره‌ی همان جلسه سخت شود؛ هنگام خطا مقدارهای واردشده حفظ می‌مانند.
  // الگوی رسمی react.dev «Adjusting state during rendering» (جایگزین effect).
  // مقدار اولیه هم‌نوع با state.ok (امکان undefined) — شرط پس از تنظیم کاذب می‌شود
  // و بازتولید بی‌نهایت رخ نمی‌دهد (رجوع به term-manager).
  const [prevOk, setPrevOk] = useState<boolean | undefined>(undefined);
  if (state.ok !== prevOk) {
    setPrevOk(state.ok);
    if (state.ok) {
      setOpen(false);
      setDuration(defaultDuration);
      setFee((defaultDuration === 30 ? defaultFee30 : defaultFee60)?.toString() ?? "");
      setFeeTouched(false);
      setDate(todayIso);
    }
  }

  const onDurationChange = (d: number) => {
    setDuration(d);
    if (!feeTouched) setFee((d === 30 ? defaultFee30 : defaultFee60)?.toString() ?? "");
  };

  return (
    <div>
      <div className="mt-6 mb-3 flex items-center justify-between">
        <h2 className="font-display flex items-center gap-1.5 text-xl text-jade-900">
          <Sparkles size={17} className="text-gold-500" aria-hidden />
          جلسات اضافه
        </h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-jade-100 bg-cream-50 px-3 text-xs font-bold text-jade-700 transition hover:bg-jade-50"
        >
          <Plus size={13} aria-hidden />
          ثبت جلسه‌ی اضافه
        </button>
      </div>

      {state.ok ? (
        <p className="mb-2 rounded-xl bg-jade-50 px-3 py-2 text-xs font-bold text-jade-700" role="status">
          جلسه‌ی اضافه ثبت شد — از سهمیه‌ی ترم کم نشد.
        </p>
      ) : null}

      {open ? (
        <Card className="mb-3">
          <form action={formAction} className="space-y-3.5">
            <input type="hidden" name="studentId" value={studentId} />
            {state.error ? (
              <p role="alert" className="rounded-xl bg-wine-100 px-3 py-2 text-xs font-bold text-wine-700">{state.error}</p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Field label="تاریخ (میلادی)" htmlFor="ex-date" error={fe.lessonDate} hint={faDate(date, { year: true })}>
                <Input id="ex-date" name="lessonDate" type="date" dir="ltr" className="text-left" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="ساعت" htmlFor="ex-time" error={fe.lessonTime}>
                <Input id="ex-time" name="lessonTime" type="time" dir="ltr" className="text-left" defaultValue={defaultTime} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="مدت جلسه" error={fe.duration}>
                <div role="radiogroup" aria-label="مدت جلسه‌ی اضافه" className="grid grid-cols-2 gap-2">
                  {[30, 60].map((d) => (
                    <label
                      key={d}
                      className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-xs font-bold transition ${
                        duration === d ? "border-jade-900 bg-jade-900 text-cream-100" : "border-jade-100 bg-cream-50 text-jade-800"
                      }`}
                    >
                      <input type="radio" name="duration" value={d} checked={duration === d} onChange={() => onDurationChange(d)} className="sr-only" />
                      {faDigits(d)} دقیقه
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="دستمزد (تومان)" htmlFor="ex-fee" error={fe.feeAmount} hint="قابل تغییر برای همین جلسه؛ بعداً ثابت می‌ماند.">
                <Input
                  id="ex-fee"
                  name="feeAmount"
                  inputMode="numeric"
                  dir="ltr"
                  className="text-left"
                  value={fee}
                  placeholder="مثلاً 700000"
                  onChange={(e) => {
                    setFeeTouched(true);
                    setFee(e.target.value);
                  }}
                />
              </Field>
            </div>
            <Field label="یادداشت (اختیاری)" htmlFor="ex-notes" error={fe.notes}>
              <Textarea id="ex-notes" name="notes" maxLength={300} placeholder="مثلاً تمرین ردیف برای جشنواره" />
            </Field>
            <SubmitButton className="w-full">ثبت جلسه‌ی اضافه</SubmitButton>
          </form>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <EmptyState icon={<Sparkles />} title="جلسه‌ی اضافه‌ای ثبت نشده است" />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <ExtraRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ExtraRow({ item }: { item: ExtraLessonView }) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const run = (fn: () => Promise<unknown>) => startTransition(async () => { await fn(); });

  const statusBadge =
    item.status === "completed" ? (
      <Badge tone="jade">برگزار شد</Badge>
    ) : item.status === "canceled" ? (
      <Badge tone="muted">لغو شد</Badge>
    ) : (
      <Badge tone="gold">برنامه‌ریزی شده</Badge>
    );

  return (
    <li className="rounded-2xl border border-cream-300/80 bg-cream-100/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-jade-900">
            {item.dateFa} <span className="mx-1 text-jade-950/25" aria-hidden>·</span> {item.timeFa}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-jade-950/45">
            <span>{item.durationFa}</span>
            <span aria-hidden>·</span>
            <span>{item.feeFa}</span>
            <span aria-hidden>·</span>
            {statusBadge}
            {item.isPaid ? <Badge tone="jade">پرداخت شد</Badge> : <Badge tone="wine">پرداخت‌نشده</Badge>}
          </p>
          {item.notes ? <p className="mt-1 text-[11px] leading-4 text-jade-950/55">{item.notes}</p> : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 border-t border-cream-300/70 pt-2">
        {item.status === "scheduled" ? (
          <>
            <ActionButton tone="present" pending={pending} onClick={() => run(() => setExtraStatus(item.id, "completed"))}>
              <Check size={13} aria-hidden /> برگزار شد
            </ActionButton>
            <ActionButton pending={pending} onClick={() => run(() => setExtraStatus(item.id, "canceled"))}>
              <Ban size={13} aria-hidden /> لغو
            </ActionButton>
          </>
        ) : (
          <ActionButton pending={pending} onClick={() => run(() => setExtraStatus(item.id, "scheduled"))}>
            <RotateCcw size={13} aria-hidden /> بازگشت
          </ActionButton>
        )}
        <ActionButton
          tone={item.isPaid ? "neutral" : "gold"}
          pending={pending}
          onClick={() => run(() => setExtraPaid(item.id, !item.isPaid))}
        >
          <Banknote size={13} aria-hidden />
          {item.isPaid ? "پرداخت‌نشده" : "پرداخت شد"}
        </ActionButton>
        {confirmDelete ? (
          <>
            <ActionButton
              tone="absent"
              pending={pending}
              onClick={() => run(() => deleteExtraLesson(item.id))}
            >
              <Trash2 size={13} aria-hidden /> تأیید حذف
            </ActionButton>
            <ActionButton pending={false} onClick={() => setConfirmDelete(false)}>انصراف</ActionButton>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="حذف جلسه‌ی اضافه"
            className="grid size-9 place-items-center rounded-lg border border-jade-100 bg-cream-50 text-wine-700 transition hover:bg-wine-100"
          >
            <Trash2 size={13} aria-hidden />
          </button>
        )}
      </div>
    </li>
  );
}
