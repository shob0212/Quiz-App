"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getQuestions, getHistory, Question, History } from "@/lib/data"
import { Home, List, Target, BarChart3, ArrowLeft, Rocket, Clock, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import Picker from "@/components/ui/picker"


interface CategoryInfo {
  name: string;
  count: number;
  totalCount: number;
}

export default function QuizSettingsPage() {
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState("10");
  const [showTimer, setShowTimer] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [suspendedQuiz, setSuspendedQuiz] = useState<any | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const router = useRouter();

  // Filter states
  const [filterUnanswered, setFilterUnanswered] = useState(false);
  const [filterLowCorrectness, setFilterLowCorrectness] = useState(false);
  const [lowCorrectnessPercentage, setLowCorrectnessPercentage] = useState(70);
  const [filterLastIncorrect, setFilterLastIncorrect] = useState(false);
  const [filterConsecutiveMistakes, setFilterConsecutiveMistakes] = useState(false);

  useEffect(() => {
    const savedQuiz = sessionStorage.getItem('suspendedQuiz');
    if (savedQuiz) {
      setSuspendedQuiz(JSON.parse(savedQuiz));
    }

    const savedSettings = sessionStorage.getItem('quizSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      if (settings.selectedCategories) setSelectedCategories(settings.selectedCategories);
      if (settings.numQuestions) setNumQuestions(settings.numQuestions);
      if (typeof settings.showTimer === 'boolean') setShowTimer(settings.showTimer);
      if (typeof settings.filterUnanswered === 'boolean') setFilterUnanswered(settings.filterUnanswered);
      if (typeof settings.filterLowCorrectness === 'boolean') setFilterLowCorrectness(settings.filterLowCorrectness);
      if (typeof settings.lowCorrectnessPercentage === 'number') setLowCorrectnessPercentage(settings.lowCorrectnessPercentage);
      if (typeof settings.filterLastIncorrect === 'boolean') setFilterLastIncorrect(settings.filterLastIncorrect);
      if (typeof settings.filterConsecutiveMistakes === 'boolean') setFilterConsecutiveMistakes(settings.filterConsecutiveMistakes);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const settings = {
        selectedCategories,
        numQuestions,
        showTimer,
        filterUnanswered,
        filterLowCorrectness,
        lowCorrectnessPercentage,
        filterLastIncorrect,
        filterConsecutiveMistakes,
      };
      sessionStorage.setItem('quizSettings', JSON.stringify(settings));
    }
  }, [selectedCategories, numQuestions, showTimer, filterUnanswered, filterLowCorrectness, lowCorrectnessPercentage, filterLastIncorrect, filterConsecutiveMistakes, isLoading]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      const [questions, historyData] = await Promise.all([getQuestions(), getHistory()]);
      setAllQuestions(questions);
      setHistory(historyData);
      setIsLoading(false);
    };
    fetchInitialData();
  }, []);

  const filteredQuestions = useMemo(() => {
    const activeFilters = filterUnanswered || filterLowCorrectness || filterLastIncorrect || filterConsecutiveMistakes;

    if (!activeFilters) {
      return allQuestions;
    }

    const questionsToInclude = new Set<string>();

    if (filterUnanswered) {
      const answeredQuestionIds = new Set(history.map(h => h.question_id));
      allQuestions.forEach(q => {
        if (!answeredQuestionIds.has(q.id)) {
          questionsToInclude.add(q.id);
        }
      });
    }

    if (filterLowCorrectness) {
      const stats: { [key: string]: { correct: number, total: number } } = {};
      for (const record of history) {
        if (!stats[record.question_id]) {
          stats[record.question_id] = { correct: 0, total: 0 };
        }
        stats[record.question_id].total++;
        if (record.result) {
          stats[record.question_id].correct++;
        }
      }
      allQuestions.forEach(q => {
        const stat = stats[q.id];
        if (!stat || stat.total === 0 || (stat.correct / stat.total) * 100 <= lowCorrectnessPercentage) {
          questionsToInclude.add(q.id);
        }
      });
    }

    if (filterLastIncorrect) {
        const lastAnswered: { [key: string]: History } = {};
        history.forEach(h => {
          if (!lastAnswered[h.question_id] || new Date(h.answered_at) > new Date(lastAnswered[h.question_id].answered_at)) {
            lastAnswered[h.question_id] = h;
          }
        });
        Object.values(lastAnswered).forEach(h => {
          if (!h.result) {
            questionsToInclude.add(h.question_id);
          }
        });
    }

    if (filterConsecutiveMistakes) {
        allQuestions.forEach(q => {
          if (q.consecutive_wrong > 0) {
            questionsToInclude.add(q.id);
          }
        });
    }

    return allQuestions.filter(q => questionsToInclude.has(q.id));
  }, [allQuestions, history, filterUnanswered, filterLowCorrectness, lowCorrectnessPercentage, filterLastIncorrect, filterConsecutiveMistakes]);

  useEffect(() => {
    if (allQuestions.length === 0) return;

    const totalCategoryCounts = allQuestions.reduce((acc, q) => {
      acc[q.category] = (acc[q.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const filteredCategoryCounts = filteredQuestions.reduce((acc, q) => {
      acc[q.category] = (acc[q.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryInfo = Object.entries(totalCategoryCounts)
      .map(([name, totalCount]) => ({
        name,
        count: filteredCategoryCounts[name] || 0,
        totalCount,
      }));

    setCategories(categoryInfo);

    const savedSettings = sessionStorage.getItem('quizSettings');
    if (!savedSettings) {
      setSelectedCategories(categoryInfo.map(c => c.name));
    }
  }, [allQuestions, filteredQuestions]);

  const handleCategoryToggle = (categoryName: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const totalSelectedQuestions = categories
    .filter(c => selectedCategories.includes(c.name))
    .reduce((sum, c) => sum + c.count, 0);

  const quizAmount = Math.min(Number(numQuestions) || totalSelectedQuestions, totalSelectedQuestions);

  const handleStartQuiz = () => {
    const params = new URLSearchParams();
    const questionIdsToQuiz = filteredQuestions
      .filter(q => selectedCategories.includes(q.category))
      .map(q => q.id);

    params.set("questionIds", questionIdsToQuiz.slice(0, quizAmount).join(','));
    params.set("limit", quizAmount.toString());
    params.set("showTimer", showTimer.toString());
    router.push(`/quiz/play?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (suspendedQuiz) {
    const handleResume = () => {
      router.push('/quiz/play');
    };

    const handleStartNew = () => {
      sessionStorage.removeItem('suspendedQuiz');
      setSuspendedQuiz(null);
    };

    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto px-4 py-6 max-w-2xl flex flex-col items-center justify-center h-[80vh]">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-4">中断したクイズがあります</h1>
            <p className="text-muted-foreground mb-8">前回の続きから再開しますか？</p>
          </div>
          <Card className="p-8 border-border w-full max-w-md">
            <div className="space-y-4">
              <Button onClick={handleResume} variant="outline" className="bg-green-200 w-full text-lg py-6 font-bold">
                <Rocket className="w-5 h-5 mr-2" />
                途中から再開する
              </Button>
              <Button onClick={handleStartNew} variant="outline" className="w-full text-lg py-6">
                新しく始める
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const isFiltered = filterUnanswered || filterLowCorrectness || filterLastIncorrect || filterConsecutiveMistakes;
  const percentageOptions = [" ", 30, 50, 70, " "];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">出題設定</h1>
            <p className="text-sm text-muted-foreground">挑戦する問題の範囲と数を選択</p>
          </div>
        </div>
        
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen} className="mb-6">
          <Card className="p-6 border-border">
            <CollapsibleTrigger asChild>
              <div className="flex justify-between items-center cursor-pointer">
                <h2 className="text-lg font-semibold text-foreground">絞り込み</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{isFilterOpen ? '閉じる' : '開く'}</span>
                  <ChevronsUpDown className="w-4 h-4" />
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="filter-unanswered"
                      checked={filterUnanswered}
                      onCheckedChange={setFilterUnanswered}
                    />
                    <Label htmlFor="filter-unanswered" className="text-sm font-medium text-foreground cursor-pointer">
                      未回答の問題
                    </Label>
                  </div>
                </div>
                <div className="p-2 rounded-lg hover:bg-secondary/50">
                   <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="filter-low-correctness"
                        checked={filterLowCorrectness}
                        onCheckedChange={setFilterLowCorrectness}
                      />
                      <Label htmlFor="filter-low-correctness" className="text-sm font-medium text-foreground cursor-pointer">
                        低正答率の問題
                      </Label>
                    </div>
                     <div className="flex items-center gap-2">
                        <Picker
                          options={percentageOptions}
                          value={lowCorrectnessPercentage}
                          onChange={(val) => setLowCorrectnessPercentage(Number(val))}
                          disabled={!filterLowCorrectness}
                        />
                        <span className="text-sm font-semibold">%以下</span>
                     </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="filter-last-incorrect"
                      checked={filterLastIncorrect}
                      onCheckedChange={setFilterLastIncorrect}
                    />
                    <Label htmlFor="filter-last-incorrect" className="text-sm font-medium text-foreground cursor-pointer">
                      最終不正解の問題
                    </Label>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>


        <Card className="p-6 border-border mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-foreground">カテゴリ選択</h2>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedCategories(categories.map(c => c.name))}>全選択</Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedCategories([])}>全解除</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {categories.map(cat => (
              <div key={cat.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id={cat.name}
                    checked={selectedCategories.includes(cat.name)}
                    onCheckedChange={() => handleCategoryToggle(cat.name)}
                    disabled={cat.count === 0}
                  />
                  <label htmlFor={cat.name} className={`text-sm font-medium text-foreground break-all ${cat.count === 0 ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer'}`}>
                    {cat.name}
                  </label>
                </div>
                <span className="text-sm text-muted-foreground flex-shrink-0">
                  {`${cat.count}問`}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 border-border mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">オプション</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">出題数</label>
              <Select value={numQuestions} onValueChange={setNumQuestions}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="問題数を選択" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="10">10問</SelectItem>
                  <SelectItem value="20">20問</SelectItem>
                  <SelectItem value="50">50問</SelectItem>
                  <SelectItem value="all">すべて</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="show-timer" className="text-sm font-medium text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                経過時間を表示
              </label>
              <Checkbox id="show-timer" checked={showTimer} onCheckedChange={(checked) => setShowTimer(Boolean(checked))} />
            </div>
          </div>
        </Card>

        <Button 
          onClick={handleStartQuiz} 
          disabled={selectedCategories.length === 0 || totalSelectedQuestions === 0} 
          className="w-full text-lg py-6 font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg transform hover:scale-105 transition-transform duration-200"
        >
          <Rocket className="w-5 h-5 mr-2" />
          出題開始 ({numQuestions === 'all' ? totalSelectedQuestions : quizAmount} / {totalSelectedQuestions} 問)
        </Button>
      </div>
    </div>
  )
}
