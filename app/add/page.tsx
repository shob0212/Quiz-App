// /add/page.tsx
import { Suspense } from "react";
import AddPageClient from "./AddPageClient"; // clientコンポーネントを呼び出す

export default function Page({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        読み込み中...
      </div>
    }>
      <AddPageClient searchParams={searchParams} />
    </Suspense>
  );
}
