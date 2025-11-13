"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getQuestions, getHistory, Question, History } from "@/lib/data"
import { Home, Plus, Target, BarChart3, ArrowLeft, Check, X, TrendingUp, Award, Calendar, Zap, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

// 画面表示用に加工したデータ型
interface AnalyticsData {
  id: string;
  question: string;
  isCorrect: boolean; // last attempt
  memoryLevel: number;
  attempts: number;
  lastAttempt: string | null;
  category: string;
}

export default function HistoryPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "weak" | "recent">("all")
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const questionsData = await getQuestions();
      const historyData = await getHistory();
      setQuestions(questionsData);
      setHistory(historyData);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleCategoryClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const categoryName = data.activePayload[0].payload.name;
      if (categoryName) {
        router.push(`/quiz?category=${encodeURIComponent(categoryName)}`);
      }
    }
  };

  // DBからのデータを画面表示用に加工する
  const analyticsData: AnalyticsData[] = useMemo(() => {
    if (questions.length === 0) return [];

    return questions.map(q => {
      const questionHistory = history.filter(h => h.question_id === q.id).sort((a, b) => new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime());
      const lastAttempt = questionHistory[0];

      return {
        id: q.id,
        question: q.question,
        isCorrect: lastAttempt ? lastAttempt.result : false,
        memoryLevel: Math.round(q.memory_strength),
        attempts: questionHistory.length,
        lastAttempt: q.last_answered ? new Date(q.last_answered).toLocaleDateString() : null,
        category: q.category,
      };
    });
  }, [questions, history]);

  // --- 以下、統計データの計算ロジック (analyticsDataを使用するように変更) ---
  const totalQuestions = analyticsData.length
  const correctCount = analyticsData.filter((h) => h.isCorrect).length
  const incorrectCount = totalQuestions - correctCount
  const correctRate = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
  const avgMemoryLevel = totalQuestions > 0 ? Math.round(analyticsData.reduce((sum, h) => sum + h.memoryLevel, 0) / totalQuestions) : 0
  const totalAttempts = analyticsData.reduce((sum, h) => sum + h.attempts, 0)

  const categoryStats = analyticsData.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = { total: 0, correct: 0, memoryLevel: 0 }
      }
      acc[item.category].total++
      if (item.isCorrect) acc[item.category].correct++
      acc[item.category].memoryLevel += item.memoryLevel
      return acc
    },
    {} as Record<string, { total: number; correct: number; memoryLevel: number }>,
  )

  const categoryData = Object.entries(categoryStats).map(([category, stats]) => ({
    category,
    total: stats.total,
    correctRate: Math.round((stats.correct / stats.total) * 100),
    avgMemoryLevel: Math.round(stats.memoryLevel / stats.total),
  }))

  const memoryDistribution = {
    high: analyticsData.filter((h) => h.memoryLevel >= 70).length,
    medium: analyticsData.filter((h) => h.memoryLevel >= 40 && h.memoryLevel < 70).length,
    low: analyticsData.filter((h) => h.memoryLevel < 40).length,
  }

  const memoryPieData = [
    { name: "高 (70%以上)", value: memoryDistribution.high, color: "hsl(var(--success))" },
    { name: "中 (40-69%)", value: memoryDistribution.medium, color: "hsl(var(--primary))" },
    { name: "低 (40%未満)", value: memoryDistribution.low, color: "hsl(var(--destructive))" },
  ]

  const categoryChartData = categoryData
    .sort((a, b) => b.avgMemoryLevel - a.avgMemoryLevel)
    .map((cat) => ({
      name: cat.category,
      正答率: cat.correctRate,
      記憶度: cat.avgMemoryLevel,
    }))

  const filteredHistory = analyticsData.filter((item) => {
    if (filter === "weak") return item.memoryLevel < 60
    // TODO: Implement recent filter based on lastAttempt date
    if (filter === "recent") return true 
    return true
  }).sort((a,b) => new Date(b.lastAttempt || 0).getTime() - new Date(a.lastAttempt || 0).getTime());

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }
  
  if (analyticsData.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
         <div className="flex items-center gap-4 mb-6 absolute top-6 left-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
        </div>
        <h2 className="text-2xl font-bold mb-4">学習履歴がありません</h2>
        <p className="text-muted-foreground mb-6">まだ1問も解答していません。クイズに挑戦しましょう！</p>
        <Link href="/quiz">
          <Button>クイズに挑戦する</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">学習分析</h1>
            <p className="text-sm text-muted-foreground">詳細なパフォーマンスデータ</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Card className="p-4 border-border bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{correctRate}%</div>
                <div className="text-xs text-muted-foreground">正答率</div>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-border bg-gradient-to-br from-success/5 to-success/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{avgMemoryLevel}%</div>
                <div className="text-xs text-muted-foreground">平均記憶度</div>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Target className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{totalQuestions}</div>
                <div className="text-xs text-muted-foreground">学習済み問題</div>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Zap className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{totalAttempts}</div>
                <div className="text-xs text-muted-foreground">総挑戦回数</div>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-5 mb-6 border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            記憶度分布
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={memoryPieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {memoryPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">高</div>
              <div className="text-lg font-bold text-success">{memoryDistribution.high}問</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">中</div>
              <div className="text-lg font-bold text-primary">{memoryDistribution.medium}問</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">低</div>
              <div className="text-lg font-bold text-destructive">{memoryDistribution.low}問</div>
            </div>
          </div>
        </Card>

        <Card className="p-5 mb-6 border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            カテゴリ別パフォーマンス
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} onClick={handleCategoryClick} className="cursor-pointer">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="正答率" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="記憶度" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Filters */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">問題一覧</h3>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className={filter === "all" ? "bg-primary text-primary-foreground" : "border-border"}
            >
              すべて
            </Button>
            <Button
              variant={filter === "weak" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("weak")}
              className={filter === "weak" ? "bg-primary text-primary-foreground" : "border-border"}
            >
              苦手
            </Button>
            <Button
              variant={filter === "recent" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("recent")}
              className={filter === "recent" ? "bg-primary text-primary-foreground" : "border-border"}
            >
              最近
            </Button>
          </div>
        </div>

        {/* Start Quiz Button */}
        <div className="mb-6">
          <Link href={`/quiz?filter=${filter}`} passHref>
            <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Zap className="w-4 h-4 mr-2" />
              {filter === 'weak' ? '苦手な問題でクイズ！' : (filter === 'recent' ? '最近の問題でクイズ！' : '全問題でクイズ！')}
            </Button>
          </Link>
        </div>

        {/* History List */}
        <div className="space-y-3">
          {filteredHistory.map((item) => (
            <Card key={item.id} className="p-4 border-border hover:bg-card/80 transition-colors">
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

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  {/* 上段：カテゴリと挑戦回数 */}
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
                      {item.category}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{item.attempts}回挑戦</span>
                  </div>

                  {/* 中段：問題文 */}
                  <div className="my-2">
                    <p className="text-sm text-foreground line-clamp-2 leading-relaxed">{item.question}</p>
                  </div>

                  {/* 下段：最終解答日と記憶度 */}
                  <div className="flex justify-between items-end gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{item.lastAttempt}</span>
                    <div className="w-24 text-right">
                      <div className="mb-1">
                        <span className="text-xs text-muted-foreground">記憶度 </span>
                        <span className="text-xs font-medium text-foreground">{item.memoryLevel}%</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            item.memoryLevel >= 70
                              ? "bg-success"
                              : item.memoryLevel >= 40
                                ? "bg-primary"
                                : "bg-destructive"
                          }`}
                          style={{ width: `${item.memoryLevel}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border" style={{ backgroundColor: 'rgb(230, 230, 230)' }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around h-16">
            <Link
              href="/"
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="text-xs font-medium">ホーム</span>
            </Link>
            <Link
              href="/add"
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <List className="w-5 h-5" />
              <span className="text-xs font-medium">管理</span>
            </Link>
            <Link
              href="/quiz"
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Target className="w-5 h-5" />
              <span className="text-xs font-medium">出題</span>
            </Link>
            <Link href="/history" className="flex flex-col items-center gap-1 text-primary">
              <BarChart3 className="w-5 h-5" />
              <span className="text-xs font-medium">履歴</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  )
}
