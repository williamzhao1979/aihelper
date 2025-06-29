"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"

interface CalendarHeaderProps {
  currentDate: Date
  onPreviousMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

export default function CalendarHeader({
  currentDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onRefresh,
  isRefreshing = false
}: CalendarHeaderProps) {
  const monthNames = [
    "一月", "二月", "三月", "四月", "五月", "六月",
    "七月", "八月", "九月", "十月", "十一月", "十二月"
  ]

  return (
    <div className="flex items-center justify-between p-4 bg-white border-b">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPreviousMonth}
          className="p-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-lg font-semibold text-gray-900 min-w-[120px] text-center">
          {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
        </h2>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onNextMonth}
          className="p-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className="text-sm"
        >
          今天
        </Button>
      </div>
    </div>
  )
} 