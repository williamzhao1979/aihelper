import { Card, CardContent } from "@/components/ui/card"
import { Trophy, Target, Clock, Zap, Flame } from "lucide-react"

interface StatisticsCardsProps {
  successCount: number
  attemptCount: number
  totalWords: number
  wordsPerMinute: number
  caloriesBurned: number
  time: number
}

export function StatisticsCards({
  successCount,
  attemptCount,
  totalWords,
  wordsPerMinute,
  caloriesBurned,
  time,
}: StatisticsCardsProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const stats = [
    {
      icon: Trophy,
      label: "成功次数",
      value: successCount,
      color: "text-green-600",
    },
    {
      icon: Target,
      label: "尝试次数",
      value: attemptCount,
      color: "text-blue-600",
    },
    {
      icon: Clock,
      label: "用时",
      value: formatTime(time),
      color: "text-purple-600",
    },
    {
      icon: Zap,
      label: "语速",
      value: `${wordsPerMinute}/10s`,
      color: "text-orange-600",
    },
    {
      icon: Flame,
      label: "热量",
      value: `${caloriesBurned}千卡`,
      color: "text-red-600",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card key={index} className="text-center">
            <CardContent className="p-4">
              <Icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">{stat.label}</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
