"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Calendar, ChevronLeft, ChevronRight, Activity } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useGlobalUserSelection } from "@/hooks/use-global-user-selection"
import { HealthRecord } from "@/lib/health-database"
import CalendarHeader from "./calendar-header"
import CalendarDay from "./calendar-day"
import RecordTypeLegend from "./record-type-legend"
import type { UserProfile } from "../shared/user-selector"
import dayjs from "dayjs"

interface HealthCalendarProps {
  selectedUsers: UserProfile[]
  onUserSelectionChange: (users: UserProfile[]) => void
  availableUsers: UserProfile[]
  userSelectionVersion: number
  records: HealthRecord[]
  onCloudSync?: () => Promise<void>
  isSyncing?: boolean
}

export default function HealthCalendar({
  selectedUsers,
  onUserSelectionChange,
  availableUsers,
  userSelectionVersion,
  records,
  onCloudSync,
  isSyncing = false
}: HealthCalendarProps) {
  const router = useRouter()
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [navigationState, setNavigationState] = useState({
    isNavigating: false,
    lastNavigationTime: 0
  })

  // 使用全局用户选择状态
  const { selectedUsers: globalSelectedUsers, updateSelectedUsers } = useGlobalUserSelection()

  // 同步全局状态到本地 props
  useEffect(() => {
    if (globalSelectedUsers.length > 0 && JSON.stringify(globalSelectedUsers) !== JSON.stringify(selectedUsers)) {
      console.log('[HealthCalendar] Syncing global state to local props:', globalSelectedUsers)
      onUserSelectionChange(globalSelectedUsers)
    }
  }, [globalSelectedUsers, selectedUsers, onUserSelectionChange])

  // 计算当前月份的所有日期
  const calendarDays = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month')
    const endOfMonth = currentMonth.endOf('month')
    const startOfCalendar = startOfMonth.startOf('week')
    const endOfCalendar = endOfMonth.endOf('week')
    
    const days = []
    let currentDay = startOfCalendar
    
    while (currentDay.isBefore(endOfCalendar) || currentDay.isSame(endOfCalendar, 'day')) {
      days.push(currentDay)
      currentDay = currentDay.add(1, 'day')
    }
    
    return days
  }, [currentMonth])

  // 获取指定日期的记录
  const getRecordsForDate = useCallback((date: dayjs.Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD')
    const selectedUserIds = selectedUsers.map(user => user.uniqueOwnerId)
    
    return records.filter(record => {
      const recordDate = dayjs(record.date).format('YYYY-MM-DD')
      const matchesDate = recordDate === dateStr
      const matchesUser = selectedUserIds.includes(record.ownerId || record.uniqueOwnerId || '')
      
      return matchesDate && matchesUser
    })
  }, [records, selectedUsers])

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => prev.subtract(1, 'month'))
  }

  const handleNextMonth = () => {
    setCurrentMonth(prev => prev.add(1, 'month'))
  }

  const handleDateClick = useCallback((date: dayjs.Dayjs) => {
    const now = Date.now()
    const timeSinceLastNavigation = now - navigationState.lastNavigationTime
    
    // 防止重复导航
    if (navigationState.isNavigating || timeSinceLastNavigation < 1000) {
      console.log('[handleDateClick] Navigation blocked - isNavigating:', navigationState.isNavigating, 'timeSinceLastNavigation:', timeSinceLastNavigation)
      return
    }

    console.log('[handleDateClick] Date clicked:', date.format('YYYY-MM-DD'))
    console.log('[handleDateClick] Selected users:', selectedUsers)
    console.log('[handleDateClick] Global selected users:', globalSelectedUsers)
    
    setNavigationState({
      isNavigating: true,
      lastNavigationTime: now
    })

    // 构建URL参数，包含选中的用户信息
    const selectedUserId = selectedUsers[0]?.uniqueOwnerId || globalSelectedUsers[0]?.uniqueOwnerId
    const url = `/healthcalendar/view/${date.format('YYYY-MM-DD')}${selectedUserId ? `?user=${selectedUserId}` : ''}`
    
    console.log('[handleDateClick] Navigating to:', url)
    
    router.push(url as any)
    
    // 重置导航状态
    setTimeout(() => {
      setNavigationState({
        isNavigating: false,
        lastNavigationTime: now
      })
    }, 2000)
  }, [router, selectedUsers, globalSelectedUsers, navigationState])

  const handleUserSelectionChange = useCallback((users: UserProfile[]) => {
    console.log('[HealthCalendar] handleUserSelectionChange called with:', users)
    // 更新全局状态
    updateSelectedUsers(users)
    // 调用父组件的回调
    onUserSelectionChange(users)
  }, [updateSelectedUsers, onUserSelectionChange])

  // Log records when they change
  useEffect(() => {
    console.log('[HealthCalendar] Records updated:', {
      total: records.length,
      types: {
        poop: records.filter(r => r.type === 'poop').length,
        period: records.filter(r => r.type === 'period').length,
        meal: records.filter(r => r.type === 'meal').length,
        myrecord: records.filter(r => r.type === 'myrecord').length,
        item: records.filter(r => r.type === 'item').length,
        health: records.filter(r => r.type === 'health').length,
        mood: records.filter(r => r.type === 'mood').length,
        medication: records.filter(r => r.type === 'medication').length,
        meditation: records.filter(r => r.type === 'meditation').length,
        thought: records.filter(r => r.type === 'thought').length,
        checkup: records.filter(r => r.type === 'checkup').length,
        exercise: records.filter(r => r.type === 'exercise').length
      }
    });
  }, [records]);

  return (
    <div className="p-6">
      {/* Calendar Header */}
      <CalendarHeader
        currentDate={currentMonth.toDate()}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        onToday={() => setCurrentMonth(dayjs())}
        onRefresh={onCloudSync}
        isRefreshing={isSyncing}
      />

      {/* Record Type Legend */}
      {/* <div className="mt-4">
        <RecordTypeLegend />
      </div> */}

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mt-4">
        {/* Week day headers */}
        {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
          <div key={day} className="h-10 flex items-center justify-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day) => {
          const dayRecords = getRecordsForDate(day)
          const isCurrentMonth = day.month() === currentMonth.month()
          const isToday = day.isSame(dayjs(), 'day')
          
          return (
            <CalendarDay
              key={day.format('YYYY-MM-DD')}
              date={day.toDate()}
              records={dayRecords}
              isCurrentMonth={isCurrentMonth}
              isToday={isToday}
              onClick={() => handleDateClick(day)}
            />
          )
        })}
      </div>
    </div>
  )
}