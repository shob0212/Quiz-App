"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getQuestions, getHistory, Question, History } from "@/lib/data"
import { ArrowLeft, Rocket, Clock, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import Picker from "@/components/ui/picker"
import { Switch } from "@/components/ui/switch"

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
  const [isExamMode, setIsExamMode] = useState(false);
  const router = useRouter();

  // Filter states
  const [filterUnanswered, setFilterUnanswered] = useState(false);
  const [filterLowCorrectness, setFilterLowCorrectness] = useState(false);
  const [lowCorrectnessPercentage, setLowCorrectnessPercentage] = useState(70);
  const [filterLastIncorrect, setFilterLastIncorrect] = useState(false);
  const [filterConsecutiveMistakes, setFilterConsecutiveMistakes] = useState(false);

  useEffect(() => {
    const initializePage = async () => {
      const savedQuiz = localStorage.getItem('suspendedQuiz');
      if (savedQuiz) {
        setSuspendedQuiz(JSON.parse(savedQuiz));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

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

      const [questions, historyData] = await Promise.all([getQuestions(), getHistory()]);
      setAllQuestions(questions);
      setHistory(historyData);
      setIsLoading(false);
    };

    initializePage();
  }, []);

  useEffect(() => {
    if (!isLoading && !suspendedQuiz) {
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
  }, [selectedCategories, numQuestions, showTimer, filterUnanswered, filterLowCorrectness, lowCorrectnessPercentage, filterLastIncorrect, filterConsecutiveMistakes, isLoading, suspendedQuiz]);

  const filteredQuestions = useMemo(() => {
    const activeFilters = filterUnanswered || filterLowCorrectness || filterLastIncorrect || filterConsecutiveMistakes;
    if (!activeFilters) return allQuestions;

    const questionsToInclude = new Set<string>();

    if (filterUnanswered) {
      const answeredQuestionIds = new Set(history.map(h => h.question_id));
      allQuestions.forEach(q => {
        if (!answeredQuestionIds.has(q.id)) questionsToInclude.add(q.id);
      });
    }

    if (filterLowCorrectness) {
      const stats: { [key: string]: { correct: number, total: number } } = {};
      for (const record of history) {
        if (!stats[record.question_id]) stats[record.question_id] = { correct: 0, total: 0 };
        stats[record.question_id].total++;
        if (record.result) stats[record.question_id].correct++;
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
        if (!h.result) questionsToInclude.add(h.question_id);
      });
    }

    if (filterConsecutiveMistakes) {
      allQuestions.forEach(q => {
        if (q.consecutive_wrong > 0) questionsToInclude.add(q.id);
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
      .map(([name, totalCount]) => ({ name, count: filteredCategoryCounts[name] || 0, totalCount }));
    setCategories(categoryInfo);
    const savedSettings = sessionStorage.getItem('quizSettings');
    if (!savedSettings) setSelectedCategories(categoryInfo.map(c => c.name));
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

    // Fisher-Yates shuffle for question IDs
    const shuffled = [...questionIdsToQuiz];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    params.set("questionIds", shuffled.slice(0, quizAmount).join(','));
    params.set("limit", quizAmount.toString());
    params.set("showTimer", showTimer.toString());
    router.push(`/quiz/play?${params.toString()}`);
  };

  const handleStartExam = () => {
    const allByCategory = allQuestions.reduce((acc, q) => {
      (acc[q.category] ||= []).push(q);
      return acc;
    }, {} as Record<string, Question[]>);
    const canonical = ["運用上の優秀性", "セキュリティ", "信頼性", "パフォーマンス効率", "コスト最適化"];
    const presentCats = canonical.filter(c => allByCategory[c] && allByCategory[c].length > 0);
    const totalTarget = 65;
    const availableCounts = presentCats.map(c => allByCategory[c].length);
    const totalAvailable = availableCounts.reduce((s, n) => s + n, 0);
    let assigned: Record<string, number> = {};
    if (totalAvailable === 0) {
      const pool = [...allQuestions];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const params = new URLSearchParams();
      params.set("exam", "true");
      params.set("questionIds", pool.slice(0, totalTarget).map(q => q.id).join(','));
      router.push(`/quiz/play?${params.toString()}`);
      return;
    }
    const floors = presentCats.map((c, idx) => Math.floor((availableCounts[idx] / totalAvailable) * totalTarget));
    const remainders = presentCats.map((c, idx) => ({ c, rem: (availableCounts[idx] / totalAvailable) * totalTarget - floors[idx] }));
    let leftover = totalTarget - floors.reduce((s, n) => s + n, 0);
    presentCats.forEach((c, idx) => { assigned[c] = Math.min(floors[idx], availableCounts[idx]); });
    remainders.sort((a, b) => b.rem - a.rem);
    for (const { c } of remainders) {
      if (leftover <= 0) break;
      const cap = availableCounts[presentCats.indexOf(c)];
      if (assigned[c] < cap) { assigned[c]++; leftover--; }
    }
    while (leftover > 0) {
      let progressed = false;
      for (const c of presentCats) {
        if (leftover <= 0) break;
        const cap = availableCounts[presentCats.indexOf(c)];
        if (assigned[c] < cap) { assigned[c]++; leftover--; progressed = true; }
      }
      if (!progressed) break;
    }
    let selected: Question[] = [];
    for (const cat of presentCats) {
      const pool = [...allByCategory[cat]];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      selected.push(...pool.slice(0, assigned[cat]));
    }
    if (selected.length < totalTarget) {
      const selectedIds = new Set(selected.map(q => q.id));
      const remaining = allQuestions.filter(q => !selectedIds.has(q.id));
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      const need = totalTarget - selected.length;
      selected.push(...remaining.slice(0, Math.max(0, need)));
    }
    for (let i = selected.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [selected[i], selected[j]] = [selected[j], selected[i]];
    }
    const params = new URLSearchParams();
    params.set("exam", "true");
    params.set("questionIds", selected.slice(0, totalTarget).map(q => q.id).join(','));
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
      localStorage.removeItem('suspendedQuiz');
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

  const percentageOptions = [" ", 30, 50, 70, " "];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">出題設定</h1>
            <p className="text-sm text-muted-foreground">挑戦する問題の範囲と数を選択</p>
          </div>
        </div>
        <Card className="p-6 border-border mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch checked={isExamMode} onCheckedChange={(v) => setIsExamMode(Boolean(v))} />
              <span className="text-sm font-medium text-foreground">試験モード（SAA-C03 模擬）</span>
            </div>
            {isExamMode && (<div className="text-sm text-muted-foreground">65問・130分／カテゴリ比率出題</div>)}
          </div>
        </Card>
        {isExamMode && (
          <Card className="p-6 border-border mb-6 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-foreground mb-3">試験概要</h3>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span><strong>出題数：</strong>65問</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span><strong>制限時間：</strong>130分</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span><strong>出題範囲：</strong>5つの評価軸（運用上の優秀性・セキュリティ・信頼性・パフォーマンス効率・コスト最適化）をバランスよく出題</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span><strong>中断：</strong>試験開始後は中断できません</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span><strong>解答・解説：</strong>試験終了後に表示されます</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold mt-0.5">•</span>
                <span><strong>合格基準：</strong>正答率72%以上で合格</span>
              </li>
            </ul>
          </Card>
        )}
        {!isExamMode && (
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen} className="mb-6">
          <Card className="p-6 border-border">
            <CollapsibleTrigger asChild>
              <div className="flex justify-between items-center cursor-pointer">
                <h2 className="text-lg font-semibold text-foreground">絞り込み</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><span>{isFilterOpen ? '閉じる' : '開く'}</span><ChevronsUpDown className="w-4 h-4" /></div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <Checkbox id="filter-unanswered" checked={filterUnanswered} onCheckedChange={(checked) => setFilterUnanswered(Boolean(checked))} />
                    <Label htmlFor="filter-unanswered" className="text-sm font-medium text-foreground cursor-pointer">未回答の問題</Label>
                  </div>
                </div>
                <div className="p-2 rounded-lg hover:bg-secondary/50">
                   <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox id="filter-low-correctness" checked={filterLowCorrectness} onCheckedChange={(checked) => setFilterLowCorrectness(Boolean(checked))} />
                      <Label htmlFor="filter-low-correctness" className="text-sm font-medium text-foreground cursor-pointer">低正答率の問題</Label>
                    </div>
                     <div className="flex items-center gap-2">
                        <Picker options={percentageOptions} value={lowCorrectnessPercentage} onChange={(val) => setLowCorrectnessPercentage(Number(val))} disabled={!filterLowCorrectness} />
                        <span className="text-sm font-semibold">%以下</span>
                     </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <Checkbox id="filter-last-incorrect" checked={filterLastIncorrect} onCheckedChange={(checked) => setFilterLastIncorrect(Boolean(checked))} />
                    <Label htmlFor="filter-last-incorrect" className="text-sm font-medium text-foreground cursor-pointer">最終不正解の問題</Label>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
        )}
        {!isExamMode && (
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
                  <Checkbox id={cat.name} checked={selectedCategories.includes(cat.name)} onCheckedChange={() => handleCategoryToggle(cat.name)} disabled={cat.count === 0} />
                  <label htmlFor={cat.name} className={`text-sm font-medium text-foreground break-all ${cat.count === 0 ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer'}`}>{cat.name}</label>
                </div>
                <span className="text-sm text-muted-foreground flex-shrink-0">{`${cat.count}問`}</span>
              </div>
            ))}
          </div>
        </Card>
        )}
        {!isExamMode && (
        <Card className="p-6 border-border mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">オプション</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">出題数</label>
              <Select value={numQuestions} onValueChange={setNumQuestions}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="問題数を選択" /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="10">10問</SelectItem>
                  <SelectItem value="20">20問</SelectItem>
                  <SelectItem value="50">50問</SelectItem>
                  <SelectItem value="all">すべて</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="show-timer" className="text-sm font-medium text-foreground flex items-center gap-2"><Clock className="w-4 h-4" />経過時間を表示</label>
              <Checkbox id="show-timer" checked={showTimer} onCheckedChange={(checked) => setShowTimer(Boolean(checked))} />
            </div>
          </div>
        </Card>
        )}
        {isExamMode ? (
          <Button onClick={handleStartExam} className="w-full text-lg py-6 font-bold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-lg transform hover:scale-105 transition-transform duration-200">
            <Rocket className="w-5 h-5 mr-2" />試験を開始（65問・130分）
          </Button>
        ) : (
          <Button onClick={handleStartQuiz} disabled={selectedCategories.length === 0 || totalSelectedQuestions === 0} className="w-full text-lg py-6 font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg transform hover:scale-105 transition-transform duration-200">
            <Rocket className="w-5 h-5 mr-2" />出題開始 ({numQuestions === 'all' ? totalSelectedQuestions : quizAmount} / {totalSelectedQuestions} 問)
          </Button>
        )}
      </div>
    </div>
  )
}
