// /add/AddPageClient.tsx
"use client"

import React, { useState, useEffect, useMemo, useRef, memo, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { getQuestions, getHistory, writeQuestions, deleteHistory, deleteQuizSessions, deleteQuestions, Question, History, QuizSession } from "@/lib/data"
import {
  Home, Plus, List, Target, BarChart3, ArrowLeft, ChevronDown, Search, Trash2, ArrowUp, ArrowDown
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
import { Card } from "@/components/ui/card"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"

// --- 型定義 ---
interface ManagedQuestion extends Question {
  attempts: number
  correctRate: number
}

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set())
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

  const handleDeleteSelectedQuestions = () => {
    if (selectedQuestionIds.size === 0) {
      toast({
        title: "削除する問題を選択してください",
        variant: "destructive",
      });
      return;
    }
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const questionIdsToDelete = Array.from(selectedQuestionIds);
      
      // Delete questions from Supabase (this also deletes related history)
      await deleteQuestions(questionIdsToDelete);
      
      // Update local state
      const remainingQuestions = questions.filter(q => !selectedQuestionIds.has(q.id));
      
      // Reindex the positions
      const reindexedQuestions = remainingQuestions.map((q, index) => ({
        ...q,
        position: index,
      }));

      setQuestions(reindexedQuestions);
      setSelectedQuestionIds(new Set());
      setIsDeleteDialogOpen(false);
      toast({
        title: "成功",
        description: `${questionIdsToDelete.length}件の問題が削除されました。`,
      });
    } catch (error) {
      console.error("Failed to delete questions:", error);
      toast({
        title: "エラー",
        description: "問題の削除中にエラーが発生しました。",
        variant: "destructive",
      });
    }
  };

  const handleCheckboxChange = (questionId: string) => {
    setSelectedQuestionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedQuestionIds.size === filteredQuestions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  useEffect(() => {
    const highlightId = searchParams.get('highlight') ?? undefined;
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
                    <div className="flex gap-2">
                      <Button 
                        variant="default" 
                        className={`${selectedQuestionIds.size > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400'} text-white`}
                        onClick={handleDeleteSelectedQuestions}
                        disabled={selectedQuestionIds.size === 0}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {selectedQuestionIds.size > 0 ? `削除 (${selectedQuestionIds.size})` : "削除"}
                      </Button>
                      <Button variant="default" className="bg-red-600 text-white" onClick={handleResetHistoryClick}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        学習履歴リセット
                      </Button>
                    </div>
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
                      {isEditMode && (
                        <TableHead className="w-12">
                          <Checkbox 
                            checked={selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0}
                            onCheckedChange={handleSelectAll}
                            className="cursor-pointer"
                          />
                        </TableHead>
                      )}
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
                          className={`${highlightedQuestionId === q.id ? "bg-yellow-100 dark:bg-yellow-900" : ""} ${selectedQuestionIds.has(q.id) ? "bg-blue-50 dark:bg-blue-900" : ""}`}
                          ref={(el) => { rowRefs.current[q.id] = el; }}
                        >
                            {isEditMode && (
                                <TableCell className="w-12">
                                    <Checkbox 
                                      checked={selectedQuestionIds.has(q.id)}
                                      onCheckedChange={() => handleCheckboxChange(q.id)}
                                      className="cursor-pointer"
                                    />
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
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>問題を削除</AlertDialogTitle>
            <AlertDialogDescription>
                本当に{selectedQuestionIds.size}件の問題を削除しますか？この操作は元に戻せません。
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 text-white" onClick={handleDeleteConfirm}>削除</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
        </div>
    </Suspense>
    </div>
  )
}
