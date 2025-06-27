"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PracticeCardProps {
  text: string
  language: "en" | "zh"
}

export function PracticeCard({ text, language }: PracticeCardProps) {
  const handleSpeak = () => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = language === "en" ? "en-US" : "zh-CN"
      utterance.rate = 0.8
      speechSynthesis.speak(utterance)
    }
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            练习文本
            <Badge variant="outline">{language === "en" ? "英文" : "中文"}</Badge>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSpeak}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
          >
            <Volume2 className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center">
          <p className="text-xl font-semibold text-blue-900 dark:text-blue-100 leading-relaxed">{text}</p>
        </div>
      </CardContent>
    </Card>
  )
}
