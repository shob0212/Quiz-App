"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, X } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { getQuestions, Question } from "@/lib/data"

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<any[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, number[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isExamMode, setIsExamMode] = useState(false);
  const [unscoredIds, setUnscoredIds] = useState<string[]>([]);
  const [examScoredRate, setExamScoredRate] = useState<number | null>(null);
  const [examPass, setExamPass] = useState<boolean | null>(null);
  const [showIncorrectOnly, setShowIncorrectOnly] = useState(false);
  const [categoryStats, setCategoryStats] = useState<{ name: string; total: number; correct: number; rate: number }[]>([]);

  useEffect(() => {
    const resultsString = sessionStorage.getItem("quizResults");
    const answersString = sessionStorage.getItem("quizUserAnswers");
    const examMode = sessionStorage.getItem("examMode");
    const unscored = sessionStorage.getItem("unscoredQuestionIds");
    const scoredRate = sessionStorage.getItem("examScoredRate");
    const pass = sessionStorage.getItem("examPass");

    if (resultsString && answersString) {
      setResults(JSON.parse(resultsString));
      setUserAnswers(JSON.parse(answersString));
    }
    setIsExamMode(examMode === 'true');
    if (unscored) setUnscoredIds(JSON.parse(unscored));
    if (scoredRate) setExamScoredRate(JSON.parse(scoredRate));
    if (pass) setExamPass(JSON.parse(pass));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const computeCategoryStats = async () => {
      if (results.length === 0) return;
      const allQuestions: Question[] = await getQuestions();
      const qMap = new Map(allQuestions.map(q => [q.id, q]));
      const scored = isExamMode ? results.filter((r: any) => !unscoredIds.includes(r.questionId)) : results;
      const agg: Record<string, { total: number; correct: number }> = {};
      for (const r of scored) {
        const cat = qMap.get(r.questionId)?.category;
        if (!cat) continue;
        if (!agg[cat]) agg[cat] = { total: 0, correct: 0 };
        agg[cat].total++;
        if (r.isCorrect) agg[cat].correct++;
      }
      const stats = Object.entries(agg).map(([name, v]) => ({ name, total: v.total, correct: v.correct, rate: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0 }));
      stats.sort((a, b) => b.total - a.total);
      setCategoryStats(stats);
    };
    computeCategoryStats();
  }, [results, isExamMode, unscoredIds]);

  const totalQuestions = results.length;
  const correctAnswers = results.filter((r: any) => r.isCorrect).length;
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const filteredResults = showIncorrectOnly ? results.filter(r => !r.isCorrect) : results;
  const unscoredOrdered = results
    .filter((r: any) => unscoredIds.includes(r.questionId))
    .map((r: any) => r.questionId)
    .concat(unscoredIds.filter(id => !results.some((r: any) => r.questionId === id)));

  const handleQuestionClick = (questionId: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('resultsScrollY', `${window.scrollY}`);
    }
    router.push(`/quiz/review?questionId=${questionId}`);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedY = sessionStorage.getItem('resultsScrollY');
    if (savedY) {
      const y = parseFloat(savedY);
      requestAnimationFrame(() => {
        window.scrollTo({ top: Number.isFinite(y) ? y : 0, behavior: 'auto' });
      });
      sessionStorage.removeItem('resultsScrollY');
    }
  }, []);

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
        <h1 className="text-3xl font-bold text-foreground mb-6 text-center">{isExamMode ? '試験結果' : 'クイズ結果'}</h1>

        <div className="mb-8 p-6 bg-secondary rounded-xl">
          <div className="grid grid-cols-2 gap-4 text-center">
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
          {isExamMode && (
            <div className="mt-6 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-lg text-muted-foreground">採点対象の正答率</p>
                <p className="text-4xl font-bold my-1">{examScoredRate ?? 0}<span className="text-xl text-muted-foreground">%</span></p>
              </div>
              <div>
                <p className="text-lg text-muted-foreground">合否</p>
                <p className={`text-3xl font-bold my-1 ${examPass ? 'text-green-600' : 'text-red-600'}`}>{examPass ? '合格' : '不合格'}</p>
                <p className="text-sm text-muted-foreground">基準: 72%</p>
              </div>
            </div>
          )}
        </div>

        {isExamMode && (
          <div className="mb-8 p-6 border rounded-xl bg-white">
            <h2 className="text-lg font-semibold mb-2">採点対象外の問題（{unscoredIds.length}問）</h2>
            <p className="text-sm text-muted-foreground mb-4">本試験では非公開ですが、ここでは確認できます。</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {unscoredOrdered.map((id, idx) => {
                const r = results.find((x: any) => x.questionId === id);
                const label = r ? r.questionText : '問題を取得できませんでした';
                const orderIndex = results.findIndex((x: any) => x.questionId === id);
                const displayNumber = orderIndex >= 0 ? orderIndex + 1 : idx + 1;
                return (
                  <Card key={id} className="p-4 border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm">
                    <div className="text-xs font-semibold text-blue-700 mb-1">Question {displayNumber}</div>
                    <p className="text-sm font-medium text-foreground truncate" title={label}>{label}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-8 p-6 border rounded-xl bg-white">
          <h2 className="text-lg font-semibold mb-4">カテゴリ別内訳（{isExamMode ? '採点対象のみ' : '全問'}）</h2>
          {categoryStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">カテゴリ内訳はありません。</p>
          ) : (
            <div className="space-y-3">
              {categoryStats.map(stat => (
                <div key={stat.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{stat.name}</span>
                    <span className="text-sm text-muted-foreground">{stat.correct} / {stat.total}（{stat.rate}%）</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${stat.rate >= 70 ? 'bg-green-500' : stat.rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${stat.rate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">解答一覧</h2>
          <Button variant="outline" onClick={() => setShowIncorrectOnly(v => !v)}>{showIncorrectOnly ? '全て表示' : '不正解のみ'}</Button>
        </div>
        <div className="space-y-3">
          {filteredResults.map((result: any, index: number) => (
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
