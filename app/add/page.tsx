"use client"

import { useState, useEffect, useMemo, memo } from "react"
import Link from "next/link"
import { getQuestions, getHistory, writeQuestions, Question, History } from "@/lib/data"
import { 
  Home, Plus, List, Target, BarChart3, ArrowLeft, GripVertical, ChevronDown, Search 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
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

// --- Row Content (Memoized) ---
const QuestionRowContent = memo(({ row }: { row: ManagedQuestion }) => {
  return (
    <>
      <TableCell className="max-w-xs truncate">{row.question}</TableCell>
      <TableCell></TableCell>
      <TableCell className="w-20 truncate">{row.category}</TableCell>
      <TableCell className="w-20">
        <div>
          <Progress value={row.memory_strength}/>
          <span>{Math.round(row.memory_strength)}%</span>
        </div>
      </TableCell>
      <TableCell className="w-20">{row.correctRate}%</TableCell>
      <TableCell className="w-20">{row.last_answered ? new Date(row.last_answered).toLocaleDateString() : "未回答"}</TableCell>
    </>
  )
});
QuestionRowContent.displayName = 'QuestionRowContent';

// --- ドラッグ可能な行 ---
const DraggableTableRow = ({ row, isEditMode }: { row: ManagedQuestion, isEditMode: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell className="w-10">
        {isEditMode && (
          <Button variant="ghost" size="icon" {...listeners} className="cursor-grab">
            <GripVertical className="w-5 h-5 text-muted-foreground" />
          </Button>
        )}
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
  const sensors = useSensors(useSensor(PointerSensor))
  const activeQuestion = useMemo(() => questions.find((q) => q.id === activeId), [activeId, questions]);

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

  const categories = useMemo(() => [...new Set(questions.map((q) => q.category))], [questions])

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchCategory = !filterCategory || q.category === filterCategory
      const matchSearch = q.question.toLowerCase().includes(searchQuery.toLowerCase())
      return matchCategory && matchSearch
    })
  }, [questions, filterCategory, searchQuery])

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
              <Link href="/questions/new">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  新規登録
                </Button>
              </Link>
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
                <TableRow><TableHead className="w-10"></TableHead><TableHead>問題</TableHead><TableHead className="w-20"></TableHead><TableHead className="w-30">カテゴリ</TableHead><TableHead className="w-20">記憶度</TableHead><TableHead className="w-20">正答率</TableHead><TableHead className="w-30">最終回答日</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={filteredQuestions.map((q) => q.id)}
                  strategy={verticalListSortingStrategy}
                  disabled={!isEditMode}
                >
                  {filteredQuestions.map((q) => (
                    <DraggableTableRow key={q.id} row={q} isEditMode={isEditMode} />
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
                <TableCell className="w-20">
                  <div>
                    <Progress value={activeQuestion.memory_strength}/>
                    <span>{Math.round(activeQuestion.memory_strength)}%</span>
                  </div>
                </TableCell>
                <TableCell className="w-20">{activeQuestion.correctRate}%</TableCell>
                <TableCell className="w-20">{activeQuestion.last_answered ? new Date(activeQuestion.last_answered).toLocaleDateString() : "未回答"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : null}
      </DragOverlay>
    </DndContext>
  </div>
  )
}
