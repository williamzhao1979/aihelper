"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import CalendarDay from "./calendar-day"
import CalendarHeader from "./calendar-header"

interface HealthRecord {
  id: string
  date: string
  type: "period" | "symptom" | "checkup" | "observation"
  content: string
}

export default function HealthCalendar() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [records, setRecords] = useState<HealthRecord[]>([])

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
    const dateString = date.toISOString().split('T')[0]
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
    const dateString = date.toISOString().split('T')[0]
    router.push(`/healthcalendar/view/${dateString}`)
  }

  // 模拟数据加载
  useEffect(() => {
    // 这里将来会从IndexedDB加载数据
    const mockRecords: HealthRecord[] = [
      {
        id: "1",
        date: new Date().toISOString().split('T')[0],
        type: "period",
        content: "例假记录"
      },
      {
        id: "2",
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: "symptom",
        content: "后腰疼痛"
      }
    ]
    setRecords(mockRecords)
  }, [])

  return (
    <div className="w-full">
      {/* 日历头部 */}
      <CalendarHeader
        currentDate={currentDate}
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onToday={goToToday}
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
            <span>身体不适</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>体检报告</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>日常观察</span>
          </div>
        </div>
      </div>
    </div>
  )
} 