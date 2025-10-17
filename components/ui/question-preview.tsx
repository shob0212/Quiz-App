"use client"

import { Card } from "@/components/ui/card"

interface QuestionPreviewProps {
  parsedData: {
    category?: string;
    question?: string;
    options?: string[];
    correct_answers?: number[];
    explanation?: string;
    error?: string;
  } | null;
  onOptionClick?: (index: number) => void;
  selectedAnswers?: number[];
}

const PreviewBlock = ({ 
  label, 
  content, 
  isOptions = false, 
  onOptionClick, 
  selectedAnswers 
}: { 
  label: string, 
  content?: string | string[], 
  isOptions?: boolean, 
  onOptionClick?: (index: number) => void, 
  selectedAnswers?: number[]
}) => {
  if (!content || (Array.isArray(content) && content.length === 0)) {
    return (
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
        <Card className="p-3 text-sm bg-secondary min-h-[50px] border-dashed flex items-center justify-center">
          <p className="text-muted-foreground text-xs">...</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
      <Card className="p-3 text-sm bg-secondary min-h-[50px]">
        {isOptions && Array.isArray(content) && onOptionClick ? (
          <ul className="space-y-2">
            {content.map((item, index) => (
              <li 
                key={index} 
                onClick={() => onOptionClick(index)}
                className={`cursor-pointer p-2 rounded-md transition-colors ${
                  selectedAnswers?.includes(index + 1) ? 'bg-primary/20' : 'hover:bg-primary/10'
                }`}
              >
                {item}
              </li>
            ))}
          </ul>
        ) : Array.isArray(content) ? (
          <ul className="space-y-2 pl-4 list-disc">
            {content.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </Card>
    </div>
  );
};


export function QuestionPreview({ parsedData, onOptionClick, selectedAnswers }: QuestionPreviewProps) {
  if (!parsedData) {
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">プレビュー</h2>
        <Card className="p-6 mb-2 flex items-center justify-center min-h-[400px] border-dashed">
          <p className="text-muted-foreground">テキストを入力するとプレビューが表示されます</p>
        </Card>
      </div>
    );
  }

  if (parsedData.error) {
     return (
      <div>
        <h2 className="text-lg font-semibold mb-4">プレビュー</h2>
        <Card className="p-6 flex flex-col items-center justify-center min-h-[400px] border-dashed border-destructive">
          <p className="text-destructive font-bold">フォーマットエラー</p>
          <p className="text-muted-foreground text-center mt-2 text-sm">{parsedData.error}</p>
        </Card>
      </div>
    );
  }

  const { category, question, options, correct_answers, explanation } = parsedData;

  const answerDisplay = correct_answers?.map(n => n + 1).join(', ');

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">プレビュー</h2>
      <PreviewBlock label="カテゴリ" content={category} />
      <PreviewBlock label="問題文" content={question} />
      <PreviewBlock 
        label="選択肢 (クリックで正答を選択)" 
        content={options} 
        isOptions={true} 
        onOptionClick={onOptionClick} 
        selectedAnswers={selectedAnswers}
      />
      <PreviewBlock label="正答番号" content={answerDisplay} />
      <PreviewBlock label="解説" content={explanation} />
    </div>
  );
}
