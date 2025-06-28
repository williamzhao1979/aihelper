"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PracticeCardProps {
  text: string
  onNext: () => void
  onPrev: () => void
  currentIndex: number
  totalTexts: number
}

export function PracticeCard({ text, onNext, onPrev, currentIndex, totalTexts }: PracticeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-center">
          练习文本 ({currentIndex + 1}/{totalTexts})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center text-xl md:text-2xl font-medium p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          {text}
        </div>

        <div className="flex justify-between">
          <Button onClick={onPrev} variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
            <ChevronLeft className="w-4 h-4" />
            上一个
          </Button>

          <Button onClick={onNext} variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
            下一个
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
