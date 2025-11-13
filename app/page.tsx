"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { getQuestions, getHistory, Question, History } from "@/lib/data";
import { Home, Target, BarChart3, List } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface DashboardStats {
  total_questions_count: number;
  answered_questions_count: number;
  latest_attempt_correct_count: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const questions = await getQuestions();
        const history = await getHistory();

        const total_questions_count = questions.length;

        const answeredQuestionIds = new Set(history.map(h => h.question_id));
        const answered_questions_count = answeredQuestionIds.size;

        let latest_attempt_correct_count = 0;
        for (const questionId of answeredQuestionIds) {
          const questionHistory = history
            .filter(h => h.question_id === questionId)
            .sort((a, b) => new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime());
          if (questionHistory.length > 0 && questionHistory[0].result) {
            latest_attempt_correct_count++;
          }
        }

        setStats({
          total_questions_count,
          answered_questions_count,
          latest_attempt_correct_count,
        });
      } catch (e) {
        console.error("A critical error occurred while fetching stats:", e);
        setStats(null);
      }
      setIsLoading(false);
    };

    fetchStats();
  }, []);

  const correctRate = stats && stats.answered_questions_count > 0 
    ? Math.round((stats.latest_attempt_correct_count / stats.answered_questions_count) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12 pt-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2 text-balance">AWS SAA Quiz Memory</h1>
          <p className="text-muted-foreground text-balance">AWS認定ソリューションアーキテクト・アソシエイト試験対策</p>
        </div>

        {/* Main Actions */}
        <div className="grid gap-4">
          <Link href="/add">
            <Card className="p-6 hover:bg-card/80 transition-colors cursor-pointer border-border">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                  <List className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">問題管理</h3>
                  <p className="text-sm text-muted-foreground">問題の一覧、編集、削除</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/quiz">
            <Card className="p-6 hover:bg-card/80 transition-colors cursor-pointer border-border">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">クイズ開始</h3>
                  <p className="text-sm text-muted-foreground">ランダムな問題に挑戦する</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/history">
            <Card className="p-6 hover:bg-card/80 transition-colors cursor-pointer border-border">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">学習分析</h3>
                  <p className="text-sm text-muted-foreground">グラフや履歴で進捗を確認</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          {isLoading ? (
            <>
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </>
          ) : (
            <>
              <Card className="p-4 text-center border-border">
                <div className="text-2xl font-bold text-foreground">{stats?.total_questions_count ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">総問題数</div>
              </Card>
              <Card className="p-4 text-center border-border">
                <div className="text-2xl font-bold text-primary">{stats?.answered_questions_count ?? 0}</div>
                <div className="text-xs text-muted-foreground mt-1">出題済み問題</div>
              </Card>
              <Card className="p-4 text-center border-border">
                <div className="text-2xl font-bold text-foreground">{correctRate}%</div>
                <div className="text-xs text-muted-foreground mt-1">直近正答率</div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}