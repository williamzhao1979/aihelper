"use client"

import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, Target, MessageSquare, Zap, Flame } from "lucide-react"

interface StatisticsCardsProps {
  successCount: number
  attemptCount: number
  totalWords: number
  wordsPerTenSeconds: number
  caloriesBurned: number
  time: number
}

export function StatisticsCards({
  successCount,
  attemptCount,
  totalWords,
  wordsPerTenSeconds,
  caloriesBurned,
  time,
}: StatisticsCardsProps) {
  const stats = [
    {
      title: "成功次数",
      value: successCount,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "尝试次数",
      value: attemptCount,
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950",
    },
    {
      title: "语速",
      value: `${wordsPerTenSeconds}`,
      suffix: "词/10秒",
      icon: Zap,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 dark:bg-yellow-950",
    },
    {
      title: "总单词数",
      value: totalWords,
      icon: MessageSquare,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950",
    },
    {
      title: "消耗热量",
      value: `${caloriesBurned}`,
      suffix: "千卡",
      icon: Flame,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className={`absolute top-0 right-0 w-16 h-16 ${stat.bgColor} rounded-full -mr-8 -mt-8 opacity-20`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    {stat.value}
                    {stat.suffix && (
                      <span className="text-sm font-normal text-muted-foreground ml-1">{stat.suffix}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{stat.title}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
