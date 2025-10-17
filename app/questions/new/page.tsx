"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Home, Plus, Target, BarChart3, ArrowLeft, Check, List, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { QuestionPreview } from "@/components/ui/question-preview"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils"

// --- タイプ定義 ---
type ParsedDataType = { category?: string; question?: string; options?: string[]; correct_answers?: number[]; explanation?: string; error?: string; } | null;

// --- ヘルパー関数 ---
const parseForPreview = (text: string): ParsedDataType => {
  if (!text.trim()) return null;
  try {
    const blocks = text.split(/\n\s*\n/);
    const result: Partial<ParsedDataType> = {};
    if (blocks[0]) {
      const firstNewlineIndex = blocks[0].indexOf('\n');
      if (firstNewlineIndex !== -1) {
        result.category = blocks[0].substring(0, firstNewlineIndex).trim();
        result.question = blocks[0].substring(firstNewlineIndex + 1).trim();
      } else { result.category = blocks[0].trim(); }
    }
    if (blocks[1]) { result.options = blocks[1].split('\n').map(opt => opt.trim()).filter(opt => opt); }
    if (blocks[2]) {
      const answerLines = blocks[2].split('\n');
      const correctAnswersStr = answerLines[0].trim();
      if (correctAnswersStr) {
        const answers = correctAnswersStr.split(',').map(n => parseInt(n.trim(), 10) - 1);
        if (answers.some(isNaN)) { throw new Error("正答番号は数字で入力してください。"); }
        result.correct_answers = answers;
      }
      result.explanation = answerLines.slice(1).join('\n').trim();
    }
    return result as ParsedDataType;
  } catch (error) {
    return { error: (error as Error).message };
  }
};

// --- メインコンポーネント ---
export default function AddNewQuestionPage() {
  // --- State管理 ---
  const [inputValue, setInputValue] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedDataType>(null);
  const [isCategorySticky, setIsCategorySticky] = useState(true);
  const [clickedAnswers, setClickedAnswers] = useState<number[]>([]);
  const [isHoverPreviewVisible, setIsHoverPreviewVisible] = useState(false);

  // --- Effect ---
  useEffect(() => {
    const parsed = parseForPreview(inputValue);
    setPreviewData(parsed);
    const answerNumbers = parsed?.correct_answers?.map(n => n + 1) ?? [];
    if (JSON.stringify(answerNumbers) !== JSON.stringify(clickedAnswers)) {
      setClickedAnswers(answerNumbers);
    }
  }, [inputValue, clickedAnswers]);

  // --- ハンドラ ---
  const parseAndAddQuestion = async (): Promise<{success: boolean, category: string | null}> => {
    const text = inputValue.trim();
    if (!text) return { success: false, category: null };
    try {
      const blocks = text.split(/\n\s*\n/);
      if (blocks.length < 3) throw new Error("無効な形式です。カテゴリ・問題・選択肢・正答のブロックが必要です。");
      const [categoryAndQuestion, optionsBlock, answerBlock] = blocks;
      const firstNewlineIndex = categoryAndQuestion.indexOf('\n');
      if (firstNewlineIndex === -1) throw new Error("無効な形式です。カテゴリと問題文が改行で区切られていません。");
      const category = categoryAndQuestion.substring(0, firstNewlineIndex).trim();
      if (!category) throw new Error("カテゴリがありません。");
      const question = categoryAndQuestion.substring(firstNewlineIndex + 1).trim();
      if (!question) throw new Error("問題文がありません。");
      const options = optionsBlock.split('\n').map(opt => opt.trim()).filter(opt => opt);
      if (options.length < 2) throw new Error("無効な形式です。選択肢は2つ以上必要です。");
      const answerLines = answerBlock.split('\n');
      const correctAnswersStr = answerLines[0].trim();
      if (!correctAnswersStr) throw new Error("正答番号がありません。");
      const explanation = answerLines.slice(1).join('\n').trim();
      const correctAnswers = correctAnswersStr.split(',').map(n => parseInt(n.trim(), 10) - 1);
      if (correctAnswers.some(isNaN)) throw new Error("無効な形式です。正答は数字である必要があります。");
      const newQuestion = { category, question, options, correct_answers: correctAnswers, explanation: explanation || null, type: correctAnswers.length > 1 ? "multiple" : "single", memory_strength: 0 };
      const { error } = await supabase.from('questions').insert([newQuestion]);
      if (error) throw error;
      return { success: true, category: category };
    } catch (error) { 
      console.error("Supabase Error:", error);
      alert(`エラーが発生しました: ${(error as Error).message}`);
      return { success: false, category: null };
    }
  };

  const handleSubmit = async () => {
    const { success, category } = await parseAndAddQuestion();
    if (success && category) {
      setShowToast(true);
      if (isCategorySticky) {
        setInputValue(`${category}\n`);
      } else {
        setInputValue("");
      }
      setClickedAnswers([]);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handlePreviewOptionClick = (optionIndex: number) => {
    const answerNumber = optionIndex + 1;
    const newClickedAnswers = clickedAnswers.includes(answerNumber)
      ? clickedAnswers.filter(n => n !== answerNumber)
      : [...clickedAnswers, answerNumber];
    setClickedAnswers(newClickedAnswers);

    const blocks = inputValue.split(/\n\s*\n/);
    const baseText = blocks.slice(0, 2).join('\n\n');
    const explanationAndBeyond = blocks.length > 2 ? blocks[2].split('\n').slice(1).join('\n') : '';

    let newText = baseText;
    if (newClickedAnswers.length > 0) {
      newText += '\n\n' + newClickedAnswers.sort((a, b) => a - b).join(',');
    }
    if (explanationAndBeyond.trim()) {
       if (newClickedAnswers.length === 0) newText += '\n\n';
       newText += '\n' + explanationAndBeyond;
    }
    setInputValue(newText);
  };

  // --- レンダリング ---
  const RightColumnContent = () => (
    <>
      <QuestionPreview 
        parsedData={previewData} 
        onOptionClick={handlePreviewOptionClick}
        selectedAnswers={clickedAnswers}
      />
      <Card className="mt-4 p-4 bg-secondary/50 border-border">
        <h3 className="text-sm font-semibold text-foreground">💡入力フォーマット</h3>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li><span className="text-gray-400">１：</span>{`[カテゴリ]`}</li>
          <li><span className="text-gray-400">２：</span>{`[問題文]`}</li>
          <li className="text-gray-300">{`　　 --- <空白行> ---`}</li>
          <li><span className="text-gray-400">３：</span>{`[選択肢]`}</li>
          <li>{`　　[選択肢]`}</li>
          <li>{`　　 ︙`}</li>
          <li className="text-gray-300">{`　　 --- <空白行> ---`}</li>
          <li><span className="text-gray-400">４：</span>{`[正答番号],[正答番号] ．．．`}</li>
          <li><span className="text-gray-400">５：</span>{`[解説] `}<span className="text-blue-300">※任意</span></li>
        </ul>
      </Card>
    </>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* --- 縦長画面用のホバープレビュー --- */}
      <div className="lg:hidden group fixed right-0 top-0 h-full w-6 z-30" 
        onMouseEnter={() => setIsHoverPreviewVisible(true)}
        onMouseLeave={() => setIsHoverPreviewVisible(false)}
      >
        {/* ホバー領域のタブ */}
        <div className="absolute top-1/2 -translate-y-1/2 right-0 h-32 w-full bg-secondary/80 rounded-l-lg flex items-center justify-center">
            <Eye className="w-4 h-4 text-muted-foreground" />
        </div>
        {/* プレビュー本体 */}
        <div className={cn(
          "fixed top-0 right-0 h-full w-80 overflow-y-auto bg-card/90 p-4 border-l shadow-lg transition-transform duration-300 ease-in-out backdrop-blur-lg",
          isHoverPreviewVisible ? "translate-x-0" : "translate-x-full"
        )}>
          <RightColumnContent />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/add">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">問題登録</h1>
            <p className="text-sm text-muted-foreground">新しい問題を追加</p>
          </div>
        </div>

        

        {/* --- メインレイアウト --- */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 items-start">
          {/* Left Column: Form */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <h2 className="text-lg font-semibold">問題を入力</h2>
              <div className="flex items-center ml-auto">
                <Switch id="sticky-category" checked={isCategorySticky} onCheckedChange={setIsCategorySticky} className="data-[state=unchecked]:bg-zinc-700" />
                <Label htmlFor="sticky-category">カテゴリを維持する</Label>
              </div>
            </div>
            <Card className="p-6 border-border">
              <div className="space-y-4">
                <div>
                  
                  <label className="text-sm font-medium text-foreground mb-2 block">問題内容</label>
                  <Textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={`S3\nS3に保存するデータをAWS管理のキーで暗号化し、利用状況を自動記録したい。この要件に最も適した暗号化方式はどれか？\n\nSSE-S3\nSSE-KMS\nSSE-C\nクライアント側暗号化\n\n2\nSSE-KMSは、KMSで管理されるキーを使用してサーバー側の暗号化を行います。キーの使用状況はCloudTrailで追跡可能です。`}
                    className="min-h-[calc(100vh-20rem)] resize-none bg-secondary border-border text-foreground placeholder:text-gray-300"
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    登録する
                  </Button>
                  <Link href="/add" className="flex-1">
                    <Button variant="outline" className="w-full border-border bg-transparent">キャンセル</Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Preview (横長画面でのみ表示) */}
          <div className="hidden lg:block sticky top-6">
            <RightColumnContent />
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <Card className="p-4 bg-green-500/10 border-green-500/20 flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20">
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-green-500">登録完了</p>
              <p className="text-xs text-green-500/80">問題を追加しました</p>
            </div>
          </Card>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border" style={{ backgroundColor: 'rgb(230, 230, 230)' }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around h-16">
            <Link href="/" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"><Home className="w-5 h-5" /><span className="text-xs font-medium">ホーム</span></Link>
            <Link href="/add" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"><List className="w-5 h-5" /><span className="text-xs font-medium">管理</span></Link>
            <Link href="/quiz" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"><Target className="w-5 h-5" /><span className="text-xs font-medium">出題</span></Link>
            <Link href="/history" className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"><BarChart3 className="w-5 h-5" /><span className="text-xs font-medium">履歴</span></Link>
          </div>
        </div>
      </nav>
    </div>
  )
}
