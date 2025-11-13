"use client"

import { useState, useEffect, useMemo } from "react"
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
  DndContext, closestCenter, PointerSensor, useSensor, useSensors 
} from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ManagedQuestion extends Question {
  attempts: number
  correctRate: number
}

// --- ドラッグ可能な行 ---
const DraggableTableRow = ({ row }: { row: ManagedQuestion }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell className="w-10">
        <Button variant="ghost" size="icon" {...listeners} className="cursor-grab">
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </Button>
      </TableCell>
      <TableCell className="max-w-xs truncate">{row.question}</TableCell>
      <TableCell>{row.category}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress value={row.memory_strength} className="h-2" />
          <span className="text-xs text-muted-foreground">{Math.round(row.memory_strength)}%</span>
        </div>
      </TableCell>
      <TableCell>{row.correctRate}%</TableCell>
      <TableCell>{row.last_answered ? new Date(row.last_answered).toLocaleDateString() : "未回答"}</TableCell>

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
  const sensors = useSensors(useSensor(PointerSensor))

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
    if (active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id)
      const newIndex = questions.findIndex((q) => q.id === over.id)
      const newOrder = arrayMove(questions, oldIndex, newIndex)
      setQuestions(newOrder)
      
      const allQuestions = await getQuestions();
      const updatedQuestions = newOrder.map((q, i) => {
        const originalQuestion = allQuestions.find(aq => aq.id === q.id);
        if (originalQuestion) {
          originalQuestion.position = i;
        }
        return originalQuestion;
      });

      await writeQuestions(allQuestions);
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
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

            <div className="flex items-center gap-2">
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
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>問題</TableHead>
                  <TableHead>カテゴリ</TableHead>
                  <TableHead>記憶度</TableHead>
                  <TableHead>正答率</TableHead>
                  <TableHead>最終回答日</TableHead>

                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={filteredQuestions.map((q) => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredQuestions.map((q) => (
                    <DraggableTableRow key={q.id} row={q} />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border" style={{ backgroundColor: 'rgb(230, 230, 230)' }}>
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-around h-16">
              <Link
                href="/"
                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="w-5 h-5" />
                <span className="text-xs font-medium">ホーム</span>
              </Link>
              <Link
                href="/add"
                className="flex flex-col items-center gap-1 text-primary"
              >
                <List className="w-5 h-5" />
                <span className="text-xs font-medium">管理</span>
              </Link>
              <Link
                href="/quiz"
                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Target className="w-5 h-5" />
                <span className="text-xs font-medium">出題</span>
              </Link>
              <Link
                href="/history"
                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-xs font-medium">履歴</span>
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </DndContext>
  )
}
