"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { getQuestions, updateQuestion, Question } from "@/lib/data"
import { ArrowLeft, Check, X, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function ReviewPageClient({ questionId }: { questionId: string | string[] | undefined }) {
  const router = useRouter();
  const { toast } = useToast();

  const [question, setQuestion] = useState<Question | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingExplanation, setIsEditingExplanation] = useState(false);
  const [editedExplanation, setEditedExplanation] = useState("");

  useEffect(() => {
    const fetchQuestionAndAnswers = async () => {
      if (!questionId) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);

      const allQuestions = await getQuestions();
      const foundQuestion = allQuestions.find(q => q.id === questionId);
      setQuestion(foundQuestion || null);
      if (foundQuestion) {
        setEditedExplanation(foundQuestion.explanation || "");
      }

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
  
  const handleSaveExplanation = async () => {
    if (!question) return;

    try {
      const updatedQuestion = await updateQuestion({ id: question.id, explanation: editedExplanation });
      setQuestion(prevQuestion => prevQuestion ? { ...prevQuestion, explanation: updatedQuestion.explanation } : null);
      toast({
        title: "解説を保存しました",
      });
      setIsEditingExplanation(false);
    } catch(e) {
      console.error(e)
      toast({
        title: '解説の保存に失敗しました',
        variant: 'destructive'
      })
    }
  };

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
              <div className="flex justify-between items-start">
                <h3 className={`text-lg font-bold mb-2 ${isCorrect ? "text-green-500" : "text-red-500"}`}>
                  {isCorrect ? "正解！" : "不正解"}
                </h3>
                {!isEditingExplanation && (
                  <Button onClick={() => setIsEditingExplanation(true)} variant="ghost" size="icon">
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {isEditingExplanation ? (
                <div className="flex flex-col gap-2 mt-2">
                  <Textarea 
                    value={editedExplanation} 
                    onChange={(e) => setEditedExplanation(e.target.value)} 
                    className="mb-2 text-base"
                    rows={6}
                  />
                  <div className="flex justify-end gap-2">
                    <Button onClick={() => setIsEditingExplanation(false)} variant="ghost">キャンセル</Button>
                    <Button onClick={handleSaveExplanation}>解説を保存</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{editedExplanation || "解説がありません。"}</p>
              )}
          </Card>
        )}

        <Button onClick={handleBackToResults} className="w-full">結果一覧に戻る</Button>
        <Toaster />
      </div>
    </div>
  )
}
