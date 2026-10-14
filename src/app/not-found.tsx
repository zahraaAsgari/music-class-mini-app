import Link from "next/link";
import { House, Music3 } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-85 rounded-[2rem] border border-cream-300 bg-cream-50 p-8 text-center shadow-[0_20px_50px_rgba(24,62,58,0.1)]">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-jade-50 text-jade-700">
          <Music3 size={24} aria-hidden />
        </span>
        <h1 className="font-display mt-4 text-2xl text-jade-900">صفحه پیدا نشد</h1>
        <p className="mt-2 text-xs leading-6 text-jade-950/55">آنچه دنبالش بودید اینجا نیست.</p>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-jade-900 px-5 py-2.5 text-sm font-bold text-cream-100 transition hover:bg-jade-800"
        >
          <House size={15} aria-hidden />
          بازگشت به خانه
        </Link>
      </div>
    </main>
  );
}
