"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import UserSelector, { type UserProfile } from "@/components/healthcalendar/shared/user-selector"

interface CalendarHeaderProps {
  currentDate: Date
  onPreviousMonth: () => void
  onNextMonth: () => void
  onToday: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
  selectedUsers?: UserProfile[]
  onUserSelectionChange?: (users: UserProfile[]) => void
  availableUsers?: UserProfile[]
}

export default function CalendarHeader({
  currentDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
  onRefresh,
  isRefreshing = false,
  selectedUsers = [],
  onUserSelectionChange,
  availableUsers = []
}: CalendarHeaderProps) {
  const monthNames = [
    "一月", "二月", "三月", "四月", "五月", "六月",
    "七月", "八月", "九月", "十月", "十一月", "十二月"
  ]

  return (
    <div className="flex items-center justify-between pr-4 pl-0 pt-4 pb-4 bg-white border-b">
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPreviousMonth}
          className="p-1 h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-base font-semibold text-gray-900 px-2">
          {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
        </h2>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onNextMonth}
          className="p-1 h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex items-center space-x-1">
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1 h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className="text-xs px-2 h-8"
        >
          今天
        </Button>
      </div>
    </div>
  )
} 