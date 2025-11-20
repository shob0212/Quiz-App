"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { getQuestions, writeHistory, writeQuestions, getHistory, Question, History, QuizSession, getQuizSessions, writeQuizSessions } from "@/lib/data"
import { ArrowLeft, ChevronLeft, ChevronRight, Check, X, Clock, Eye, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Spinner } from "@/components/ui/spinner"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { List } from "lucide-react"

// Fisher-Yates (aka Knuth) Shuffle Algorithm
const shuffleArray = (array: any[]) => {
  const newArray = [...array];
  let currentIndex = newArray.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
  }
  return newArray;
}

export default function QuizPlayPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const router = useRouter();

  const [questions, setQuestions] = useState<(Question & { shuffledOptions: { option: string; originalIndex: number }[] })[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, number[]>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinishingQuiz, setIsFinishingQuiz] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [editedExplanation, setEditedExplanation] = useState("");
  const [isEditingExplanation, setIsEditingExplanation] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const { toast } = useToast();
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [history, setHistory] = useState<Record<string, History[]>>({});

  const handleJumpToQuestion = (index: number) => {
    setShowAnswer(false);
    setCurrentQuestionIndex(index);
    setIsProgressModalOpen(false);
  };

  const currentQuestion = useMemo(() => questions[currentQuestionIndex], [questions, currentQuestionIndex]);

  const currentQuestionHistory = useMemo(() => {
    if (!currentQuestion) return [];
    return history[currentQuestion.id] || [];
  }, [currentQuestion, history]);

  useEffect(() => {
    if (currentQuestion) {
      setEditedExplanation(currentQuestion.explanation || "");
      setShowAnswer(false);
    }
  }, [currentQuestion]);

  const handleSaveExplanation = async () => {
    if (!currentQuestion) return;

    const allQuestions = await getQuestions();
    const questionToUpdate = allQuestions.find(q => q.id === currentQuestion.id);

    if (questionToUpdate) {
      questionToUpdate.explanation = editedExplanation;
      await writeQuestions(allQuestions);
      toast({
        title: "解説を保存しました",
      });
      setIsEditingExplanation(false);
    }
  };

  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true);

      const allHistory = await getHistory();
      const historyByQuestionId: Record<string, History[]> = {};
      for (const h of allHistory) {
        if (!historyByQuestionId[h.question_id]) {
          historyByQuestionId[h.question_id] = [];
        }
        historyByQuestionId[h.question_id].push(h);
      }
      for (const qId in historyByQuestionId) {
        historyByQuestionId[qId].sort((a, b) => new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime());
      }
      setHistory(historyByQuestionId);

      const categories = (searchParams.categories as string)?.split(",") || [];
      const limit = Number(searchParams.limit);
      const showTimerParam = searchParams.showTimer;

      setShowTimer(showTimerParam === 'true');

      const allQuestions = await getQuestions();
      const filtered = allQuestions.filter(q => categories.includes(q.category));
      const shuffled = shuffleArray(filtered);
      const selectedQuestions = shuffled.slice(0, limit);

      const questionsWithShuffledOptions = selectedQuestions.map(q => {
        const optionsWithOriginalIndex = q.options.map((option, index) => ({
          option,
          originalIndex: index,
        }));
        return {
          ...q,
          shuffledOptions: shuffleArray(optionsWithOriginalIndex),
        };
      });

      setQuestions(questionsWithShuffledOptions);
      setStartTime(new Date());
      setIsLoading(false);
    };

    loadQuestions();
  }, [searchParams]);

  useEffect(() => {
    if (!showTimer || !startTime) return;
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, showTimer]);

  const handleAnswerToggle = (optionIndex: number) => {
    if (!currentQuestion) return;
    const questionId = currentQuestion.id;
    const currentAnswers = userAnswers[questionId] || [];

    if (currentQuestion.type === 'single') {
      setUserAnswers({ ...userAnswers, [questionId]: [optionIndex] });
    } else {
      const newAnswers = currentAnswers.includes(optionIndex)
        ? currentAnswers.filter(i => i !== optionIndex)
        : [...currentAnswers, optionIndex];

      const newUserAnswers = { ...userAnswers };
      if (newAnswers.length === 0) {
        delete newUserAnswers[questionId];
      } else {
        newUserAnswers[questionId] = newAnswers;
      }
      setUserAnswers(newUserAnswers);
    }
  };

  const handleFinishQuiz = async () => {
    setIsFinishingQuiz(true); // Set loading state

    try {
      const allQuestions = await getQuestions();

      const results = questions.map(q => {
        const answered = userAnswers[q.id];
        const sortedUserAnswers = answered ? [...answered].sort() : [];
        const sortedCorrectAnswers = [...q.correct_answers].sort();
        const isCorrect = answered ? (
          sortedUserAnswers.length === sortedCorrectAnswers.length &&
          sortedUserAnswers.every((val, idx) => val === sortedCorrectAnswers[idx])
        ) : false;

        return { 
          questionId: q.id, 
          isCorrect,
          questionText: q.question
        };
      });

      // Calculate QuizSession data before creating history entries
      const total_questions = questions.length;
      const correct_count = results.filter(r => r.isCorrect).length;
      const incorrect_count = total_questions - correct_count;
      const correct_rate = total_questions > 0 ? (correct_count / total_questions) * 100 : 0;
      const finished_at = new Date().toISOString();
      const quizCategories = (searchParams.categories as string)?.split(",") || [];

      const newQuizSession: QuizSession = {
        id: crypto.randomUUID(),
        started_at: startTime?.toISOString() || finished_at,
        finished_at: finished_at,
        total_questions: total_questions,
        correct_count: correct_count,
        incorrect_count: incorrect_count,
        correct_rate: parseFloat(correct_rate.toFixed(2)), // Format to 2 decimal places
        elapsed_time_seconds: elapsedTime,
        categories: quizCategories,
      };

      const newHistoryEntries: History[] = [];
      results.forEach(result => {
        if (userAnswers[result.questionId]) { // Only add history for answered questions
          newHistoryEntries.push({
            id: crypto.randomUUID(),
            question_id: result.questionId,
            result: result.isCorrect,
            answered_at: new Date().toISOString(),
            quiz_session_id: newQuizSession.id, // Add quiz_session_id here
            user_answers: userAnswers[result.questionId] || [],
          });
        }
      });

      const updatedQuestions = allQuestions.map(q => {
        const result = results.find(r => r.questionId === q.id);
        if (!result || !userAnswers[q.id]) return q; // Return original if not in this quiz or not answered

        const updatedQ = { ...q };
        updatedQ.last_answered = new Date().toISOString();
        if (result.isCorrect) {
          updatedQ.consecutive_correct++;
          updatedQ.consecutive_wrong = 0;
        } else {
          updatedQ.consecutive_correct = 0;
          updatedQ.consecutive_wrong++;
        }
        return updatedQ;
      });

      // Write only the new entries/session to the database
      if (newHistoryEntries.length > 0) {
        await writeHistory(newHistoryEntries);
      }
      await writeQuizSessions(newQuizSession);
      
      // Update questions data
      await writeQuestions(updatedQuestions);

      const resultsString = JSON.stringify(results);
      const answersString = JSON.stringify(userAnswers);
      console.log('Results string length:', resultsString.length);
      console.log('Answers string length:', answersString.length);

      sessionStorage.setItem('quizResults', resultsString);
      sessionStorage.setItem('quizUserAnswers', answersString);
      router.push(`/quiz/results`);
    } catch (error) {
      console.error("Failed to finish quiz:", error);
      toast({
        title: "クイズの終了に失敗しました",
        description: "エラーが発生しました。コンソールを確認してください。",
        variant: "destructive",
      });
      setIsFinishingQuiz(false); // Reset loading state on error
    }
  };

  if (isLoading || !currentQuestion || isFinishingQuiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
        {isFinishingQuiz && <p className="ml-4 text-lg text-muted-foreground">結果を処理中...</p>}
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent style={{ backgroundColor: 'white', opacity: 1 }}>
                <AlertDialogHeader>
                  <AlertDialogTitle>クイズを中断しますか？</AlertDialogTitle>
                  <AlertDialogDescription>
                    現在の進捗は保存されません。本当にホームページに戻りますか？
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={() => router.push("/quiz")} className="bg-red-500 hover:bg-red-600 text-white">中断して戻る</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div>
              <h1 className="text-xl font-bold text-foreground">問題 {currentQuestionIndex + 1} / {questions.length}</h1>
              <p className="text-sm text-muted-foreground">カテゴリ: {currentQuestion.category}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Dialog open={isProgressModalOpen} onOpenChange={setIsProgressModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl">
                  <List className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-full bg-white">
                <DialogHeader>
                  <DialogTitle>解答状況</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-5 gap-3 p-4">
                  {questions.map((q, index) => (
                    <Button
                      key={q.id}
                      variant="outline"
                      className={`justify-center ${index === currentQuestionIndex ? 'border-3 border-blue-500' : ''} ${userAnswers[q.id] ? 'bg-gray-500 text-gray-900' : ''}`}
                      onClick={() => handleJumpToQuestion(index)}
                    >
                      {index + 1}
                    </Button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            {showTimer && (
              <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Clock className="w-5 h-5" />
                <span>{formatTime(elapsedTime)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Question Card */}
        <Card className="p-6 mb-6 border-border">
          
          <div className="mb-6 text-sm text-muted-foreground border-t border-b py-3">
            <div className="flex items-center justify-between">
              <span>最終回答: {currentQuestionHistory.length > 0 ? new Date(currentQuestionHistory[0].answered_at).toLocaleString('ja-JP') : "-"}</span>
              <div className="flex items-center gap-2">
                <span>直近5回:</span>
                <div className="flex gap-1 font-mono tracking-widest">
                  {(currentQuestionHistory.length > 0
                    ? currentQuestionHistory.slice(0, 5).map(h => h.result ? "〇" : "×")
                    : []
                  ).join("").padEnd(5, "-").split("").map((char, index) => (
                    <span
                      key={index}
                      className={
                        char === "〇" ? "text-red-500" :
                        char === "×" ? "text-blue-500" :
                        ""
                      }
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <h2 className="text-lg font-semibold text-foreground mb-6 leading-relaxed whitespace-pre-wrap">{currentQuestion.question}</h2>
          <div className="space-y-3">
            {currentQuestion.type === 'single' ? (
              <>
                <RadioGroup
                  value={userAnswers[currentQuestion.id]?.[0]?.toString() ?? ""}
                  onValueChange={(value) => handleAnswerToggle(parseInt(value))}
                >
                  {currentQuestion.shuffledOptions.map(({ option, originalIndex }) => {
                    const isCorrect = currentQuestion.correct_answers.includes(originalIndex);
                    const isSelected = (userAnswers[currentQuestion.id] || []).includes(originalIndex);
                    return (
                      <Label
                        key={originalIndex}
                        htmlFor={`option-${originalIndex}`}
                        className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer leading-relaxed ${
                          showAnswer && isCorrect ? "border-green-500 bg-green-500/20" 
                          : showAnswer && isSelected && !isCorrect ? "border-red-500 bg-red-500/20" 
                          : isSelected ? "border-primary bg-primary/20 border-2" 
                          : "border-border bg-secondary hover:bg-secondary/80"
                        }`}
                      >
                        <RadioGroupItem value={originalIndex.toString()} id={`option-${originalIndex}`} />
                        {option}
                      </Label>
                    )
                  })}
                </RadioGroup>
                {currentQuestion.type === 'single' && userAnswers[currentQuestion.id] && (
                  <div className="mt-4 flex justify-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newUserAnswers = { ...userAnswers };
                        delete newUserAnswers[currentQuestion.id];
                        setUserAnswers(newUserAnswers);
                      }}
                    >
                      選択を解除
                    </Button>
                  </div>
                )}
              </>
            ) : (
              currentQuestion.shuffledOptions.map(({ option, originalIndex }) => {
                const isCorrect = currentQuestion.correct_answers.includes(originalIndex);
                const isSelected = (userAnswers[currentQuestion.id] || []).includes(originalIndex);
                return (
                  <Label
                    key={originalIndex}
                    htmlFor={`option-${originalIndex}`}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
                      showAnswer && isCorrect ? "border-green-500 bg-green-500/20" 
                      : showAnswer && isSelected && !isCorrect ? "border-red-500 bg-red-500/20" 
                      : isSelected ? "border-primary bg-primary/20" 
                      : "border-border bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    <Checkbox id={`option-${originalIndex}`} checked={isSelected} onCheckedChange={() => handleAnswerToggle(originalIndex)} />
                    {option}
                  </Label>
                )
              })
            )}
          </div>
        </Card>

                  {showAnswer && (

                    <Card className="p-6 mb-6 border-border">

                      <h3 className="text-lg font-bold mb-2">解説</h3>

                      {isEditingExplanation ? (

                        <>

                          <Textarea 

                            value={editedExplanation}

                            onChange={(e) => setEditedExplanation(e.target.value)}

                            className="mb-2"

                          />

                          <Button onClick={handleSaveExplanation}>解説を保存</Button>

                        </>

                      ) : (

                        <div className="flex flex-col gap-2">

                          <p className="text-muted-foreground whitespace-pre-wrap">{editedExplanation || "解説がありません。"}</p>

                          <Button onClick={() => setIsEditingExplanation(true)} variant="outline" className="w-fit">編集</Button>

                        </div>

                      )}

                    </Card>

                  )}

        {/* Navigation */}
        <div className="flex gap-3 mb-10">
          <Button onClick={() => {
            setShowAnswer(false);
            setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
          }} disabled={currentQuestionIndex === 0} className="flex-1">
            <ChevronLeft className="w-4 h-4 mr-2" />
            前の問題
          </Button>
          <Button onClick={() => {
            setShowAnswer(false);
            setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1));
          }} disabled={currentQuestionIndex === questions.length - 1} className="flex-1">
            次の問題
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-4">
          <Button onClick={() => setShowAnswer(!showAnswer)} variant="outline">
              <Eye className="w-4 h-4 mr-2" />
              {showAnswer ? "解答を隠す" : "解答を表示"}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline"><XCircle className="w-4 h-4 mr-2" />終了する</Button>
            </AlertDialogTrigger>
            <AlertDialogContent style={{ backgroundColor: 'white', opacity: 1 }}>
              <AlertDialogHeader>
                <AlertDialogTitle>クイズを終了しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  採点を行い、結果画面に移動します。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleFinishQuiz} className="outline outline-green-600 bg-green-300 hover:bg-green-600 hover:text-white">終了する</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Toaster />
      </div>
    </div>
  )
}
