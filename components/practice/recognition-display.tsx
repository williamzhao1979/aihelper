import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface RecognitionDisplayProps {
  recognizedText: string
  targetText: string
  similarity: number
}

export function RecognitionDisplay({ recognizedText, targetText, similarity }: RecognitionDisplayProps) {
  const renderHighlightedText = () => {
    if (!recognizedText) {
      return <div className="text-gray-400 italic">点击"开始录音"开始语音识别...</div>
    }

    const targetWords = targetText.toLowerCase().split(" ")
    const recognizedWords = recognizedText.toLowerCase().split(" ")

    return (
      <div className="flex flex-wrap gap-2">
        {recognizedWords.map((word, index) => {
          const isCorrect = targetWords[index] === word
          return (
            <span
              key={index}
              className={`px-2 py-1 rounded ${
                isCorrect
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
            >
              {word}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">实时识别结果</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="min-h-[100px] p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">{renderHighlightedText()}</div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>相似度</span>
            <span className="font-medium">{Math.round(similarity * 100)}%</span>
          </div>
          <Progress value={similarity * 100} className="h-2" />
        </div>
      </CardContent>
    </Card>
  )
}
