"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getQuestions, Question } from "@/lib/data"
import { ArrowLeft, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"

export default function ReviewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const questionId = searchParams.get("questionId");

  const [question, setQuestion] = useState<Question | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQuestionAndAnswers = async () => {
      if (!questionId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      // Fetch question from local data
      const allQuestions = await getQuestions();
      const foundQuestion = allQuestions.find(q => q.id === questionId);
      setQuestion(foundQuestion || null);

      // Get answers and result from sessionStorage
      const answersString = sessionStorage.getItem('quizUserAnswers');
      const resultsString = sessionStorage.getItem('quizResults');
      
      if (answersString && resultsString) {
        const allUserAnswers = JSON.parse(answersString);
        const allResults = JSON.parse(resultsString);
        
        setUserAnswers(allUserAnswers[questionId] || []);

        const result = allResults.find((r: any) => r.questionId === questionId);
        setIsCorrect(result ? result.isCorrect : null);
      }

      setIsLoading(false);
    };
    fetchQuestionAndAnswers();
  }, [questionId]);

  const handleBackToResults = () => {
    router.push('/quiz/results');
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (!question) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-lg text-muted-foreground mb-4">問題データが見つかりません。</p>
        <Button onClick={handleBackToResults}>結果一覧に戻る</Button>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
            <Button onClick={handleBackToResults} variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          <h1 className="text-2xl font-bold text-foreground">結果詳細</h1>
        </div>

        <Card className="p-6 mb-6 border-border">
          <h2 className="text-lg font-semibold text-foreground mb-6 leading-relaxed whitespace-pre-wrap">{question.question}</h2>
          <div className="space-y-3">
            {question.options.map((option, index) => {
              const isSelected = userAnswers.includes(index);
              const isCorrectAnswer = question.correct_answers.includes(index);

              return (
                <div
                  key={index}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${
                    isCorrectAnswer ? "border-green-500 bg-green-500/20" 
                    : isSelected && !isCorrectAnswer ? "border-red-500 bg-red-500/20" 
                    : "border-border bg-secondary"
                  }`}
                >
                  <div className={`flex items-center justify-center w-6 h-6 shrink-0 border-2 ${question.type === 'single' ? 'rounded-full' : 'rounded-md'} ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                    {isSelected && (
                        question.type === 'single' 
                          ? <div className="w-3 h-3 rounded-full bg-black dark:bg-white"></div>
                          : <Check className="w-4 h-4" />
                      )}
                  </div>
                  <span className="flex-1 text-foreground">{option}</span>
                  {isCorrectAnswer && <Check className="w-5 h-5 text-green-500" />}
                  {isSelected && !isCorrectAnswer && <X className="w-5 h-5 text-red-500" />}
                </div>
              )
            })}
          </div>
        </Card>

        {isCorrect !== null && (
          <Card className={`p-6 mb-6 border-2 ${isCorrect ? "border-green-500 bg-green-500/5" : "border-red-500 bg-red-500/5"}`}>
              <h3 className={`text-lg font-bold mb-2 ${isCorrect ? "text-green-500" : "text-red-500"}`}>
                {isCorrect ? "正解！" : "不正解"}
              </h3>
              <p className="text-sm text-foreground leading-relaxed">{question.explanation}</p>
          </Card>
        )}

        <Button onClick={handleBackToResults} className="w-full">結果一覧に戻る</Button>
      </div>
    </div>
  )
}
