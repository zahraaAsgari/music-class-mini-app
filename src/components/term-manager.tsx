"use client";

import { useActionState, useState, useTransition } from "react";
import { BadgePercent, CalendarPlus, ChevronDown, Hourglass, MapPin, Banknote, CheckCheck } from "lucide-react";
import { createTerm, setTermPaid } from "@/actions/terms";
import type { FormState } from "@/lib/forms";
import { addMonthsClamped, faDate, faNum } from "@/lib/datetime";
import { ActionButton, Badge, Card, EmptyState, Field, Input, SubmitButton } from "./ui";
import { LessonRow, type LessonView } from "./lesson-row";

export interface TermView {
  id: number;
  isCurrent: boolean;
  startFa: string;
  expiryFa: string;
  /** مثلاً «۳ روز مانده» یا «اعتبار سپری شده» یا null */
  expiryHint: string | null;
  expiryUrgent: boolean;
  tuitionFa: string;
  isPaid: boolean;
  scheduleFa: string;
  locationName: string | null;
  used: number;
  absent: number;
  remaining: number;
  lessons: LessonView[];
}

/* ══════════════════════ فرم ترم جدید ══════════════════════ */

/**
 * ترم جدید: یک رکورد مستقل تاریخی. ۴ جلسه‌ی هفتگی در سرور و در یک تراکنش ساخته می‌شوند.
 * شهریه از تعرفه‌ی پیش‌فرض تنظیمات پیش‌پر می‌شود ولی همین‌جا کپی و قابل تغییر است —
 * تغییر تنظیمات بعداً اثری بر این ترم ندارد.
 */
export function NewTermPanel({
  studentId,
  defaultTuition,
  todayIso,
}: {
  studentId: number;
  defaultTuition: number | null;
  todayIso: string;
}) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(todayIso);
  const [expiryDate, setExpiryDate] = useState(addMonthsClamped(todayIso, 1));
  const [expiryTouched, setExpiryTouched] = useState(false);
  const [state, formAction] = useActionState<FormState, FormData>(createTerm, {});
  const fe = state.fieldErrors ?? {};

  // پس از ثبت موفق: پنل بسته و ورودی‌ها بازنشانی می‌شوند تا «ثبت دوباره» تصادفی
  // نشود؛ هنگام خطا (مثل ردِ تکرار) مقدارهای واردشده حفظ می‌مانند.
  // الگوی رسمی react.dev «Adjusting state during rendering» — جایگزین تأییدشده‌ی
  // setState داخل effect. نکته‌ی حیاتی: مقدار اولیه باید با state.ok (که می‌تواند
  // undefined باشد) هم‌نوع بماند تا شرط پس از تنظیم، کاذب شود؛ در غیر این صورت
  // undefined !== false همیشه درست است و به بازتولید بی‌نهایت می‌انجامد.
  const [prevOk, setPrevOk] = useState<boolean | undefined>(undefined);
  if (state.ok !== prevOk) {
    setPrevOk(state.ok);
    if (state.ok) {
      setOpen(false);
      setStartDate(todayIso);
      setExpiryDate(addMonthsClamped(todayIso, 1));
      setExpiryTouched(false);
    }
  }

  // تغییر شروع → پایان یک‌ماهه دوباره پیشنهاد می‌شود (مگر استاد دستی عوضش کرده باشد — قانون قابل لحاظ)
  const onStartChange = (value: string) => {
    setStartDate(value);
    if (!expiryTouched && value) setExpiryDate(addMonthsClamped(value, 1));
  };

  return (
    <div className="mt-3">
      {state.ok ? (
        <p className="mb-2 rounded-xl bg-jade-50 px-3 py-2 text-xs font-bold text-jade-700" role="status">
          ترم جدید با ۴ جلسه‌ی هفتگی ثبت شد.
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-jade-200 bg-jade-50/50 py-3 text-sm font-bold text-jade-800 transition hover:bg-jade-50"
      >
        <CalendarPlus size={16} aria-hidden />
        ترم جدید
      </button>

      {open ? (
        <Card className="mt-2">
          <form action={formAction} className="space-y-3.5">
            <input type="hidden" name="studentId" value={studentId} />
            {state.error ? (
              <p role="alert" className="rounded-xl bg-wine-100 px-3 py-2 text-xs font-bold text-wine-700">{state.error}</p>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <Field label="شروع ترم (میلادی)" htmlFor="startDate" error={fe.startDate} hint={faDate(startDate || todayIso, { year: true })}>
                <Input id="startDate" name="startDate" type="date" dir="ltr" className="text-left" value={startDate} onChange={(e) => onStartChange(e.target.value)} />
              </Field>
              <Field label="پایان اعتبار" htmlFor="expiryDate" error={fe.expiryDate} hint={faDate(expiryDate || todayIso, { year: true })}>
                <Input
                  id="expiryDate"
                  name="expiryDate"
                  type="date"
                  dir="ltr"
                  className="text-left"
                  value={expiryDate}
                  onChange={(e) => {
                    setExpiryTouched(true);
                    setExpiryDate(e.target.value);
                  }}
                />
              </Field>
            </div>

            <Field
              label="شهریه‌ی این ترم (تومان)"
              htmlFor="tuitionAmount"
              error={fe.tuitionAmount}
              hint={defaultTuition !== null ? `پیش‌پرشده از تعرفه‌ی تنظیمات: ${faNum(defaultTuition)} تومان — قابل تغییر` : "تعرفه‌ی پیش‌فرضی در تنظیمات ثبت نشده؛ مبلغ را اینجا وارد کنید."}
            >
              <Input
                id="tuitionAmount"
                name="tuitionAmount"
                inputMode="numeric"
                dir="ltr"
                className="text-left"
                defaultValue={defaultTuition ?? ""}
                placeholder="مثلاً 2400000"
              />
            </Field>

            <p className="rounded-xl bg-gold-100/60 px-3 py-2 text-[11px] leading-5 text-gold-700">
              <Hourglass size={12} className="ml-1 inline" aria-hidden />
              چهار جلسه‌ی منظم به‌صورت هفتگی از روز جلسه‌ی شاگرد ساخته می‌شود؛ ترم‌های قبلی دست‌نخورده باقی می‌مانند.
            </p>

            <SubmitButton className="w-full">ثبت ترم و ساخت ۴ جلسه</SubmitButton>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

/* ══════════════════════ تاریخچه‌ی ترم‌ها ══════════════════════ */

export function TermsHistory({ terms }: { terms: TermView[] }) {
  if (terms.length === 0) {
    return (
      <EmptyState
        icon={<BadgePercent />}
        title="هنوز ترمی ثبت نشده است"
        hint="با «ترم جدید»، چهار جلسه‌ی هفتگی بر اساس روز و ساعت شاگرد ساخته می‌شود."
      />
    );
  }
  return (
    <ul className="space-y-3">
      {terms.map((term) => (
        <TermCard key={term.id} term={term} />
      ))}
    </ul>
  );
}

function TermCard({ term }: { term: TermView }) {
  const [pending, startTransition] = useTransition();
  return (
    <li>
      <details
        open={term.isCurrent}
        className="group overflow-hidden rounded-3xl border border-cream-300/80 bg-cream-50/95 shadow-[0_10px_26px_rgba(24,62,58,0.07)]"
      >
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-jade-900">
              ترم {term.startFa}
              {term.isCurrent ? <Badge tone="jade">جاری</Badge> : null}
              {term.isPaid ? (
                <Badge tone="gold">
                  <CheckCheck size={11} aria-hidden /> تسویه شد
                </Badge>
              ) : (
                <Badge tone="wine">شهریه پرداخت‌نشده</Badge>
              )}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-jade-950/50">
              <span>{faNum(term.used)} برگزار</span>
              <span aria-hidden>·</span>
              <span>{faNum(term.absent)} غیبت</span>
              <span aria-hidden>·</span>
              <span className={term.remaining > 0 ? "font-bold text-jade-700" : ""}>{faNum(term.remaining)} باقی‌مانده</span>
              {term.expiryHint ? (
                <>
                  <span aria-hidden>·</span>
                  <span className={term.expiryUrgent ? "font-bold text-wine-700" : "text-gold-700"}>
                    <Hourglass size={10} className="ml-0.5 inline" aria-hidden />
                    {term.expiryHint}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <ChevronDown size={16} className="shrink-0 text-jade-950/30 transition-transform group-open:rotate-180" aria-hidden />
        </summary>

        <div className="border-t border-cream-300/70 p-3.5">
          {/* مشخصات عکس‌فوری ترم — مستقل از تنظیمات فعلی شاگرد */}
          <div className="mb-3 grid grid-cols-2 gap-2 text-[11px] leading-5 text-jade-950/60">
            <p>برنامه: {term.scheduleFa}</p>
            <p className="flex items-center gap-1">
              <MapPin size={11} aria-hidden />
              {term.locationName ?? "بدون مکان"}
            </p>
            <p className="flex items-center gap-1">
              <Banknote size={11} aria-hidden />
              شهریه: {term.tuitionFa}
            </p>
            <p>پایان اعتبار: {term.expiryFa}</p>
          </div>

          <div className="space-y-2">
            {term.lessons.map((lesson) => (
              <LessonRow key={lesson.id} lesson={lesson} />
            ))}
          </div>

          <div className="mt-3 border-t border-cream-300/70 pt-3">
            <ActionButton
              tone={term.isPaid ? "neutral" : "gold"}
              pending={pending}
              onClick={() => startTransition(async () => { await setTermPaid(term.id, !term.isPaid); })}
            >
              <Banknote size={13} aria-hidden />
              {term.isPaid ? "برگرداندن به پرداخت‌نشده" : "ثبت پرداخت شهریه"}
            </ActionButton>
          </div>
        </div>
      </details>
    </li>
  );
}
