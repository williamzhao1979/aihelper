"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Mic, MicOff } from "lucide-react"
import { calculateSimilarity } from "@/lib/text-similarity"
import { useEffect, useState } from "react"

interface RecognitionDisplayProps {
  recognizedText: string
  targetText: string
  similarity: number
  isRecognizing: boolean
}

export function RecognitionDisplay({ recognizedText, targetText, similarity, isRecognizing }: RecognitionDisplayProps) {
  const [currentSimilarity, setCurrentSimilarity] = useState(0)

  // Calculate similarity when text changes
  useEffect(() => {
    if (recognizedText && targetText) {
      const sim = calculateSimilarity(recognizedText.toLowerCase(), targetText.toLowerCase())
      setCurrentSimilarity(sim * 100)
    } else {
      setCurrentSimilarity(0)
    }
  }, [recognizedText, targetText])

  const renderHighlightedText = () => {
    if (!recognizedText) {
      return (
        <div className="text-muted-foreground text-center py-8">
          {isRecognizing ? (
            <div className="flex items-center justify-center gap-2">
              <Mic className="h-5 w-5 animate-pulse" />
              正在聆听...请开始说话
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <MicOff className="h-5 w-5" />
              点击"开始录音"按钮开始识别
            </div>
          )}
        </div>
      )
    }

    const targetWords = targetText.split(" ")
    const recognizedWords = recognizedText.split(" ")

    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {recognizedWords.map((word, index) => {
          const isCorrect = index < targetWords.length && word.toLowerCase() === targetWords[index].toLowerCase()

          return (
            <span
              key={index}
              className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
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

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 70) return "text-green-600"
    if (similarity >= 50) return "text-yellow-600"
    return "text-red-600"
  }

  const getSimilarityBgColor = (similarity: number) => {
    if (similarity >= 70) return "bg-green-600"
    if (similarity >= 50) return "bg-yellow-600"
    return "bg-red-600"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isRecognizing ? (
              <Mic className="h-5 w-5 text-green-600 animate-pulse" />
            ) : (
              <MicOff className="h-5 w-5 text-muted-foreground" />
            )}
            实时识别结果
          </span>
          <Badge variant="outline" className={`${getSimilarityColor(currentSimilarity)} border-current`}>
            相似度: {Math.round(currentSimilarity)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>匹配度</span>
            <span className={getSimilarityColor(currentSimilarity)}>{Math.round(currentSimilarity)}%</span>
          </div>
          <Progress
            value={currentSimilarity}
            className="h-2"
            style={
              {
                "--progress-background": getSimilarityBgColor(currentSimilarity),
              } as React.CSSProperties
            }
          />
        </div>

        {/* Recognition text display */}
        <div className="min-h-[120px] bg-muted/30 rounded-lg p-4 border-2 border-dashed border-muted-foreground/20">
          {renderHighlightedText()}
        </div>

        {/* Status indicator */}
        {recognizedText && (
          <div className="text-center">
            {currentSimilarity >= 70 ? (
              <Badge className="bg-green-600 hover:bg-green-700">✓ 识别成功！</Badge>
            ) : currentSimilarity >= 50 ? (
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                继续努力
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-600">
                需要改进
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
