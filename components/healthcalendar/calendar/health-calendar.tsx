"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import CalendarDay from "./calendar-day"
import CalendarHeader from "./calendar-header"
import healthDB, { HealthRecord } from "@/lib/health-database"
import { useHealthDatabase } from "@/hooks/use-health-database"
import { getLocalDateString } from "@/lib/utils"

export default function HealthCalendar() {
  const router = useRouter()
  const { getAllRecords, isInitialized, isLoading } = useHealthDatabase()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // 获取当前月份的第一天和最后一天
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  
  // 获取日历开始日期（包括上个月的日期）
  const startDate = new Date(firstDayOfMonth)
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay())
  
  // 获取日历结束日期（包括下个月的日期）
  const endDate = new Date(lastDayOfMonth)
  endDate.setDate(endDate.getDate() + (6 - lastDayOfMonth.getDay()))

  // 生成日历日期数组
  const generateCalendarDays = () => {
    const days = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return days
  }

  const calendarDays = generateCalendarDays()

  // 获取指定日期的健康记录
  const getRecordsForDate = (date: Date) => {
    const dateString = getLocalDateString(date)
    return records.filter(record => record.date === dateString)
  }

  // 月份导航
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // 处理日期点击
  const handleDateClick = (date: Date) => {
    const dateString = getLocalDateString(date)
    router.push(`/healthcalendar/view/${dateString}` as any)
  }

  // 刷新数据
  const refreshData = useCallback(async () => {
    if (!isInitialized) return
    
    setIsRefreshing(true)
    try {
      console.log("正在刷新日历数据...")
      const allRecords = await getAllRecords()
      console.log("加载到的记录:", allRecords)
      setRecords(allRecords)
    } catch (error) {
      console.error("Failed to refresh records:", error)
    } finally {
      setIsRefreshing(false)
    }
  }, [getAllRecords, isInitialized])

  // 从IndexedDB加载数据
  useEffect(() => {
    if (isInitialized && !isLoading) {
      refreshData()
    }
  }, [isInitialized, isLoading, refreshTrigger])

  // 添加页面可见性监听，当用户从其他页面返回时刷新数据
  useEffect(() => {
    if (!isInitialized) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("页面变为可见，触发刷新")
        setRefreshTrigger(prev => prev + 1)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isInitialized])

  return (
    <div className="w-full">
      {/* 日历头部 */}
      <CalendarHeader
        currentDate={currentDate}
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onToday={goToToday}
        onRefresh={() => setRefreshTrigger(prev => prev + 1)}
        isRefreshing={isRefreshing}
      />

      {/* 星期标题 */}
      <div className="grid grid-cols-7 gap-1 p-4 bg-gray-50 border-b">
        {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
          <div
            key={index}
            className="text-center text-sm font-medium text-gray-600 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-1 p-4">
        {calendarDays.map((date, index) => {
          const isCurrentMonth = date.getMonth() === currentDate.getMonth()
          const isToday = date.toDateString() === new Date().toDateString()
          const dayRecords = getRecordsForDate(date)
          
          return (
            <CalendarDay
              key={index}
              date={date}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday}
              records={dayRecords}
              onClick={() => handleDateClick(date)}
            />
          )
        })}
      </div>

      {/* 图例 */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>例假</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>健康记录</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>便便记录</span>
          </div>
        </div>
      </div>
    </div>
  )
} 