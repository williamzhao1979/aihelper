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
  // 调试：如果是今天，输出记录信息
  if (isToday) {
    console.log('[CalendarDay] 今天的记录:', {
      date: date.toISOString().split('T')[0],
      records: records,
      recordCount: records.length,
      recordTypes: records.map(r => r.type),
      recordIds: records.map(r => r.id),
      recordDates: records.map(r => r.date),
      recordOwners: records.map(r => r.ownerId || r.uniqueOwnerId),
      hasPeriodRecords: records.some(r => r.type === "period"),
      periodRecords: records.filter(r => r.type === "period"),
      hasPoopRecords: records.some(r => r.type === "poop"),
      poopRecords: records.filter(r => r.type === "poop"),
      hasMealRecords: records.some(r => r.type === "meal"),
      mealRecords: records.filter(r => r.type === "meal"),
      hasMyRecords: records.some(r => r.type === "myrecord"),
      myRecords: records.filter(r => r.type === "myrecord"),
      hasItemRecords: records.some(r => r.type === "item"),
      itemRecords: records.filter(r => r.type === "item"),
      hasHealthRecords: records.some(r => r.type === "health"),
      healthRecords: records.filter(r => r.type === "health"),
      hasMoodRecords: records.some(r => r.type === "mood"),
      moodRecords: records.filter(r => r.type === "mood"),
      hasMedicationRecords: records.some(r => r.type === "medication"),
      medicationRecords: records.filter(r => r.type === "medication"),
      hasMeditationRecords: records.some(r => r.type === "meditation"),
      meditationRecords: records.filter(r => r.type === "meditation"),
      hasCheckupRecords: records.some(r => r.type === "checkup"),
      checkupRecords: records.filter(r => r.type === "checkup"),
      hasThoughtRecords: records.some(r => r.type === "thought"),
      thoughtRecords: records.filter(r => r.type === "thought"),
      hasExerciseRecords: records.some(r => r.type === "exercise"),
      exerciseRecords: records.filter(r => r.type === "exercise")
    })
  }

  // 获取健康状态指示器
  const getHealthIndicators = () => {
    const indicatorSet = new Set<string>()
    
    records.forEach(record => {
      switch (record.type) {
        case "period":
          indicatorSet.add("bg-red-500")
          break
        case "myrecord":
          indicatorSet.add("bg-green-500")
          break
        case "poop":
          indicatorSet.add("bg-yellow-500")
          break
        case "meal":
          indicatorSet.add("bg-orange-500")
          break
        case "item":
          indicatorSet.add("bg-amber-500")
          break
        case "health":
          indicatorSet.add("bg-blue-500")
          break
        case "mood":
          indicatorSet.add("bg-pink-500")
          break
        case "medication":
          indicatorSet.add("bg-purple-500")
          break
        case "meditation":
          indicatorSet.add("bg-purple-500")
          break
        case "checkup":
          indicatorSet.add("bg-purple-500")
          break
        case "thought":
          indicatorSet.add("bg-yellow-600")
          break
        case "exercise":
          indicatorSet.add("bg-green-500")
          break
      }
    })
    
    return Array.from(indicatorSet).slice(0, 1) // 最多显示3个指示器
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
      {records.length > 1 && (
        <div className="absolute top-1 right-1">
          <div className="w-4 h-4 bg-gray-600 text-white text-xs rounded-full flex items-center justify-center">
            {records.length}
          </div>
        </div>
      )}
    </button>
  )
}