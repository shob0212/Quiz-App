"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, X } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<any[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, number[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const resultsString = sessionStorage.getItem("quizResults");
    const answersString = sessionStorage.getItem("quizUserAnswers");

    if (resultsString && answersString) {
      setResults(JSON.parse(resultsString));
      setUserAnswers(JSON.parse(answersString));
    }
    setIsLoading(false);
  }, []);

  const totalQuestions = results.length;
  const correctAnswers = results.filter((r: any) => r.isCorrect).length;
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  const handleQuestionClick = (questionId: string) => {
    router.push(`/quiz/review?questionId=${questionId}`);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  }

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
        <h1 className="text-3xl font-bold text-foreground mb-6 text-center">クイズ結果</h1>

        <div className="mb-8 p-6 bg-secondary rounded-xl text-center">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-lg text-muted-foreground">正解数</p>
              <p className="text-4xl font-bold text-foreground my-1">
                {correctAnswers} <span className="text-xl text-muted-foreground">/ {totalQuestions}</span>
              </p>
            </div>
            <div>
              <p className="text-lg text-muted-foreground">正答率</p>
              <p className="text-4xl font-bold text-foreground my-1">{accuracy}<span className="text-xl text-muted-foreground">%</span></p>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-foreground mb-4">解答一覧</h2>
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
        <Link href="/quiz" className="mt-8 inline-block w-full">
          <Button className="w-full">出題設定に戻る</Button>
        </Link>
      </div>
    </div>
  )
}
