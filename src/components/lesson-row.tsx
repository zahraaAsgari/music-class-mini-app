"use client";

import { useState, useTransition } from "react";
import { Check, X, RotateCcw, Video, VideoOff, Repeat2, Pencil } from "lucide-react";
import { setLessonStatus, setLessonFollowups, rescheduleLesson } from "@/actions/lessons";
import { ActionButton, Badge, Input } from "./ui";

export interface LessonView {
  id: number;
  number: number;
  /** مثل «شنبه ۲ آبان» — از قبل در سرور قالب‌بندی شده */
  dateLabel: string;
  timeFa: string;
  status: "scheduled" | "present" | "absent";
  videoRequested: boolean;
  videoSent: boolean;
  makeupStatus: "none" | "pending" | "done";
  overdue: boolean;
  /** مقادیر خام برای فرم تغییر تاریخ */
  rawDate: string;
  rawTime: string;
}

/**
 * ردیف جلسه‌ی منظم: ثبت حضور + پیگیری‌های غیبت + تغییر تاریخ.
 * در پروفایل شاگرد و صفحه‌ی جلسات هر دو استفاده می‌شود (منطق حضور تک‌نسخه است).
 */
export function LessonRow({ lesson, title }: { lesson: LessonView; title?: string }) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(lesson.rawDate);
  const [time, setTime] = useState(lesson.rawTime);
  const [error, setError] = useState("");

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError("");
    startTransition(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
    });
  };

  const statusTone =
    lesson.status === "present" ? "text-jade-700" : lesson.status === "absent" ? "text-wine-700" : "text-jade-950/45";

  return (
    <div className={`rounded-2xl border p-3 ${lesson.overdue ? "border-wine-300/60 bg-wine-100/30" : "border-cream-300/80 bg-cream-100/60"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-jade-900/90 font-display text-sm text-gold-300" aria-hidden>
          {lesson.number}
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          {title ? <p className="truncate text-sm font-bold text-jade-900">{title}</p> : null}
          <p className={`text-xs font-bold ${statusTone}`}>
            {lesson.dateLabel}
            <span className="mx-1 text-jade-950/25" aria-hidden>·</span>
            {lesson.timeFa}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-jade-950/45">
            {lesson.status === "present" ? <span className="font-bold text-jade-700">برگزار شد</span> : null}
            {lesson.status === "absent" ? <span className="font-bold text-wine-700">غایب</span> : null}
            {lesson.status === "scheduled" && !lesson.overdue ? <span>برنامه‌ریزی شده</span> : null}
            {lesson.overdue ? <Badge tone="wine">هنوز ثبت نشده</Badge> : null}
            {lesson.status === "absent" && lesson.videoRequested && !lesson.videoSent ? (
              <Badge tone="gold">منتظر ویدیو</Badge>
            ) : null}
            {lesson.status === "absent" && lesson.makeupStatus === "pending" ? (
              <Badge tone="muted">جبرانی در انتظار</Badge>
            ) : null}
            {lesson.status === "absent" && lesson.makeupStatus === "done" ? (
              <Badge tone="jade">جبرانی انجام شد</Badge>
            ) : null}
          </p>
        </div>
      </div>

      {/* اکشن‌های حضور */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {lesson.status !== "present" ? (
          <ActionButton tone="present" pending={pending} onClick={() => run(() => setLessonStatus(lesson.id, "present"))}>
            <Check size={13} aria-hidden /> حاضر
          </ActionButton>
        ) : null}
        {lesson.status !== "absent" ? (
          <ActionButton tone="absent" pending={pending} onClick={() => run(() => setLessonStatus(lesson.id, "absent"))}>
            <X size={13} aria-hidden /> غایب
          </ActionButton>
        ) : null}
        {lesson.status !== "scheduled" ? (
          <ActionButton pending={pending} title="بازگشت به حالت ثبت‌نشده" onClick={() => run(() => setLessonStatus(lesson.id, "scheduled"))}>
            <RotateCcw size={13} aria-hidden /> بازنشانی
          </ActionButton>
        ) : null}
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-expanded={editing}
          aria-label="تغییر تاریخ جلسه"
          className="grid size-9 place-items-center rounded-lg border border-jade-100 bg-cream-50 text-jade-700 transition hover:bg-jade-50"
        >
          <Pencil size={13} aria-hidden />
        </button>
      </div>

      {/* پیگیری‌های غیبت */}
      {lesson.status === "absent" ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-wine-300/40 pt-2">
          <ActionButton
            tone={lesson.videoRequested ? "gold" : "neutral"}
            pending={pending}
            onClick={() =>
              run(() =>
                setLessonFollowups(lesson.id, {
                  videoRequested: !lesson.videoRequested,
                  videoSent: lesson.videoRequested ? false : lesson.videoSent,
                  makeupStatus: lesson.makeupStatus,
                }),
              )
            }
          >
            <Video size={13} aria-hidden /> درخواست ویدیو
          </ActionButton>
          <ActionButton
            tone={lesson.videoSent ? "present" : "neutral"}
            pending={pending}
            onClick={() =>
              run(() =>
                setLessonFollowups(lesson.id, {
                  videoRequested: lesson.videoRequested || !lesson.videoSent,
                  videoSent: !lesson.videoSent,
                  makeupStatus: lesson.makeupStatus,
                }),
              )
            }
          >
            {lesson.videoSent ? <VideoOff size={13} aria-hidden /> : <Video size={13} aria-hidden />}
            {lesson.videoSent ? "ویدیو ارسال شد" : "ویدیو ارسال نشده"}
          </ActionButton>
          <ActionButton
            tone={lesson.makeupStatus === "pending" ? "gold" : lesson.makeupStatus === "done" ? "present" : "neutral"}
            pending={pending}
            onClick={() =>
              run(() =>
                setLessonFollowups(lesson.id, {
                  videoRequested: lesson.videoRequested,
                  videoSent: lesson.videoSent,
                  makeupStatus:
                    lesson.makeupStatus === "none" ? "pending" : lesson.makeupStatus === "pending" ? "done" : "none",
                }),
              )
            }
          >
            <Repeat2 size={13} aria-hidden />
            {lesson.makeupStatus === "none"
              ? "جبرانی لازم دارد"
              : lesson.makeupStatus === "pending"
                ? "جبرانی انجام شد"
                : "بازنشانی جبرانی"}
          </ActionButton>
        </div>
      ) : null}

      {/* تغییر تاریخ/ساعت */}
      {editing ? (
        <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-cream-300/70 pt-2">
          <label className="text-[10px] font-bold text-jade-950/50">
            تاریخ (میلادی)
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} dir="ltr" className="mt-1 w-36 text-left text-xs" />
          </label>
          <label className="text-[10px] font-bold text-jade-950/50">
            ساعت
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} dir="ltr" className="mt-1 w-24 text-left text-xs" />
          </label>
          <ActionButton tone="gold" pending={pending} onClick={() => run(() => rescheduleLesson(lesson.id, date, time))}>
            ذخیره
          </ActionButton>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-[11px] font-bold text-wine-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
