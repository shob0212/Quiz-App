// /quiz/review/page.tsx
import { Suspense } from "react";
import ReviewPageClient from "./ReviewPageClient"; // clientコンポーネントを呼び出す

export default function Page({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        読み込み中...
      </div>
    }>
      <ReviewPageClient questionId={searchParams.questionId} />
    </Suspense>
  );
}
