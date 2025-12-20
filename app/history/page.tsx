"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getQuestions, getHistory, getQuizSessions, Question, History, QuizSession } from "@/lib/data"
import { Home, Plus, Target, BarChart3, ArrowLeft, Check, X, TrendingUp, Award, Calendar, Zap, List, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
interface QuestionAnalytics {
  id: string;
  question: string;
  isCorrect: boolean | null; // null if never attempted
  attempts: number;
  lastAttempt: string | null;
  category: string;
}


export default function HistoryPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [quizSessions, setQuizSessions] = useState<QuizSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"standard" | "exam">("standard");
  const [categorySortKey, setCategorySortKey] = useState<'学習率' | '正答率'>('正答率');
  const [categorySortOrder, setCategorySortOrder] = useState<'asc' | 'desc'>('desc');

  const standardSessions = useMemo(() => quizSessions.filter(s => !s.is_exam_mode), [quizSessions]);
  const examSessions = useMemo(() => quizSessions.filter(s => s.is_exam_mode), [quizSessions]);
  const examSessionIdSet = useMemo(() => new Set(examSessions.map(s => s.id)), [examSessions]);
  const historyForStats = useMemo(() => history.filter(h => !h.quiz_session_id || !examSessionIdSet.has(h.quiz_session_id)), [history, examSessionIdSet]);

  const questionAnalytics = useMemo(() => {
    if (questions.length === 0) return [];

    return questions.map(q => {
      const questionHistory = historyForStats.filter(h => h.question_id === q.id).sort((a, b) => new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime());
      const lastAttempt = questionHistory[0]; // Most recent attempt

      return {
        id: q.id,
        question: q.question,
        isCorrect: lastAttempt ? lastAttempt.result : null, // null if never attempted
        attempts: questionHistory.length,
        lastAttempt: q.last_answered ? new Date(q.last_answered).toLocaleDateString() : null,
        category: q.category,
      };
    });
  }, [questions, historyForStats]);

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const questionsData = await getQuestions();
      const historyData = await getHistory();
      const quizSessionsData = await getQuizSessions(); // Fetch quiz sessions
      
      const uniqueSessions = Array.from(new Map(quizSessionsData.map(session => [session.id, session])).values());

      setQuestions(questionsData);
      setHistory(historyData);
      setQuizSessions(uniqueSessions); 
      setIsLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (standardSessions.length === 0 && examSessions.length > 0) {
      setActiveTab("exam");
      setIsSelectionMode(false);
      setSelectedSessionIds([]);
    } else if (standardSessions.length > 0) {
      setActiveTab("standard");
    }
  }, [standardSessions.length, examSessions.length]);

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessionIds(prev =>
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedSessionIds.length === 0) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/quiz-sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedSessionIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete sessions');
      }

      setQuizSessions(prev => prev.filter(session => !selectedSessionIds.includes(session.id)));
      setSelectedSessionIds([]);
      setIsSelectionMode(false); // 選択モードを終了
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEnterSelectionMode = () => {
    setIsSelectionMode(true);
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedSessionIds([]);
  };

  const handleCardClick = (session: QuizSession) => {
    if (isSelectionMode) {
      handleSessionSelect(session.id);
    } else {
      router.push(`/quiz/session/${session.id}`);
    }
  };

  // --- クイズセッションに基づく統計データ ---
  const totalQuestionsInSystem = questions.length;
  const totalQuizSessions = standardSessions.length;
  const avgCorrectRate = totalQuizSessions > 0 ? Math.round(standardSessions.reduce((sum, s) => sum + s.correct_rate, 0) / totalQuizSessions) : 0;
  const totalQuestionsAnsweredInSessions = standardSessions.reduce((sum, s) => sum + s.total_questions, 0);
  const uniqueAnsweredQuestionsCount = new Set(historyForStats.map(h => h.question_id)).size;

  const cardCorrectRate = avgCorrectRate;
  const cardLearnedQuestionsCount = totalQuizSessions;
  const cardTotalQuestionsInSystem = totalQuestionsInSystem;
  const cardTotalAttempts = totalQuestionsAnsweredInSessions;

  const answeredCorrectly = questionAnalytics.filter(item => item.isCorrect === true).length;
  const answeredIncorrectly = questionAnalytics.filter(item => item.isCorrect === false).length;
  const neverAnswered = questionAnalytics.filter(item => item.isCorrect === null).length;

  const correctnessPieData = [
    { name: "最終正解", value: answeredCorrectly, color: "hsl(var(--success))" },
    { name: "最終不正解", value: answeredIncorrectly, color: "hsl(var(--destructive))" },
    { name: "未回答", value: neverAnswered, color: "hsl(var(--muted-foreground))" },
  ];

  const handleCategoryClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const categoryName = data.activePayload[0].payload.name;
      if (categoryName) {
        router.push(`/quiz?category=${encodeURIComponent(categoryName)}`);
      }
    }
  };

  const allCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    questions.forEach(q => categoriesSet.add(q.category));
    return Array.from(categoriesSet).sort();
  }, [questions]);

  const categoryChartData = useMemo(() => {
    return allCategories.map(cat => {
      const questionsInCategory = questions.filter(q => q.category === cat);
      const questionIdsInCategory = questionsInCategory.map(q => q.id);
      const totalQuestionsInCategory = questionsInCategory.length;

      const historyForCategory = historyForStats.filter(h => questionIdsInCategory.includes(h.question_id));
      
      // 正答率の計算
      const correctAttempts = historyForCategory.filter(h => h.result).length;
      const totalAttempts = historyForCategory.length;
      const correctRate = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

      // 学習率の計算
      const answeredQuestions = new Set(historyForCategory.map(h => h.question_id));
      const learningRate = totalQuestionsInCategory > 0 ? Math.round((answeredQuestions.size / totalQuestionsInCategory) * 100) : 0;

      return { name: cat, '正答率': correctRate, '学習率': learningRate };
    });
  }, [allCategories, questions, historyForStats]);

  const sortedCategoryChartData = useMemo(() => {
    const sorted = [...categoryChartData];
    sorted.sort((a, b) => {
      const aVal = a[categorySortKey];
      const bVal = b[categorySortKey];
      return categorySortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [categoryChartData, categorySortKey, categorySortOrder]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }
  
  if (quizSessions.length === 0 && !isSelectionMode) {
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
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {!isSelectionMode && (
              <Link href="/">
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">学習分析</h1>
              <p className="text-sm text-muted-foreground">詳細なパフォーマンスデータ</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "standard" | "exam"); setIsSelectionMode(false); setSelectedSessionIds([]); }}>
              <TabsList className="mb-6 grid grid-cols-2">
                <TabsTrigger value="standard">通常モード</TabsTrigger>
                <TabsTrigger value="exam">試験モード</TabsTrigger>
              </TabsList>

              <TabsContent value="standard">
                {/* Stats Cards and Charts */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <Card className="p-4 border-border bg-gradient-to-br from-primary/5 to-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"> <Award className="w-5 h-5 text-primary" /> </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">{cardCorrectRate}%</div>
                        <div className="text-xs text-muted-foreground">平均正答率</div>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center"> <Target className="w-5 h-5 text-foreground" /> </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">{cardLearnedQuestionsCount}</div>
                        <div className="text-xs text-muted-foreground">実施済みクイズ数</div>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center"> <Zap className="w-5 h-5 text-foreground" /> </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">{cardTotalAttempts}</div>
                        <div className="text-xs text-muted-foreground">総解答数</div>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center"> <List className="w-5 h-5 text-foreground" /> </div>
                      <div>
                        <div className="text-2xl font-bold text-foreground">{uniqueAnsweredQuestionsCount} / {cardTotalQuestionsInSystem}</div>
                        <div className="text-xs text-muted-foreground">学習済み問題数</div>
                      </div>
                    </div>
                  </Card>
                </div>
                <Card className="p-5 mb-6 border-border">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"> <BarChart3 className="w-4 h-4" /> 解答状況分布 </h3>
                  <ResponsiveContainer width="100%" height={420}>
                    <PieChart>
                      <Pie data={correctnessPieData} cx="50%" cy="50%" labelLine={true} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value" >
                        {correctnessPieData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.color} /> ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid hsl(var(--border))", borderRadius: "8px", }} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="text-center"> <div className="text-xs text-muted-foreground mb-1">最終正解</div> <div className="text-lg font-bold text-success">{answeredCorrectly}問</div> </div>
                    <div className="text-center"> <div className="text-xs text-muted-foreground mb-1">最終不正解</div> <div className="text-lg font-bold text-destructive">{answeredIncorrectly}問</div> </div>
                    <div className="text-center"> <div className="text-xs text-muted-foreground mb-1">未回答</div> <div className="text-lg font-bold text-muted-foreground">{neverAnswered}問</div> </div>
                  </div>
                </Card>
                <Card className="p-5 mb-6 border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"> <TrendingUp className="w-4 h-4" /> カテゴリ別パフォーマンス </h3>
                    <div className="flex items-center gap-2">
                      <select value={categorySortKey} onChange={(e) => setCategorySortKey(e.target.value as '学習率' | '正答率')} className="text-xs border rounded px-2 py-1">
                        <option value="正答率">正答率</option>
                        <option value="学習率">学習率</option>
                      </select>
                      <Button variant="outline" size="sm" onClick={() => setCategorySortOrder(o => o === 'asc' ? 'desc' : 'asc')} className="text-xs px-2 py-1 h-7">
                        {categorySortOrder === 'asc' ? '昇順 ↑' : '降順 ↓'}
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto w-full">
                    <BarChart width={4000} height={280} data={sortedCategoryChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} onClick={handleCategoryClick} className="cursor-pointer" barCategoryGap="5%" barGap={1}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tickFormatter={(value) => value.length > 8 ? value.slice(0, 10) + "..." : value} tick={{fontSize: 12, angle: -45, textAnchor: "end" }} height={80}/>
                        <YAxis tickFormatter={(value) => `${value}%`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip formatter={(value) => `${value}%`} contentStyle={{ backgroundColor: "white", border: "1px solid hsl(var(--border))", borderRadius: "8px", }} />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Bar dataKey="学習率" fill="#286ec9ff" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar dataKey="正答率" fill="#20bd2dff" radius={[4, 4, 0, 0]} barSize={10} />
                      </BarChart>
                  </div>
                </Card>

                {/* --- Selection Control --- */}
                {!isSelectionMode && standardSessions.length > 0 && (
                <div className="flex justify-end mt-8 mb-4">
                  <Button variant="outline" onClick={handleEnterSelectionMode}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    選択して削除
                  </Button>
                </div>
                )}
              {isSelectionMode && (
                  <div className="flex justify-end mt-8 mb-4">
                    <Button variant="outline" onClick={handleCancelSelection}>キャンセル</Button>
                    <Button className="ml-3 bg-red-300" onClick={handleDeleteSelected} disabled={isDeleting || selectedSessionIds.length === 0}>
                      {isDeleting ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4 mr-2" />}
                      {selectedSessionIds.length}件削除
                    </Button>
                  </div>
                )}

                {/* Quiz Session List */}
                <div className="space-y-3">
                  {standardSessions.slice().sort((a,b) => new Date(b.finished_at).getTime() - new Date(a.finished_at).getTime()).slice(0, 10).map((session) => (
                    <div key={session.id} onClick={() => handleCardClick(session)} className={`flex items-center gap-4 rounded-lg transition-colors ${isSelectionMode ? 'hover:bg-muted/50 cursor-pointer' : ''}`}>
                        {isSelectionMode && (
                          <div className="pl-2" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                  id={`select-${session.id}`}
                                  checked={selectedSessionIds.includes(session.id)}
                                  onCheckedChange={() => handleSessionSelect(session.id)}
                                  className="w-5 h-5"
                              />
                          </div>
                        )}
                        <div className="flex-grow">
                            <Card className={`p-4 border-border w-full transition-colors ${isSelectionMode ? (selectedSessionIds.includes(session.id) ? 'border-primary' : 'hover:bg-card/80') : 'hover:bg-card/80 cursor-pointer'}`}>
                                <div className="flex items-start gap-3">
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 ${ session.correct_rate >= 70 ? "bg-green-200" : "bg-red-200" }`}>
                                        {session.correct_rate >= 70 ? ( <Check className="w-5 h-5 text-success" /> ) : ( <X className="w-5 h-5 text-destructive" /> )}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                        <span className="flex justify-end mb-4 text-xs text-muted-foreground whitespace-nowrap">
                                            {session.finished_at ? new Date(session.finished_at).toLocaleString('ja-JP') : '-'}
                                        </span>
                                        <div className="items-center gap-2">
                                        <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">
                                            {session.categories.join(', ')}
                                        </span>
                                        </div>
                                        <div className="my-2">
                                        <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                                            {session.correct_count} / {session.total_questions} 問正解 ({session.correct_rate}%)
                                        </p>
                                        </div>
                                        <div className="flex justify-between items-end gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground">
                                            所要時間: {Math.floor(session.elapsed_time_seconds / 60)}分{session.elapsed_time_seconds % 60}秒
                                        </span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="exam">
                {examSessions.length === 0 ? (
                  <Card className="p-6 text-sm text-muted-foreground">試験モードの履歴はまだありません。</Card>
                ) : (
                  <div className="space-y-3">
                    {examSessions.slice().sort((a,b) => new Date(b.finished_at).getTime() - new Date(a.finished_at).getTime()).map((session) => (
                      <Card key={session.id} className="p-4 border-border hover:bg-card/80 cursor-pointer" onClick={() => router.push(`/quiz/session/${session.id}`)}>
                        <div className="flex items-start gap-3">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 ${ session.pass ? "bg-green-200" : "bg-blue-200" }`}>
                            {session.pass ? ( <Check className="w-5 h-5 text-success" /> ) : ( <Target className="w-5 h-5 text-primary" /> )}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col gap-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{session.finished_at ? new Date(session.finished_at).toLocaleString('ja-JP') : '-'}</span>
                              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-medium">試験モード</span>
                            </div>
                            <div className="text-sm text-foreground">
                              {session.correct_count} / {session.total_questions} 問正解 ({session.correct_rate}% / 採点対象 {session.correct_rate_excluding_unscored ?? session.correct_rate}%)
                            </div>
                            <div className="text-xs text-muted-foreground">
                              所要時間: {Math.floor(session.elapsed_time_seconds / 60)}分{session.elapsed_time_seconds % 60}秒 ・ 合否: {session.pass ? '合格' : '未達'}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
      </div>
    </div>
  )
}