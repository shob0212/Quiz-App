"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getQuestions, updateQuestion, writeHistory, Question, History, QuizSession, writeQuizSessions, getHistory } from "@/lib/data"
import { ArrowLeft, ChevronLeft, ChevronRight, Check, X, Clock, Eye, XCircle, List, Pencil } from "lucide-react"
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
import { Input } from "@/components/ui/input"

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

export default function QuizPlayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [questions, setQuestions] = useState<(Question & { shuffledOptions: { option: string; originalIndex: number }[] })[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, number[]>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinishingQuiz, setIsFinishingQuiz] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [editedExplanation, setEditedExplanation] = useState("");
  const [isEditingExplanation, setIsEditingExplanation] = useState(false);
  
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editingQuestionData, setEditingQuestionData] = useState<Question | null>(null);

  const { toast } = useToast();
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [history, setHistory] = useState<Record<string, History[]>>({});

  const questionIdsParam = searchParams.get('questionIds');
  const categoriesParam = searchParams.get('categories');
  const limitParam = searchParams.get('limit');
  const showTimerParamFromUrl = searchParams.get('showTimer');

  const initialShowTimer = useMemo(() => {
    return showTimerParamFromUrl === 'true';
  }, [showTimerParamFromUrl]);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [showTimer, setShowTimer] = useState(initialShowTimer);

  const saveSuspendedQuiz = useCallback(() => {
    const suspendedState = {
      questions,
      userAnswers,
      currentQuestionIndex,
      elapsedTime,
      questionIdsParam,
      categoriesParam,
      limitParam,
      showTimerParam: showTimer,
    };
    sessionStorage.setItem('suspendedQuiz', JSON.stringify(suspendedState));
    console.log('[PlayPage] Suspending quiz. State saved:', suspendedState);
  }, [questions, userAnswers, currentQuestionIndex, elapsedTime, questionIdsParam, categoriesParam, limitParam, showTimer]);

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

    try {
      const updatedQuestion = await updateQuestion({ id: currentQuestion.id, explanation: editedExplanation });
      setQuestions(prevQuestions => prevQuestions.map(q =>
        q.id === currentQuestion.id ? { ...q, explanation: updatedQuestion.explanation } : q
      ));
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

  const handleEditQuestionClick = useCallback(() => {
    if (!currentQuestion) return;
    setEditingQuestionData(JSON.parse(JSON.stringify(currentQuestion)));
    setIsEditingQuestion(true);
  }, [currentQuestion]);

  const handleEditingFormChange = useCallback((field: keyof Question, value: any) => {
    setEditingQuestionData(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  const handleOptionChange = useCallback((index: number, value: string) => {
    setEditingQuestionData(prev => {
      if (!prev) return null;
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return { ...prev, options: newOptions };
    });
  }, []);

  const handleCorrectAnswerChange = useCallback((index: number) => {
    setEditingQuestionData(prev => {
      if (!prev) return null;
      let newCorrectAnswers = [...prev.correct_answers];
      if (prev.type === 'single') {
        newCorrectAnswers = [index];
      } else {
        if (newCorrectAnswers.includes(index)) {
          newCorrectAnswers = newCorrectAnswers.filter(i => i !== index);
        } else {
          newCorrectAnswers.push(index);
        }
      }
      return { ...prev, correct_answers: newCorrectAnswers };
    });
  }, []);
  
  const handleAddOption = useCallback(() => {
    setEditingQuestionData(prev => {
      if (!prev) return null;
      return { ...prev, options: [...prev.options, ""] };
    });
  }, []);

  const handleDeleteOption = useCallback((indexToDelete: number) => {
    setEditingQuestionData(prev => {
        if (!prev) return null;

        const newOptions = prev.options.filter((_, i) => i !== indexToDelete);

        const newCorrectAnswers = prev.correct_answers
            .map(oldIndex => {
                if (oldIndex === indexToDelete) return -1;
                if (oldIndex > indexToDelete) return oldIndex - 1;
                return oldIndex;
            })
            .filter(newIndex => newIndex !== -1);
        
        return {
            ...prev,
            options: newOptions,
            correct_answers: newCorrectAnswers,
        };
    });
  }, []);

  const handleUpdateQuestion = useCallback(async () => {
    if (!editingQuestionData) return;

    const reIndexMap: number[] = [];
    let newIndexCounter = 0;
    editingQuestionData.options.forEach(opt => {
        if (opt.trim() !== "") {
            reIndexMap.push(newIndexCounter++);
        } else {
            reIndexMap.push(-1);
        }
    });

    const newOptions = editingQuestionData.options.filter(opt => opt.trim() !== "");
    
    if (newOptions.length === 0) {
        toast({
            title: "保存できません",
            description: "少なくとも1つの選択肢が必要です。",
            variant: "destructive",
        });
        return;
    }

    const newCorrectAnswers = editingQuestionData.correct_answers
        .map(oldIndex => reIndexMap[oldIndex])
        .filter(newIndex => newIndex !== -1)
        .sort((a,b) => a - b);

    const cleanedQuestionData = {
        ...editingQuestionData,
        options: newOptions,
        correct_answers: newCorrectAnswers,
    };

    try {
      const { shuffledOptions, ...questionToUpdate } = cleanedQuestionData;
      const updatedQuestion = await updateQuestion(questionToUpdate);

      setQuestions(prevQuestions => {
          const newQuestions = [...prevQuestions];
          const localIndex = newQuestions.findIndex(q => q.id === updatedQuestion.id);
          if (localIndex !== -1) {
              const originalShuffledData = newQuestions[localIndex].shuffledOptions;
              const newOptionMap = new Map(updatedQuestion.options.map((opt, i) => [i, opt]));
              
              const updatedShuffledOptions = originalShuffledData
                .map(shuffledOpt => ({
                    ...shuffledOpt,
                    option: newOptionMap.get(shuffledOpt.originalIndex) ?? shuffledOpt.option,
                }))
                .filter(shuffledOpt => newOptions.includes(shuffledOpt.option));
              
              newQuestions[localIndex] = {
                  ...newQuestions[localIndex],
                  ...updatedQuestion,
                  shuffledOptions: updatedShuffledOptions,
              };
          }
          return newQuestions;
      });

      setIsEditingQuestion(false);
      setEditingQuestionData(null);
      toast({
          title: "問題が更新されました",
          description: "変更が正常に保存されました。",
      });
    } catch (error) {
        console.error("Failed to update question:", error);
        toast({
            title: "更新に失敗しました",
            description: error instanceof Error ? error.message : "コンソールでエラーを確認してください。",
            variant: "destructive",
        });
    }
  }, [editingQuestionData, toast]);

  useEffect(() => {
    const loadQuiz = async () => {
      setIsLoading(true);
      const savedStateJSON = sessionStorage.getItem('suspendedQuiz');
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        setQuestions(savedState.questions || []);
        setUserAnswers(savedState.userAnswers || {});
        setCurrentQuestionIndex(savedState.currentQuestionIndex || 0);
        setElapsedTime(savedState.elapsedTime || 0);
        setShowTimer(savedState.showTimerParam);
        setStartTime(new Date());
      } else {
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
        
        setShowTimer(initialShowTimer);
        const allQuestions = await getQuestions();
        let selectedQuestions: Question[] = [];

        if (questionIdsParam) {
          const questionIds = questionIdsParam.split(',');
          const questionIdMap = new Map(allQuestions.map(q => [q.id, q]));
          selectedQuestions = questionIds.map(id => questionIdMap.get(id)).filter((q): q is Question => !!q);
        } else if (categoriesParam) {
          const categories = categoriesParam.split(",");
          const limit = Number(limitParam);
          const filtered = allQuestions.filter(q => categories.includes(q.category));
          const shuffled = shuffleArray(filtered);
          selectedQuestions = shuffled.slice(0, limit);
        }
        
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
      }
      setIsLoading(false);
    };
    loadQuiz();
  }, [categoriesParam, limitParam, questionIdsParam, searchParams]);

  useEffect(() => {
    if (!showTimer || !startTime) return;
    const initialElapsed = elapsedTime;
    const timer = setInterval(() => {
      const currentElapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
      setElapsedTime(initialElapsed + currentElapsed);
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime, showTimer]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      saveSuspendedQuiz();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveSuspendedQuiz]);

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

  const handleFinishQuiz = useCallback(async () => {
    setIsFinishingQuiz(true);
    try {
      const results = questions.map(q => {
        const answered = userAnswers[q.id];
        const sortedUserAnswers = answered ? [...answered].sort() : [];
        const sortedCorrectAnswers = [...q.correct_answers].sort();
        const isCorrect = answered ? (
          sortedUserAnswers.length === sortedCorrectAnswers.length &&
          sortedUserAnswers.every((val, idx) => val === sortedCorrectAnswers[idx])
        ) : false;
        return { questionId: q.id, isCorrect, questionText: q.question };
      });

      const total_questions = questions.length;
      const correct_count = results.filter(r => r.isCorrect).length;
      const finished_at = new Date().toISOString();
      const categoriesInQuiz = Array.from(new Set(questions.map(q => q.category)));

      const newQuizSession: QuizSession = {
        id: crypto.randomUUID(),
        started_at: startTime?.toISOString() || finished_at,
        finished_at: finished_at,
        total_questions: total_questions,
        correct_count: correct_count,
        incorrect_count: total_questions - correct_count,
        correct_rate: total_questions > 0 ? parseFloat(((correct_count / total_questions) * 100).toFixed(2)) : 0,
        elapsed_time_seconds: elapsedTime,
        categories: categoriesInQuiz,
      };

      const newHistoryEntries: History[] = results.map(result => ({
        id: crypto.randomUUID(),
        question_id: result.questionId,
        result: result.isCorrect,
        answered_at: new Date().toISOString(),
        quiz_session_id: newQuizSession.id,
        user_answers: userAnswers[result.questionId] || [],
      }));

      const allQuestions = await getQuestions();
      const updatedQuestions = allQuestions.map(q => {
        const result = results.find(r => r.questionId === q.id);
        if (!result) return q;
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

      await writeQuizSessions(newQuizSession);
      if (newHistoryEntries.length > 0) {
        await writeHistory(newHistoryEntries);
      }
      
      await fetch('/api/questions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(updatedQuestions)
      });

      sessionStorage.setItem('quizResults', JSON.stringify(results));
      sessionStorage.setItem('quizUserAnswers', JSON.stringify(userAnswers));
      sessionStorage.removeItem('suspendedQuiz');
      router.push(`/quiz/results`);
    } catch (error) {
      console.error("Failed to finish quiz:", error);
      toast({ title: "クイズの終了に失敗しました", variant: "destructive" });
      setIsFinishingQuiz(false);
    }
  }, [questions, userAnswers, startTime, elapsedTime, router, toast]);

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent style={{ backgroundColor: 'white' }}>
                <AlertDialogHeader>
                  <AlertDialogTitle>クイズを中断しますか？</AlertDialogTitle>
                  <AlertDialogDescription>現在の進捗は保存され、後で再開できます。</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>キャンセル</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    saveSuspendedQuiz();
                    router.push("/quiz");
                  }} className="bg-red-500 hover:bg-red-600 text-white">中断して戻る</AlertDialogAction>
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
                <Button variant="outline" size="icon" className="rounded-xl"><List className="w-5 h-5" /></Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-full bg-white">
                <DialogHeader><DialogTitle>解答状況</DialogTitle></DialogHeader>
                <div className="grid grid-cols-5 gap-3 p-4">
                  {questions.map((q, index) => (
                    <Button key={q.id} variant="outline" className={`justify-center ${index === currentQuestionIndex ? 'border-2 border-blue-500' : ''} ${userAnswers[q.id] ? 'bg-blue-200' : ''}`} onClick={() => handleJumpToQuestion(index)}>
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

        <Card className="p-6 mb-6 border-border">
          <div className="mb-6 text-sm text-muted-foreground border-t border-b py-3">
            <div className="flex items-center justify-between">
              <span>最終回答: {currentQuestionHistory.length > 0 ? new Date(currentQuestionHistory[0].answered_at).toLocaleString('ja-JP') : "-"}</span>
              <div className="flex items-center gap-2">
                <span>直近5回:</span>
                <div className="flex gap-1 font-mono">
                  {currentQuestionHistory.slice(0, 5).map(h => h.result ? "O" : "X").join("").padEnd(5, "-").split("").map((char, index) => (
                    <span key={index} className={char === "O" ? "text-green-500" : char === "X" ? "text-red-500" : ""}>{char}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-lg font-semibold text-foreground leading-relaxed whitespace-pre-wrap flex-1 mr-4">{currentQuestion.question}</h2>
            <Button variant="outline" size="sm" onClick={handleEditQuestionClick}><Pencil className="w-4 h-4 mr-2" />編集</Button>
          </div>
          
          <div className="space-y-3">
            {currentQuestion.type === 'single' ? (
              <>
                <RadioGroup value={userAnswers[currentQuestion.id]?.[0]?.toString() ?? ""} onValueChange={(value) => handleAnswerToggle(parseInt(value))}>
                  {currentQuestion.shuffledOptions.map(({ option, originalIndex }) => (
                    <Label key={originalIndex} htmlFor={`option-${originalIndex}`} className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${showAnswer && currentQuestion.correct_answers.includes(originalIndex) ? "border-green-500 bg-green-500/20" : showAnswer && (userAnswers[currentQuestion.id] || []).includes(originalIndex) ? "border-red-500 bg-red-500/20" : (userAnswers[currentQuestion.id] || []).includes(originalIndex) ? "border-primary bg-primary/20 border-2" : "border-border bg-secondary hover:bg-secondary/80"}`}>
                      <RadioGroupItem value={originalIndex.toString()} id={`option-${originalIndex}`} />
                      {option}
                    </Label>
                  ))}
                </RadioGroup>
                {(userAnswers[currentQuestion.id] || []).length > 0 && (
                  <div className="mt-4"><Button variant="outline" size="sm" onClick={() => setUserAnswers(prev => ({...prev, [currentQuestion.id]: []}))}>選択を解除</Button></div>
                )}
              </>
            ) : (
              currentQuestion.shuffledOptions.map(({ option, originalIndex }) => (
                  <Label key={originalIndex} htmlFor={`option-${originalIndex}`} className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${showAnswer && currentQuestion.correct_answers.includes(originalIndex) ? "border-green-500 bg-green-500/20" : showAnswer && (userAnswers[currentQuestion.id] || []).includes(originalIndex) ? "border-red-500 bg-red-500/20" : (userAnswers[currentQuestion.id] || []).includes(originalIndex) ? "border-primary bg-primary/20" : "border-border bg-secondary hover:bg-secondary/80"}`}>
                    <Checkbox id={`option-${originalIndex}`} checked={(userAnswers[currentQuestion.id] || []).includes(originalIndex)} onCheckedChange={() => handleAnswerToggle(originalIndex)} />
                    {option}
                  </Label>
              ))
            )}
          </div>
        </Card>

        {showAnswer && (
          <Card className="p-6 mb-6 border-border">
            <h3 className="text-lg font-bold mb-2">解説</h3>
            {isEditingExplanation ? (
              <>
                <Textarea value={editedExplanation} onChange={(e) => setEditedExplanation(e.target.value)} className="mb-2" />
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

        <div className="flex gap-3 mb-10">
          <Button onClick={() => {setShowAnswer(false); setCurrentQuestionIndex(prev => Math.max(0, prev - 1));}} disabled={currentQuestionIndex === 0} className="flex-1"><ChevronLeft className="w-4 h-4 mr-2" />前の問題</Button>
          <Button onClick={() => {setShowAnswer(false); setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1));}} disabled={currentQuestionIndex === questions.length - 1} className="flex-1">次の問題<ChevronRight className="w-4 h-4 ml-2" /></Button>
        </div>

        <div className="flex justify-between items-center mb-4">
          <Button onClick={() => setShowAnswer(!showAnswer)} variant="outline"><Eye className="w-4 h-4 mr-2" />{showAnswer ? "解答を隠す" : "解答を表示"}</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline"><XCircle className="w-4 h-4 mr-2" />終了する</Button></AlertDialogTrigger>
            <AlertDialogContent style={{ backgroundColor: 'white' }}>
              <AlertDialogHeader>
                <AlertDialogTitle>クイズを終了しますか？</AlertDialogTitle>
                <AlertDialogDescription>採点を行い、結果画面に移動します。</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={handleFinishQuiz} className="bg-green-500 hover:bg-green-600 text-white">終了する</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Toaster />
      </div>

      <Dialog open={isEditingQuestion} onOpenChange={setIsEditingQuestion}>
        <DialogContent className="max-w-3xl w-full bg-white">
          <DialogHeader><DialogTitle>問題を編集</DialogTitle></DialogHeader>
          {editingQuestionData && (
            <div className="space-y-4 p-1 max-h-[80vh] overflow-y-auto">
              <div>
                <Label htmlFor="edit-category">カテゴリ</Label>
                <Input id="edit-category" value={editingQuestionData.category} onChange={(e) => handleEditingFormChange('category', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-question">問題文</Label>
                <Textarea id="edit-question" value={editingQuestionData.question ?? ''} onChange={(e) => handleEditingFormChange('question', e.target.value)} rows={4} />
              </div>
              <div>
                <Label>選択肢と正解</Label>
                <div className="space-y-2">
                  {editingQuestionData.type === 'single' ? (
                      <RadioGroup value={editingQuestionData.correct_answers[0]?.toString()} onValueChange={(value) => handleCorrectAnswerChange(parseInt(value))}>
                          {editingQuestionData.options.map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <RadioGroupItem value={index.toString()} id={`edit-opt-${index}`} />
                                <Input value={option} onChange={(e) => handleOptionChange(index, e.target.value)} />
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteOption(index)}><X className="w-4 h-4" /></Button>
                            </div>
                          ))}
                      </RadioGroup>
                  ) : (
                      editingQuestionData.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                              <Checkbox checked={editingQuestionData.correct_answers.includes(index)} onCheckedChange={() => handleCorrectAnswerChange(index)} />
                              <Input value={option} onChange={(e) => handleOptionChange(index, e.target.value)} />
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteOption(index)}><X className="w-4 h-4" /></Button>
                          </div>
                      ))
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleAddOption} className="mt-2">
                  選択肢を追加
                </Button>
              </div>
              <div>
                <Label htmlFor="edit-explanation">解説</Label>
                <Textarea id="edit-explanation" value={editingQuestionData.explanation ?? ''} onChange={(e) => handleEditingFormChange('explanation', e.target.value)} rows={4} />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditingQuestion(false)}>キャンセル</Button>
                <Button onClick={handleUpdateQuestion}>変更を保存</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
