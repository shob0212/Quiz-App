"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Home, Plus, Target, BarChart3, ArrowLeft, MoreHorizontal, Trash2, ArrowUpDown, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { Spinner } from "@/components/ui/spinner"

// --- Type Definitions ---
interface Question {
  id: string;
  category: string;
  question: string;
  memory_strength: number;
  last_answered: string | null;
  consecutive_correct: number;
  consecutive_wrong: number;
}

interface History {
  question_id: string;
  result: boolean;
}

interface ManagedQuestion extends Question {
  attempts: number;
  correctRate: number;
}

type SortKey = keyof ManagedQuestion | 'correctRate';
type SortDirection = 'asc' | 'desc';

// --- Main Component ---
export default function ManagePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('last_answered');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const questionsPromise = supabase.from('questions').select('id, category, question, memory_strength, last_answered, consecutive_correct, consecutive_wrong');
      const historyPromise = supabase.from('history').select('question_id, result');
      
      const [questionsRes, historyRes] = await Promise.all([questionsPromise, historyPromise]);

      if (questionsRes.error || historyRes.error) {
        console.error("Error fetching data:", questionsRes.error || historyRes.error);
      } else {
        setQuestions(questionsRes.data || []);
        setHistory(historyRes.data || []);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // --- Data Processing & Sorting ---
  const managedQuestions: ManagedQuestion[] = useMemo(() => {
    const data = questions.map(q => {
      const questionHistory = history.filter(h => h.question_id === q.id);
      const correctAttempts = questionHistory.filter(h => h.result).length;
      const correctRate = questionHistory.length > 0 ? Math.round((correctAttempts / questionHistory.length) * 100) : 0;
      return { ...q, attempts: questionHistory.length, correctRate };
    });

    // Sorting
    return data.sort((a, b) => {
      const aValue = a[sortKey as keyof ManagedQuestion];
      const bValue = b[sortKey as keyof ManagedQuestion];
      
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  }, [questions, history, sortKey, sortDirection]);

  // --- Handlers ---
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const openDeleteDialog = (id: string) => {
    setSelectedQuestionId(id);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedQuestionId) return;
    
    const { error } = await supabase.from('questions').delete().match({ id: selectedQuestionId });

    if (error) {
      console.error("Error deleting question:", error);
      alert("削除中にエラーが発生しました。");
    } else {
      setQuestions(prev => prev.filter(q => q.id !== selectedQuestionId));
    }
    setDialogOpen(false);
    setSelectedQuestionId(null);
  };

  // --- Render ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
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
                    <p className="text-sm text-muted-foreground">{managedQuestions.length} 件の問題</p>
                </div>
            </div>
            <Link href="/questions/new">
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    新規登録
                </Button>
            </Link>
        </div>

        {/* Questions Table */}
        <Card className="border-border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>問題</TableHead>
                        <TableHead onClick={() => handleSort('category')} className="cursor-pointer hover:bg-accent">
                            <div className="flex items-center gap-1">カテゴリ <ArrowUpDown className="w-3 h-3" /></div>
                        </TableHead>
                        <TableHead onClick={() => handleSort('memory_strength')} className="cursor-pointer hover:bg-accent">
                            <div className="flex items-center gap-1">記憶度 <ArrowUpDown className="w-3 h-3" /></div>
                        </TableHead>
                        <TableHead onClick={() => handleSort('correctRate')} className="cursor-pointer hover:bg-accent">
                            <div className="flex items-center gap-1">正答率 <ArrowUpDown className="w-3 h-3" /></div>
                        </TableHead>
                        <TableHead onClick={() => handleSort('last_answered')} className="cursor-pointer hover:bg-accent">
                            <div className="flex items-center gap-1">最終回答日 <ArrowUpDown className="w-3 h-3" /></div>
                        </TableHead>
                        <TableHead className="text-right">アクション</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {managedQuestions.map(q => (
                        <TableRow key={q.id}>
                            <TableCell className="max-w-xs truncate">{q.question}</TableCell>
                            <TableCell>{q.category}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Progress value={q.memory_strength} className="h-2" />
                                    <span className="text-xs text-muted-foreground">{Math.round(q.memory_strength)}%</span>
                                </div>
                            </TableCell>
                            <TableCell>{q.correctRate}%</TableCell>
                            <TableCell>{q.last_answered ? new Date(q.last_answered).toLocaleDateString() : '未回答'}</TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onSelect={() => openDeleteDialog(q.id)} className="text-destructive">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            削除
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。問題と関連するすべての解答履歴が完全に削除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border" style={{ backgroundColor: 'rgb(230, 230, 230)' }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around h-16">
            <Link href="/" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Home className="w-5 h-5" />
              <span className="text-xs font-medium">ホーム</span>
            </Link>
            <Link href="/add" className="flex flex-col items-center gap-1 text-primary">
              <List className="w-5 h-5" />
              <span className="text-xs font-medium">管理</span>
            </Link>
            <Link href="/quiz" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <Target className="w-5 h-5" />
              <span className="text-xs font-medium">出題</span>
            </Link>
            <Link href="/history" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <BarChart3 className="w-5 h-5" />
              <span className="text-xs font-medium">履歴</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  )
}
