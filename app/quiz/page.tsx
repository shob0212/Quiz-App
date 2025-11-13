"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getQuestions, Question } from "@/lib/data"
import { Home, List, Target, BarChart3, ArrowLeft, Rocket, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

interface CategoryInfo {
  name: string;
  count: number;
}

export default function QuizSettingsPage() {
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState("10");
  const [showTimer, setShowTimer] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const savedSettings = sessionStorage.getItem('quizSettings');
    if (savedSettings) {
      const { selectedCategories, numQuestions, showTimer } = JSON.parse(savedSettings);
      if (selectedCategories) setSelectedCategories(selectedCategories);
      if (numQuestions) setNumQuestions(numQuestions);
      if (typeof showTimer === 'boolean') setShowTimer(showTimer);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const settings = {
        selectedCategories,
        numQuestions,
        showTimer,
      };
      sessionStorage.setItem('quizSettings', JSON.stringify(settings));
    }
  }, [selectedCategories, numQuestions, showTimer, isLoading]);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      const allQuestions = await getQuestions();
      const categoryCounts = allQuestions.reduce((acc, q) => {
        acc[q.category] = (acc[q.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const categoryInfo = Object.entries(categoryCounts).map(([name, count]) => ({ name, count }));
      setCategories(categoryInfo);

      const savedSettings = sessionStorage.getItem('quizSettings');
      if (!savedSettings) {
        setSelectedCategories(categoryInfo.map(c => c.name));
      }
      setIsLoading(false);
    };
    fetchCategories();
  }, []);

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
    params.set("categories", selectedCategories.join(","));
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
                  />
                  <label htmlFor={cat.name} className="text-sm font-medium text-foreground cursor-pointer break-all">
                    {cat.name}
                  </label>
                </div>
                <span className="text-sm text-muted-foreground flex-shrink-0">{cat.count}問</span>
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
                <SelectContent>
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