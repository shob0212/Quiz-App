"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { getQuestions, getHistory, getQuizSessions, Question, History, QuizSession } from "@/lib/data"
import { ArrowLeft, Check, X, Clock, Award, Zap, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

export default function QuizSessionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string

  const [quizSession, setQuizSession] = useState<QuizSession | null>(null)
  const [sessionHistory, setSessionHistory] = useState<History[]>([])
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      const allQuizSessions = await getQuizSessions()
      const currentQuizSession = allQuizSessions.find(s => s.id === sessionId)
      setQuizSession(currentQuizSession || null)

      if (currentQuizSession) {
        const allHistory = await getHistory()
        const historyForSession = allHistory.filter(h => h.quiz_session_id === sessionId)
        setSessionHistory(historyForSession)

        const allQuestions = await getQuestions()
        const questionIdsInSession = new Set(historyForSession.map(h => h.question_id))
        const questionsForSession = allQuestions.filter(q => questionIdsInSession.has(q.id))
        setSessionQuestions(questionsForSession)
      }
      setIsLoading(false)
    }
    fetchData()
  }, [sessionId])

  const questionsWithResults = useMemo(() => {
    if (!quizSession || sessionQuestions.length === 0 || sessionHistory.length === 0) return []

    return sessionHistory.map(h => {
      const question = sessionQuestions.find(q => q.id === h.question_id)
      return {
        history: h,
        question: question,
        isCorrect: h.result,
        userAnswer: null, // This would require storing user answers per question in history
        correctAnswer: question?.correct_answers,
      }
    }).sort((a,b) => new Date(b.history.answered_at).getTime() - new Date(a.history.answered_at).getTime());
  }, [quizSession, sessionQuestions, sessionHistory])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}分${secs}秒`;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!quizSession) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
        <h2 className="text-2xl font-bold mb-4">セッションが見つかりません</h2>
        <p className="text-muted-foreground mb-6">指定されたクイズセッションのデータは見つかりませんでした。</p>
        <Button onClick={() => router.push("/history")}>履歴画面に戻る</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/history">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">クイズセッション詳細</h1>
            <p className="text-sm text-muted-foreground">ID: {quizSession.id}</p>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="p-6 mb-6 border-border">
          <h2 className="text-lg font-semibold text-foreground mb-4">概要</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">開始日時:</p>
              <p className="font-medium">{new Date(quizSession.started_at).toLocaleString('ja-JP')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">終了日時:</p>
              <p className="font-medium">{new Date(quizSession.finished_at).toLocaleString('ja-JP')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">合計問題数:</p>
              <p className="font-medium">{quizSession.total_questions} 問</p>
            </div>
            <div>
              <p className="text-muted-foreground">正解数:</p>
              <p className="font-medium text-success">{quizSession.correct_count} 問</p>
            </div>
            <div>
              <p className="text-muted-foreground">不正解数:</p>
              <p className="font-medium text-destructive">{quizSession.incorrect_count} 問</p>
            </div>
            <div>
              <p className="text-muted-foreground">正答率:</p>
              <p className="font-medium">{quizSession.correct_rate}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">所要時間:</p>
              <p className="font-medium">{formatTime(quizSession.elapsed_time_seconds)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">カテゴリ:</p>
              <p className="font-medium">{quizSession.categories.join(', ')}</p>
            </div>
          </div>
        </Card>

        {/* Question Results List */}
        <h2 className="text-lg font-semibold text-foreground mb-4">問題ごとの結果</h2>
        <div className="space-y-3">
          {questionsWithResults.length > 0 ? (
            questionsWithResults.map((item, index) => (
              <Link key={item.history.id} href={`/add?highlight=${item.question?.id}`} passHref>
                <Card className="p-4 border-border hover:bg-card/80 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 ${
                        item.isCorrect ? "bg-success/10" : "bg-destructive/10"
                      }`}
                    >
                      {item.isCorrect ? (
                        <Check className="w-5 h-5 text-success" />
                      ) : (
                        <X className="w-5 h-5 text-destructive" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed mb-1">
                        {index + 1}. {item.question?.question || "問題が見つかりません"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        カテゴリ: {item.question?.category || "N/A"}
                      </p>
                      {/* User Answer vs Correct Answer - Requires storing user answer in history */}
                      {/* For now, just show correct/incorrect */}
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            <p className="text-muted-foreground">このセッションには問題履歴がありません。</p>
          )}
        </div>
      </div>
    </div>
  )
}
