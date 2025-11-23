// /add/AddPageClient.tsx
"use client"

import React, { useState, useEffect, useMemo, useRef, memo, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { getQuestions, getHistory, writeQuestions, deleteHistory, deleteQuizSessions, Question, History, QuizSession } from "@/lib/data"
import {
  Home, Plus, List, Target, BarChart3, ArrowLeft, GripVertical, ChevronDown, Search, Trash2, PenSquare, ArrowUp, ArrowDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

// --- 型定義 ---
interface ManagedQuestion extends Question {
  attempts: number
  correctRate: number
}

type EditFormData = {
  question?: string;
  options?: string[];
  correct_answers_str?: string;
  explanation?: string;
  category?: string;
};


// --- カテゴリドロップダウン ---
function CategoryDropdown({ categories, selected, onSelect }: { categories: string[], selected: string | null, onSelect: (cat: string | null) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center">
          {selected ? `カテゴリ: ${selected}` : "すべてのカテゴリ"}
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white dark:bg-neutral-900 shadow-lg rounded-md max-h-64">
        <DropdownMenuItem className="mb-2 ml-2 font-semibold" onSelect={() => onSelect(null)}>すべてのカテゴリ</DropdownMenuItem>
        <DropdownMenuSeparator />
        {categories.map(cat => (
          <div key={cat}>
            <DropdownMenuItem onSelect={() => onSelect(cat)} className={`py-2 pl-6 pr-3 ${selected === cat ? "font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900" : ""}`}>
              {cat}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// --- メイン Client Component ---
export default function AddPageClient() {
  const searchParams = useSearchParams()
  const [questions, setQuestions] = useState<ManagedQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortColumn, setSortColumn] = useState<keyof ManagedQuestion | null>(null) // ソート列のstate
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc') // ソート方向のstate
  const [isEditMode, setIsEditMode] = useState(false)

  const handleSort = (column: keyof ManagedQuestion) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  useEffect(() => {
    // console.log('--- isEditMode changed:', isEditMode); // ログを削除
  }, [isEditMode]);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<ManagedQuestion | null>(null)
  const [currentFormData, setCurrentFormData] = useState<EditFormData>({})
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})
  const { toast } = useToast()
  const categories = useMemo(() => [...new Set(questions.map(q => q.category))], [questions])

  const filteredQuestions = useMemo(() => {
    let sorted = questions.filter(q => {
      const matchCategory = !filterCategory || q.category === filterCategory
      const matchSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCategory && matchSearch
    })

    if (sortColumn) {
      sorted = [...sorted].sort((a, b) => {
        const aValue = a[sortColumn]
        const bValue = b[sortColumn]

        if (sortColumn === 'correctRate' || sortColumn === 'attempts') {
          // 数値の比較
          return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
        } else if (sortColumn === 'last_answered') {
          // 日付の比較 (nullを最後に持ってくる)
          const dateA = aValue ? new Date(aValue as string).getTime() : 0
          const dateB = bValue ? new Date(bValue as string).getTime() : 0

          if (dateA === 0 && dateB === 0) return 0
          if (dateA === 0) return sortDirection === 'asc' ? 1 : -1
          if (dateB === 0) return sortDirection === 'asc' ? -1 : 1

          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA
        } else {
          // 文字列の比較 (question, category)
          const stringA = String(aValue || '').toLowerCase()
          const stringB = String(bValue || '').toLowerCase()
          if (stringA < stringB) return sortDirection === 'asc' ? -1 : 1
          if (stringA > stringB) return sortDirection === 'asc' ? 1 : -1
          return 0
        }
      })
    }

    return sorted
  }, [questions, filterCategory, searchQuery, sortColumn, sortDirection])

  // --- データ取得 ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      const questionsData = await getQuestions()
      const historyData = await getHistory()
      const processed = (questionsData || []).map(q => {
        const qh = (historyData || []).filter(h => h.question_id === q.id)
        const correct = qh.filter(h => h.result).length
        const correctRate = qh.length ? Math.round((correct / qh.length) * 100) : 0
        return { ...q, attempts: qh.length, correctRate }
      })
      setQuestions(processed)
      setIsLoading(false)
    }
    fetchData()
  }, [])

  // --- ここに残りの編集やドラッグ処理、ダイアログ処理も同様に ---
  // handleEditClick, handleFormChange, handleSaveEdit, handleResetHistoryClick, handleResetHistoryConfirm, handleDragEnd
  // 上で示したものと同じ処理をこのコンポーネント内に配置

  const handleEditClick = (question: ManagedQuestion) => {
    setEditingQuestion(question);
    // Initialize form data, converting correct_answers array to a comma-separated string for input
    setCurrentFormData({
        question: question.question,
        options: question.options,
        correct_answers_str: question.correct_answers.map(n => n + 1).join(','), // Convert number[] to string for input
        explanation: question.explanation || '',
        category: question.category,
    });
    setIsEditDialogOpen(true);
    };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('option')) { // Changed from 'choice' to 'option'
      const index = parseInt(name.replace('option', ''));
      setCurrentFormData(prev => {
        const newOptions = [...(prev.options || [])]; // `options` in prev
        newOptions[index] = value;
        return { ...prev, options: newOptions };
      });
    } else {
      setCurrentFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;

    // Parse correct_answers_str to number[]
    const parsedCorrectAnswers = currentFormData.correct_answers_str
      ? currentFormData.correct_answers_str.split(',').map(s => parseInt(s.trim(), 10) - 1).filter(n => !isNaN(n) && n >= 0)
      : [];

    // Determine question type based on parsed correct answers
    const questionType = parsedCorrectAnswers.length > 1 ? "multiple" : "single";

    // Build the core Question object from currentFormData and immutable fields from editingQuestion
    const updatedCoreQuestion: Question = {
      id: editingQuestion.id,
      question: currentFormData.question || editingQuestion.question,
      options: currentFormData.options || editingQuestion.options,
      correct_answers: parsedCorrectAnswers,
      explanation: currentFormData.explanation || editingQuestion.explanation,
      category: currentFormData.category || editingQuestion.category,
      position: editingQuestion.position, // Keep original
      last_answered: editingQuestion.last_answered, // Keep original
      created_at: editingQuestion.created_at, // Keep original
      consecutive_correct: editingQuestion.consecutive_correct, // Keep original
      consecutive_wrong: editingQuestion.consecutive_wrong, // Keep original
      type: questionType, // Set based on correct_answers
    };

    const updatedManagedQuestion: ManagedQuestion = {
      ...editingQuestion, // Keep attempts, correctRate, etc. from original ManagedQuestion
      ...updatedCoreQuestion, // Overlay with updated core data
    };

   const newQuestionsState = questions.map(q =>
      q.id === updatedManagedQuestion.id ? updatedManagedQuestion : q
    );
    setQuestions(newQuestionsState);

    // Prepare data for persistence (strip UI-only fields)
    const questionsToPersist: Question[] = newQuestionsState.map(({ attempts, correctRate, ...q }) => q);

    await writeQuestions(questionsToPersist);

    setIsEditDialogOpen(false);
    setEditingQuestion(null);
    setCurrentFormData({});
  };


const handleResetHistoryClick = () => {
    setIsResetDialogOpen(true);
  };

  const handleResetHistoryConfirm = async () => {
    try {
      // 1. Delete all history records via the API
      await deleteHistory();
      
      // 2. Create the array with reset values for local state
      const resetQuestions = questions.map(q => ({
        ...q,
        attempts: 0,
        correctRate: 0,
        last_answered: null,
      }));
      
      // 3. Update local state for immediate UI feedback
      setQuestions(resetQuestions);
      
      // 4. Prepare question data for saving (strip UI-only fields)
      const questionsToSave: Question[] = resetQuestions.map(({ attempts, correctRate, ...q }) => q);
      
      // 5. Write updated questions to the data source
      await writeQuestions(questionsToSave);
      
      // 6. Delete all quiz sessions via the API
      await deleteQuizSessions();

      // 7. Close the dialog and show success toast
      setIsResetDialogOpen(false);
      setIsEditMode(false); // Turn off edit mode
      toast({
        title: "成功",
        description: "すべての学習履歴が正常にリセットされました。",
      });
    } catch (error) {
      console.error("Failed to reset history:", error);
      toast({
        title: "エラー",
        description: "学習履歴のリセット中にエラーが発生しました。",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const highlightId = searchParams.highlight as string | undefined;
    if (highlightId) {
      setHighlightedQuestionId(highlightId);
      // Wait for questions to load and render
      if (questions.length > 0) {
        // Find the index of the highlighted question
        const index = filteredQuestions.findIndex(q => q.id === highlightId);
        if (index !== -1) {
          // Scroll to the element after it has rendered
          const timer = setTimeout(() => {
            const rowElement = rowRefs.current[highlightId];
            if (rowElement) {
              rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Optionally remove highlight after some time
              setTimeout(() => setHighlightedQuestionId(null), 3000);
            }
          }, 100); // Small delay to ensure rendering
          return () => clearTimeout(timer);
        }
      }
    }
  }, [searchParams, questions, filteredQuestions]); // Depend on searchParams and questions





  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      
      if (oldIndex === -1 || newIndex === -1) {
        console.warn("Dragged item or target not found in questions list.");
        setActiveId(null);
        return;
      }

      const newOrder = arrayMove(questions, oldIndex, newIndex);

      const reindexedQuestions = newOrder.map((q, index) => ({
        ...q,
        position: index,
      }));

      setQuestions(reindexedQuestions);

      const questionsToSave: Question[] = reindexedQuestions.map(({ attempts, correctRate, ...q }) => q);
      await writeQuestions(questionsToSave);
    }
    setActiveId(null);
  };

  if (isLoading)
    return <div className="min-h-screen flex items-center justify-center"><Spinner className="w-12 h-12" /></div>

  return (
    <div>
    <Suspense fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
            <Spinner className="w-12 h-12" />
            <p className="ml-4 text-muted-foreground">読み込み中...</p>
        </div>
        }>
        <div>
            <div className="min-h-screen bg-background pb-20">
            <div className="container mx-auto px-4 py-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="ghost" size="icon" className="rounded-xl">
                    <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">問題管理</h1>
                    <p className="text-sm text-muted-foreground">
                    {filteredQuestions.length} / {questions.length} 件の問題
                    </p>
                </div>
                </div>

                <div className="flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-4">
                <div className="flex items-center space-x-2">
                    <Switch id="edit-mode" checked={isEditMode} onCheckedChange={setIsEditMode} />
                    <Label htmlFor="edit-mode">編集</Label>
                </div>
                <CategoryDropdown
                    categories={categories}
                    selected={filterCategory}
                    onSelect={setFilterCategory}
                />
                {isEditMode ? (
                    <Button variant="default" className="bg-red-600 text-white" onClick={handleResetHistoryClick}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    学習履歴リセット
                    </Button>
                ) : (
                    <Link href="/questions/new">
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        新規登録
                    </Button>
                    </Link>
                )}
                </div>
            </div>

            {/* 🔍 検索バー */}
            <div className="mb-4 flex items-center border border-input rounded-lg px-3 py-2 w-full max-w-md">
                <Search className="w-5 h-5 text-muted-foreground mr-2" />
                <input
                type="text"
                placeholder="問題文を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-sm"
                />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Card className="border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isEditMode && <TableHead className="w-20"></TableHead>}
                      <TableHead className="w-20 cursor-pointer" onClick={() => handleSort('correctRate')}>
                        <div className="flex items-center">
                          正答率
                          {sortColumn === 'correctRate' && (sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />)}
                        </div>
                      </TableHead>
                      <TableHead className="w-2/3 md:w-auto cursor-pointer" onClick={() => handleSort('question')}>
                        <div className="flex items-center">
                          問題
                          {sortColumn === 'question' && (sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />)}
                        </div>
                      </TableHead>
                      <TableHead className="w-4"></TableHead>
                      <TableHead className="w-30 cursor-pointer" onClick={() => handleSort('category')}>
                        <div className="flex items-center">
                          カテゴリ
                          {sortColumn === 'category' && (sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />)}
                        </div>
                      </TableHead>
                      <TableHead className="w-30 cursor-pointer" onClick={() => handleSort('last_answered')}>
                        <div className="flex items-center">
                          最終回答日
                          {sortColumn === 'last_answered' && (sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />)}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {filteredQuestions.map((q) => (
                        <TableRow
                          key={q.id}
                          className={highlightedQuestionId === q.id ? "bg-yellow-100 dark:bg-yellow-900" : ""}
                          ref={(el) => (rowRefs.current[q.id] = el)}
                        >
                            {isEditMode && (
                                <TableCell className="w-20">
                                    <div className="flex items-center">
                                        <Button variant="ghost" size="icon" className="cursor-grab">
                                            <GripVertical className="w-5 h-5 text-muted-foreground" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(q)}>
                                            <PenSquare className="w-5 h-5 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </TableCell>
                            )}
                            <TableCell className="w-20">{q.correctRate}%</TableCell>
                            <TableCell className="w-2/3 overflow-hidden relative md:w-auto">
                                <div className="line-clamp-3 md:line-clamp-none">{q.question}</div>
                            </TableCell>
                            <TableCell className="w-4"></TableCell>
                            <TableCell className="w-30 truncate">{q.category}</TableCell>
                            <TableCell className="w-30">{q.last_answered ? new Date(q.last_answered).toLocaleDateString() : "未回答"}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
            </div>
        </div>
        <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>学習履歴の削除</AlertDialogTitle>
            <AlertDialogDescription>
                本当にすべての学習履歴をリセットしますか？この操作は元に戻せません。問題データは削除されません。
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 text-white" onClick={handleResetHistoryConfirm}>削除</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white sm:max-w-[500px]">
            <DialogHeader>
            <DialogTitle>問題を編集</DialogTitle>
            <DialogDescription>
                問題の内容を編集し、保存してください。
            </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="max-h-[calc(100vh-200px)] overflow-y-auto p-4">
            <div className="grid gap-4">
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="question" className="text-right">
                    問題文
                </Label>
                <Textarea
                    id="question"
                    name="question"
                    value={currentFormData.question || ''}
                    onChange={handleFormChange}
                    className="col-span-3"
                />
                </div>
                {/* Options */}
                {currentFormData.options && currentFormData.options.map((option, index) => (
                <div key={index} className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`option${index}`} className="text-right">
                    選択肢 {index + 1}
                    </Label>
                    <Input
                    id={`option${index}`}
                    name={`option${index}`} // Unique name for each option
                    value={option}
                    onChange={handleFormChange}
                    className="col-span-3"
                    />
                </div>
                ))}
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="correct_answers_str">
                    正答番号(例: 1,3)
                </Label>
                <Input
                    id="correct_answers_str"
                    name="correct_answers_str"
                    value={currentFormData.correct_answers_str || ''}
                    onChange={handleFormChange}
                    className="col-span-3"
                />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="explanation" className="text-right">
                    解説
                </Label>
                <Textarea
                    id="explanation"
                    name="explanation"
                    value={currentFormData.explanation || ''}
                    onChange={handleFormChange}
                    className="col-span-3"
                />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                    カテゴリ
                </Label>
                <Input
                    id="category"
                    name="category"
                    value={currentFormData.category || ''}
                    onChange={handleFormChange}
                    className="col-span-3"
                />
                </div>
            </div>
            <DialogFooter>
                <Button type="submit">変更を保存</Button>
            </DialogFooter>
            </form>
        </DialogContent>
        </Dialog>
        </div>
    </Suspense>
    </div>
  )
}
