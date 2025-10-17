"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Home, Plus, Target, BarChart3, ArrowLeft, Check, X, ChevronRight, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

// DBのquestionsテーブルの型
interface Question {
  id: string;
  category: string;
  question: string;
  options: string[];
  correct_answers: number[];
  explanation: string | null;
  type: 'single' | 'multiple';
  memory_strength: number;
  created_at: string;
  last_answered: string | null;
  consecutive_correct: number;
  consecutive_wrong: number;
}

interface ShuffledOption {
  text: string;
  originalIndex: number;
}

// Fisher-Yates (aka Knuth) Shuffle Algorithm
const shuffleArray = (array: any[]) => {
  let currentIndex = array.length,  randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

export default function QuizPage() {
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter');
  const category = searchParams.get('category');

  const [question, setQuestion] = useState<Question | null>(null)
  const [shuffledOptions, setShuffledOptions] = useState<ShuffledOption[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [recentHistory, setRecentHistory] = useState<{ result: boolean }[]>([]);

  const fetchRandomQuestion = useCallback(async () => {
    setIsLoading(true);
    setSelectedAnswers([]);
    setShowResult(false);

    let rpcName = 'get_random_question';
    let rpcParams = {};

    if (filter === 'weak') {
      rpcName = 'get_weak_question';
    } else if (category) {
      rpcName = 'get_category_question';
      rpcParams = { p_category: category };
    }

    const { data, error } = await supabase.rpc(rpcName, rpcParams);

    if (error || !data || data.length === 0) {
      console.error(`Error fetching question with filter: ${filter}, category: ${category}`, error);
      setQuestion(null);
      setShuffledOptions([]);
    } else {
      const singleQuestion = Array.isArray(data) ? data[0] : data;
      const optionsWithOriginalIndex = singleQuestion.options.map((opt: string, index: number) => ({
        text: opt,
        originalIndex: index,
      }));
      setShuffledOptions(shuffleArray(optionsWithOriginalIndex));
      setQuestion(singleQuestion);
    }
    setIsLoading(false);
  }, [filter, category]);

  useEffect(() => {
    fetchRandomQuestion();
  }, [fetchRandomQuestion]);

  useEffect(() => {
    const fetchRecentHistory = async () => {
      if (question) {
        const { data, error } = await supabase
          .from('history')
          .select('result')
          .eq('question_id', question.id)
          .order('answered_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error fetching recent history:', error);
          setRecentHistory([]);
        } else {
          // 時系列で表示するために配列を逆順にする
          setRecentHistory(data.reverse());
        }
      } else {
        setRecentHistory([]);
      }
    };

    fetchRecentHistory();
  }, [question]);

  const handleAnswerToggle = (index: number) => {
    if (showResult) return;

    if (question?.type === 'single') {
      setSelectedAnswers([index]);
    } else {
      setSelectedAnswers(prev => 
        prev.includes(index) 
          ? prev.filter((i) => i !== index) 
          : [...prev, index]
      );
    }
  }

  const handleSubmit = async () => {
    if (!question) return;

    const selectedOriginalIndices = selectedAnswers.map(shuffledIndex => shuffledOptions[shuffledIndex].originalIndex);

    const sortedUserAnswers = [...selectedOriginalIndices].sort();
    const sortedCorrectAnswers = [...question.correct_answers].sort();

    const correct = 
      sortedUserAnswers.length === sortedCorrectAnswers.length &&
      sortedUserAnswers.every((val, idx) => val === sortedCorrectAnswers[idx]);

    setIsCorrect(correct);
    setShowResult(true);

    try {
      const updates = [
        supabase.from('history').insert([{ question_id: question.id, result: correct }]),
        supabase.rpc('update_memory_strength', { q_id: question.id, is_correct: correct })
      ];
      await Promise.all(updates);
    } catch (error) {
      console.error('Error updating history/memory strength:', error);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-4">
        <h2 className="text-2xl font-bold mb-4">対象の問題が見つかりません</h2>
        <p className="text-muted-foreground mb-6">この条件に一致する問題がデータベースにないか、まだ作成されていません。</p>
        <Link href="/add">
          <Button>問題を作成しに行く</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">問題に挑戦</h1>
              <p className="text-sm text-muted-foreground">
                カテゴリ: {question.category}
              </p>
            </div>
          </div>
        </div>

        {/* Current Stats */}
        <Card className="p-3 mb-4 border-border bg-secondary/30">
            <div className="flex justify-around text-center items-start">
                <div>
                    <p className="text-xs text-muted-foreground">直近5回の正答率</p>
                    <p className="text-lg font-bold">
                      {recentHistory.length > 0
                        ? `${Math.round((recentHistory.filter(h => h.result).length / recentHistory.length) * 100)}%`
                        : '-'}
                    </p>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">最終回答日</p>
                    <p className="text-lg font-bold">
                        {question.last_answered ? new Date(question.last_answered).toLocaleDateString() : '未回答'}
                    </p>
                </div>
                <div className="w-1/3">
                    <p className="text-xs text-muted-foreground">直近5回の正誤</p>
                    <div className="flex justify-center items-center gap-2 mt-1.5 h-6">
                        {recentHistory.length > 0 ? (
                            recentHistory.map((h, i) => (
                                h.result 
                                    ? <Check key={i} className="w-5 h-5 text-green-500" /> 
                                    : <X key={i} className="w-5 h-5 text-red-500" />
                            ))
                        ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                        )}
                    </div>
                </div>
            </div>
        </Card>

        {/* Question Card */}
        <Card className="p-6 mb-6 border-border">
          <h2 className="text-lg font-semibold text-foreground mb-6 leading-relaxed">{question.question}</h2>

          <div className="space-y-3">
            {shuffledOptions.map((option, index) => {
              const isSelected = selectedAnswers.includes(index);
              const isCorrectAnswer = question.correct_answers.includes(option.originalIndex);
              const showCorrect = showResult && isCorrectAnswer;
              const showIncorrect = showResult && isSelected && !isCorrectAnswer;

              return (
                <button
                  key={option.originalIndex} // 元のindexをkeyに使う
                  onClick={() => handleAnswerToggle(index)} // 現在の表示indexを渡す
                  disabled={showResult}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    showCorrect
                      ? "border-green-500 bg-green-500/20"
                      : showIncorrect
                        ? "border-red-500 bg-red-500/20"
                        : isSelected
                          ? "border-primary bg-primary/20"
                          : "border-border bg-secondary hover:bg-secondary/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-6 h-6 shrink-0 border-2 ${question.type === 'single' ? 'rounded-full' : 'rounded-md'} ${
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && (
                        question.type === 'single' 
                          ? <div className="w-3 h-3 rounded-full bg-black dark:bg-white"></div>
                          : <Check className="w-4 h-4" />
                      )}
                    </div>
                    <span className={`flex-1 text-foreground`}>{option.text}</span>
                    {showCorrect && <Check className="w-5 h-5 text-green-500" />}
                    {showIncorrect && <X className="w-5 h-5 text-red-500" />}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Result */}
        {showResult && (
          <Card
            className={`p-6 mb-6 border-2 ${
              isCorrect ? "border-green-500 bg-green-500/5" : "border-red-500 bg-red-500/5"
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${
                  isCorrect ? "bg-green-500" : "bg-red-500"
                }`}
              >
                {isCorrect ? <Check className="w-6 h-6 text-white" /> : <X className="w-6 h-6 text-white" />}
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-bold mb-2 ${isCorrect ? "text-green-500" : "text-red-500"}`}>
                  {isCorrect ? "正解！" : "不正解"}
                </h3>
                <p className="text-sm text-foreground leading-relaxed">{question.explanation}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!showResult ? (
            <Button
              onClick={handleSubmit}
              disabled={selectedAnswers.length === 0}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              回答する
            </Button>
          ) : (
            <Button
              onClick={fetchRandomQuestion}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              次の問題
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Memory Level - Placeholder */}
        {showResult && (
          <Card className="mt-4 p-4 bg-secondary/50 border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">記憶度</span>
              <span className={`text-sm font-medium ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                {isCorrect ? "+20" : "-20"}
              </span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-500" style={{ width: `${question.memory_strength}%` }} />
            </div>
          </Card>
        )}
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
            <Link href="/quiz" className="flex flex-col items-center gap-1 text-primary">
              <Target className="w-5 h-5" />
              <span className="text-xs font-medium">出題</span>
            </Link>
            <Link
              href="/history"
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-xs font-medium">履歴</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  )
}