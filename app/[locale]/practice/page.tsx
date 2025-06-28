"use client"

import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mic, MicOff, RotateCcw } from "lucide-react"
import { useTimer } from "@/hooks/use-timer"
import { useStatistics } from "@/hooks/use-statistics"
import { StatisticsCards } from "@/components/practice/statistics-cards"
import { RecognitionDisplay } from "@/components/practice/recognition-display"
import { PracticeCard } from "@/components/practice/practice-card"
import { WaveVisualization } from "@/components/practice/wave-visualization"
import { LanguageSelector } from "@/components/practice/language-selector"

const PRACTICE_TEXTS = {
  en: [
    "she sells seashells by the seashore",
    "peter piper picked a peck of pickled peppers",
    "how much wood would a woodchuck chuck if a woodchuck could chuck wood",
    "red leather yellow leather",
    "unique new york",
  ],
  zh: [
    "四是四十是十十四是十四四十是四十",
    "吃葡萄不吐葡萄皮不吃葡萄倒吐葡萄皮",
    "红鲤鱼与绿鲤鱼与驴",
    "黑化肥发灰会挥发",
    "牛郎恋刘娘刘娘恋牛郎",
  ],
}

export default function PracticePage() {
  const t = useTranslations("practice")
  const [isRecording, setIsRecording] = useState(false)
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "zh">("en")
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [recognizedText, setRecognizedText] = useState("")
  const [similarity, setSimilarity] = useState(0)
  const [status, setStatus] = useState<"ready" | "listening" | "error">("ready")

  const { time, start: startTimer, stop: stopTimer, reset: resetTimer } = useTimer()
  const {
    successCount,
    attemptCount,
    totalWords,
    wordsPerMinute,
    caloriesBurned,
    incrementSuccess,
    incrementAttempt,
    addWords,
    reset: resetStats,
  } = useStatistics()

  const currentText = PRACTICE_TEXTS[currentLanguage][currentTextIndex]

  // Speech Recognition setup (placeholder for Vosk integration)
  useEffect(() => {
    // TODO: Initialize Vosk here
    console.log("Initializing Vosk speech recognition...")
  }, [currentLanguage])

  const handleStartRecording = async () => {
    try {
      setIsRecording(true)
      setStatus("listening")
      startTimer()

      // TODO: Start Vosk recognition
      console.log("Starting speech recognition...")
    } catch (error) {
      console.error("Failed to start recording:", error)
      setStatus("error")
      setIsRecording(false)
    }
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    setStatus("ready")
    stopTimer()

    // TODO: Stop Vosk recognition
    console.log("Stopping speech recognition...")
  }

  const handleReset = () => {
    setRecognizedText("")
    setSimilarity(0)
    resetTimer()
    resetStats()
    setStatus("ready")
  }

  const handleNextText = () => {
    setCurrentTextIndex((prev) => (prev + 1) % PRACTICE_TEXTS[currentLanguage].length)
    setRecognizedText("")
    setSimilarity(0)
  }

  const handlePrevText = () => {
    setCurrentTextIndex((prev) => (prev === 0 ? PRACTICE_TEXTS[currentLanguage].length - 1 : prev - 1))
    setRecognizedText("")
    setSimilarity(0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {t("title", { defaultValue: "语音练习" })}
          </h1>
          <LanguageSelector currentLanguage={currentLanguage} onLanguageChange={setCurrentLanguage} />
        </div>

        {/* Practice Text Card */}
        <PracticeCard
          text={currentText}
          onNext={handleNextText}
          onPrev={handlePrevText}
          currentIndex={currentTextIndex}
          totalTexts={PRACTICE_TEXTS[currentLanguage].length}
        />

        {/* Statistics */}
        <StatisticsCards
          successCount={successCount}
          attemptCount={attemptCount}
          totalWords={totalWords}
          wordsPerMinute={wordsPerMinute}
          caloriesBurned={caloriesBurned}
          time={time}
        />

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <Button onClick={handleReset} variant="outline" size="lg" className="flex items-center gap-2 bg-transparent">
            <RotateCcw className="w-4 h-4" />
            {t("reset", { defaultValue: "重置" })}
          </Button>

          <Button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            size="lg"
            className={`flex items-center gap-2 ${
              isRecording ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
            }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-4 h-4" />
                {t("stopRecording", { defaultValue: "停止录音" })}
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                {t("startRecording", { defaultValue: "开始录音" })}
              </>
            )}
          </Button>
        </div>

        {/* Status */}
        <div className="text-center">
          <Badge
            variant={status === "error" ? "destructive" : status === "listening" ? "default" : "secondary"}
            className="text-sm px-4 py-2"
          >
            {status === "ready" && t("statusReady", { defaultValue: "准备就绪" })}
            {status === "listening" && t("statusListening", { defaultValue: "正在聆听..." })}
            {status === "error" && t("statusError", { defaultValue: "发生错误" })}
          </Badge>
        </div>

        {/* Wave Visualization */}
        <WaveVisualization isActive={isRecording} />

        {/* Recognition Display */}
        <RecognitionDisplay recognizedText={recognizedText} targetText={currentText} similarity={similarity} />

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("instructions", { defaultValue: "使用说明" })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <p>• {t("instruction1", { defaultValue: '点击"开始录音"按钮开始语音识别' })}</p>
            <p>• {t("instruction2", { defaultValue: "清晰地朗读屏幕上显示的练习文本" })}</p>
            <p>• {t("instruction3", { defaultValue: "系统会实时显示识别结果和相似度" })}</p>
            <p>• {t("instruction4", { defaultValue: "相似度超过70%时会自动计入成功次数" })}</p>
            <p>• {t("instruction5", { defaultValue: "使用语言选择器切换中英文练习" })}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
