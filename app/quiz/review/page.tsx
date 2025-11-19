// /quiz/play/review/page.tsx
import { Suspense } from "react";
import AddPageClient from "./ReviewPageClient"; // clientコンポーネントを呼び出す

export default function Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        読み込み中...
      </div>
    }>
      <AddPageClient />
    </Suspense>
  );
}
