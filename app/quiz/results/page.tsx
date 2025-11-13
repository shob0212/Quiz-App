"use client"

import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, X } from "lucide-react"

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resultsString = searchParams.get("results") || "[]";
  const results = JSON.parse(resultsString);
  const userAnswers = JSON.parse(searchParams.get("answers") || "{}");

  const handleQuestionClick = (questionId: string) => {
    const answers = userAnswers[questionId] || [];
    router.push(`/quiz/review?questionId=${questionId}&userAnswers=${JSON.stringify(answers)}&results=${resultsString}`);
  };

  if (results.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-lg text-muted-foreground mb-4">結果データが見つかりません。</p>
        <Button onClick={() => router.push("/")}>ホームに戻る</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">クイズ結果</h1>
        <div className="space-y-3">
          {results.map((result: any, index: number) => (
            <Card key={result.questionId} onClick={() => handleQuestionClick(result.questionId)} className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50">
              <p className="flex-1 font-medium text-foreground">問題 {index + 1}: {result.questionText}</p>
              <div className="flex items-center gap-2">
                {result.isCorrect ? (
                  <Check className="w-6 h-6 text-green-500" />
                ) : (
                  <X className="w-6 h-6 text-red-500" />
                )}
              </div>
            </Card>
          ))}
        </div>
        <Link href="/" className="mt-8 inline-block w-full">
          <Button className="w-full">ホームに戻る</Button>
        </Link>
      </div>
    </div>
  )
}
