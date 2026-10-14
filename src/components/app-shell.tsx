import type { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";

/** پوسته‌ی مشترک صفحات پس از احراز هویت: محتوا + فاصله‌ی ناوبری پایین. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md">
      <main className="px-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-5">{children}</main>
      <BottomNav />
    </div>
  );
}
