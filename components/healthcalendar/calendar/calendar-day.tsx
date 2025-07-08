"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { HealthRecord } from "@/lib/health-database"

interface CalendarDayProps {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  records: HealthRecord[]
  onClick: () => void
}

export default function CalendarDay({
  date,
  isCurrentMonth,
  isToday,
  records,
  onClick
}: CalendarDayProps) {
  // 获取健康状态指示器
  const getHealthIndicators = () => {
    const indicators: string[] = []
    
    records.forEach(record => {
      switch (record.type) {
        case "period":
          indicators.push("bg-red-500")
          break
        case "health":
          indicators.push("bg-blue-500")
          break
        case "poop":
          indicators.push("bg-yellow-500")
          break
        case "meal":
          indicators.push("bg-orange-500")
          break
      }
    })
    
    return indicators.slice(0, 3) // 最多显示3个指示器
  }

  const healthIndicators = getHealthIndicators()

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative min-h-[60px] p-2 text-left transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset",
        !isCurrentMonth && "text-gray-400",
        isToday && "bg-blue-50 border-2 border-blue-500"
      )}
    >
      {/* 日期数字 */}
      <div className={cn(
        "text-sm font-medium mb-1",
        isToday && "text-blue-600 font-bold"
      )}>
        {date.getDate()}
      </div>
      
      {/* 健康状态指示器 */}
      {healthIndicators.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {healthIndicators.map((indicator, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full",
                indicator
              )}
            />
          ))}
        </div>
      )}
      
      {/* 记录数量提示 */}
      {records.length > 3 && (
        <div className="absolute top-1 right-1">
          <div className="w-4 h-4 bg-gray-600 text-white text-xs rounded-full flex items-center justify-center">
            {records.length}
          </div>
        </div>
      )}
    </button>
  )
} 