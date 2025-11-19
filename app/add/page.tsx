"use client"

import { useState, useEffect, useMemo, memo, useRef, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { getQuestions, getHistory, writeQuestions, writeHistory, writeQuizSessions, Question, History, QuizSession } from "@/lib/data"
import { 
  Home, Plus, List, Target, BarChart3, ArrowLeft, GripVertical, ChevronDown, Search, Trash2, PenSquare
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
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { 
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell 
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface ManagedQuestion extends Question {
  attempts: number
  correctRate: number
}

// 編集フォーム用のデータ型
type EditFormData = {
  question?: string;
  options?: string[];
  correct_answers_str?: string; // String representation of correct answers (e.g., "1,3")
  explanation?: string;
  category?: string;
};

// --- Row Content (Memoized) ---
const QuestionRowContent = memo(({ row }: { row: ManagedQuestion }) => {
  return (
    <>
      <TableCell className="max-w-xs truncate">{row.question}</TableCell>
      <TableCell></TableCell>
      <TableCell className="w-20 truncate">{row.category}</TableCell>
      <TableCell className="w-20">{row.correctRate}%</TableCell>
      <TableCell className="w-20">{row.last_answered ? new Date(row.last_answered).toLocaleDateString() : "未回答"}</TableCell>
    </>
  )
});
QuestionRowContent.displayName = 'QuestionRowContent';

// --- ドラッグ可能な行 ---
const DraggableTableRow = ({ row, isEditMode, onEditClick, isHighlighted, rowRef }: { row: ManagedQuestion, isEditMode: boolean, onEditClick: (question: ManagedQuestion) => void, isHighlighted: boolean, rowRef: (el: HTMLTableRowElement | null) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <TableRow
      ref={(node) => {
        setNodeRef(node);
        rowRef(node); // Also set our own ref
      }}
      style={style}
      {...attributes}
      className={`${isHighlighted ? "bg-blue-500/20 ring-4 ring-blue-500/50 transition-all duration-500 ease-in-out" : ""}`}
    >
      <TableCell className="w-20">
        <div className="flex items-center">
          {isEditMode && (
            <>
              <Button variant="ghost" size="icon" {...listeners} className="cursor-grab">
                <GripVertical className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onEditClick(row)}>
                <PenSquare className="w-5 h-5 text-muted-foreground" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
      <QuestionRowContent row={row} />
    </TableRow>
  )
}

// --- カテゴリドロップダウン ---
function CategoryDropdown({
  categories,
  selected,
  onSelect,
}: {
  categories: string[]
  selected: string | null
  onSelect: (cat: string | null) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center">
          {selected ? `カテゴリ: ${selected}` : "すべてのカテゴリ"}
          <ChevronDown
            className={`w-4 h-4 ml-2 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-white dark:bg-neutral-900 shadow-lg rounded-md max-h-64"
      >
        <DropdownMenuItem className="mb-2 ml-2 font-semibold" onSelect={() => onSelect(null)}>
          すべてのカテゴリ
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {categories.map((cat) => {
          const isSelected = selected === cat;
          return (
            <div
              key={cat}
              className={`w-auto mx-auto `}
            >
              <DropdownMenuItem
                onSelect={() => onSelect(cat)}
                className={`py-2 pl-6 pr-3 ${isSelected ? "font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900" : ""}`}
              >
                {cat}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// --- メインページ ---
export default function ManagePage() {
  const [questions, setQuestions] = useState<ManagedQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("") // 🔍 追加
  const [isEditMode, setIsEditMode] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ManagedQuestion | null>(null);
  const [currentFormData, setCurrentFormData] = useState<EditFormData>({});
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({}); // For scrolling
  const searchParams = useSearchParams(); // Get search params
  const sensors = useSensors(useSensor(PointerSensor))
  const activeQuestion = useMemo(() => questions.find((q) => q.id === activeId), [activeId, questions]);

  const categories = useMemo(() => [...new Set(questions.map((q) => q.category))], [questions])

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchCategory = !filterCategory || q.category === filterCategory
      const matchSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [questions, filterCategory, searchQuery])


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

    // Update local state with the new ManagedQuestion properties
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
    // 1. Clear history file
    await writeHistory([]);
    
    // 2. Create the array with reset values
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
    await writeQuizSessions([]); // Clear quiz sessions as well

    // 6. Close the dialog
    setIsResetDialogOpen(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      const questionsData = await getQuestions();
      const historyData = await getHistory();

      const processed = (questionsData || []).map((q) => {
        const qh = (historyData || []).filter((h) => h.question_id === q.id)
        const correct = qh.filter((h) => h.result).length
        const correctRate = qh.length ? Math.round((correct / qh.length) * 100) : 0
        return { ...q, attempts: qh.length, correctRate }
      })
      setQuestions(processed.sort((a, b) => a.position - b.position))
      setIsLoading(false)
    }
    fetchData()
  }, [])

  useEffect(() => {
    const highlightId = searchParams.get('highlight');
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
    const { active, over } = event
    if (!over) return
    if (active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id)
      const newIndex = questions.findIndex((q) => q.id === over.id)
      
      if (oldIndex === -1 || newIndex === -1) return;

      let newOrder = arrayMove(questions, oldIndex, newIndex);
      newOrder = newOrder.map((q, index) => ({ ...q, position: index }));

      setQuestions(newOrder);

      const questionsToSave: Question[] = newOrder.map(({ attempts, correctRate, ...q }) => q);
      await writeQuestions(questionsToSave);
    }
    setActiveId(null)
  }
  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
        <p className="ml-4 text-muted-foreground">読み込み中...</p>
      </div>
    }>
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
        disabled={!isEditMode}
      >
        <div className="min-h-screen bg-background pb-20">
        <div className="container mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
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

            <div className="flex items-center gap-4">
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
          <Card className="border-border">
            <Table>
              <TableHeader>
                <TableRow><TableHead className="w-20"></TableHead><TableHead>問題</TableHead><TableHead className="w-20"></TableHead><TableHead className="w-30">カテゴリ</TableHead><TableHead className="w-20">正答率</TableHead><TableHead className="w-30">最終回答日</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={filteredQuestions.map((q) => q.id)}
                  strategy={verticalListSortingStrategy}
                  disabled={!isEditMode}
                >
                  {filteredQuestions.map((q) => (
                    <DraggableTableRow
                      key={q.id}
                      row={q}
                      isEditMode={isEditMode}
                      onEditClick={handleEditClick}
                      isHighlighted={highlightedQuestionId === q.id}
                      rowRef={(el) => (rowRefs.current[q.id] = el)}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
      <DragOverlay>
        {activeQuestion ? (
          <Table className="bg-background shadow-lg">
            <TableBody>
              <TableRow>
                <TableCell className="w-10">
                  <Button variant="ghost" size="icon" className="cursor-grabbing">
                    <GripVertical className="w-5 h-5 text-muted-foreground" />
                  </Button>
                </TableCell>
                <TableCell className="max-w-xs truncate">{activeQuestion.question}</TableCell>
                <TableCell></TableCell>
                <TableCell className="w-20 truncate">{activeQuestion.category}</TableCell>
                <TableCell className="w-20">{activeQuestion.correctRate}%</TableCell>
                <TableCell className="w-20">{activeQuestion.last_answered ? new Date(activeQuestion.last_answered).toLocaleDateString() : "未回答"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : null}
      </DragOverlay>
    </DndContext>
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
        <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
          <div className="grid gap-4 py-4">
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
  )
}
