"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Mic, RotateCcw, Play, Square } from "lucide-react"
import { useVoskRecognition } from "@/hooks/use-vosk-recognition"
import { useTimer } from "@/hooks/use-timer"
import { useStatistics } from "@/hooks/use-statistics"
import { StatisticsCards } from "@/components/practice/statistics-cards"
import { RecognitionDisplay } from "@/components/practice/recognition-display"
import { PracticeCard } from "@/components/practice/practice-card"
import { WaveVisualization } from "@/components/practice/wave-visualization"
import { LanguageSelector } from "@/components/practice/language-selector"

const PRACTICE_TEXTS = {
  en: "she sells seashells by the seashore",
  zh: "四是四，十是十，十四是十四，四十是四十",
}

export default function PracticePage() {
  const t = useTranslations("practice")
  const [selectedLanguage, setSelectedLanguage] = useState<"en" | "zh">("en")
  const [targetText, setTargetText] = useState(PRACTICE_TEXTS.en)

  const { isRecognizing, recognizedText, isLoading, error, startRecognition, stopRecognition, similarity } =
    useVoskRecognition(selectedLanguage)

  const { time, start: startTimer, stop: stopTimer, reset: resetTimer } = useTimer()

  const { successCount, attemptCount, totalWords, wordsPerTenSeconds, caloriesBurned, updateStats, resetStats } =
    useStatistics(time)

  // Handle language change
  useEffect(() => {
    setTargetText(PRACTICE_TEXTS[selectedLanguage])
  }, [selectedLanguage])

  // Update statistics every second
  useEffect(() => {
    if (!isRecognizing) return

    const interval = setInterval(() => {
      if (recognizedText) {
        const currentSimilarity = similarity
        updateStats(recognizedText, currentSimilarity, targetText)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isRecognizing, recognizedText, similarity, targetText, updateStats])

  const handleStartRecording = async () => {
    try {
      await startRecognition()
      startTimer()
    } catch (err) {
      console.error("Failed to start recognition:", err)
    }
  }

  const handleStopRecording = () => {
    stopRecognition()
    stopTimer()
  }

  const handleReset = () => {
    stopRecognition()
    resetTimer()
    resetStats()
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <Mic className="h-12 w-12 mx-auto mb-2" />
              <h2 className="text-xl font-semibold mb-2">语音识别错误</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={() => window.location.reload()}>刷新页面</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          <Mic className="inline-block h-8 w-8 mr-2 text-blue-600" />
          实时语音练习
        </h1>
        <p className="text-muted-foreground">使用 Vosk 引擎进行实时语音识别和练习</p>
      </div>

      {/* Language Selector */}
      <div className="mb-6">
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          disabled={isRecognizing}
        />
      </div>

      {/* Practice Text Card */}
      <div className="mb-6">
        <PracticeCard text={targetText} language={selectedLanguage} />
      </div>

      {/* Statistics Cards */}
      <div className="mb-6">
        <StatisticsCards
          successCount={successCount}
          attemptCount={attemptCount}
          totalWords={totalWords}
          wordsPerTenSeconds={wordsPerTenSeconds}
          caloriesBurned={caloriesBurned}
          time={time}
        />
      </div>

      {/* Control Buttons */}
      <div className="flex justify-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isLoading}
          className="flex items-center gap-2 bg-transparent"
        >
          <RotateCcw className="h-4 w-4" />
          重置
        </Button>

        {!isRecognizing ? (
          <Button
            onClick={handleStartRecording}
            disabled={isLoading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                加载中...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                开始录音
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleStopRecording} className="flex items-center gap-2 bg-red-600 hover:bg-red-700">
            <Square className="h-4 w-4" />
            停止录音
          </Button>
        )}
      </div>

      {/* Status and Timer */}
      <div className="flex justify-center items-center gap-4 mb-6">
        <Badge variant={isRecognizing ? "default" : "secondary"} className="px-3 py-1">
          {isLoading ? "初始化中..." : isRecognizing ? "正在聆听..." : "准备就绪"}
        </Badge>
        <Badge variant="outline" className="px-3 py-1">
          用时: {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, "0")}
        </Badge>
      </div>

      {/* Recognition Display */}
      <div className="mb-6">
        <RecognitionDisplay
          recognizedText={recognizedText}
          targetText={targetText}
          similarity={similarity}
          isRecognizing={isRecognizing}
        />
      </div>

      {/* Wave Visualization */}
      {isRecognizing && (
        <div className="mb-6">
          <WaveVisualization isActive={isRecognizing} />
        </div>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">
                1
              </Badge>
              <span>选择练习语言（中文或英文）</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">
                2
              </Badge>
              <span>点击"开始录音"按钮，允许浏览器使用麦克风</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">
                3
              </Badge>
              <span>清晰地朗读屏幕上显示的练习文本</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">
                4
              </Badge>
              <span>系统会实时显示识别结果和相似度</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">
                5
              </Badge>
              <span>相似度超过70%时，成功次数会自动增加</span>
            </div>
          </div>
          <Separator />
          <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>注意：</strong>首次使用需要下载语音识别模型（约50MB），请确保网络连接稳定。
              建议在Chrome或Edge浏览器中使用以获得最佳体验。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
