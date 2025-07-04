"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import CalendarDay from "./calendar-day"
import CalendarHeader from "./calendar-header"
import healthDB, { HealthRecord } from "@/lib/health-database"
import { useHealthDatabase } from "@/hooks/use-health-database"
import { getLocalDateString } from "@/lib/utils"
import type { UserProfile } from "@/components/healthcalendar/shared/user-selector"

interface HealthCalendarProps {
  selectedUsers?: UserProfile[]
  onUserSelectionChange?: (users: UserProfile[]) => void
  availableUsers?: UserProfile[]
  userSelectionVersion?: number
  records?: HealthRecord[] // <-- add this line
  onCloudSync?: () => void // Supabase云同步
  isSyncing?: boolean // 云同步loading
}

export default function HealthCalendar({ 
  selectedUsers = [], 
  onUserSelectionChange,
  availableUsers = [],
  userSelectionVersion,
  records: externalRecords, // <-- accept records prop
  onCloudSync,
  isSyncing = false
}: HealthCalendarProps) {
  const router = useRouter()
  // const { getAllRecords, isInitialized, isLoading } = useHealthDatabase() // REMOVE IndexedDB hooks
  const [currentDate, setCurrentDate] = useState(new Date())
  const [records, setRecords] = useState<HealthRecord[]>(externalRecords || [])
  // const [isRefreshing, setIsRefreshing] = useState(false) // REMOVE local refresh
  // const [refreshTrigger, setRefreshTrigger] = useState(0) // REMOVE local refresh

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

  // 根据选中的用户过滤记录
  const getFilteredRecords = (allRecords: HealthRecord[]) => {
    // 临时调试模式：显示所有记录
    const debugMode = localStorage.getItem('healthCalendarDebugMode') === 'true'
    if (debugMode) {
      console.log("调试模式：显示所有记录，不进行用户过滤")
      return allRecords
    }
    
    // 临时解决方案：如果选中了所有用户，显示所有记录
    if (selectedUsers.length > 0 && selectedUsers.length === availableUsers.length) {
      console.log("选中了所有用户，显示所有记录")
      return allRecords
    }
    
    if (selectedUsers.length === 0) {
      // 如果没有选中用户，显示所有记录
      console.log("没有选中用户，显示所有记录")
      return allRecords
    }
    
    const selectedUserIds = selectedUsers.map(user => user.uniqueOwnerId)
    console.log("选中的用户ID:", selectedUserIds)
    console.log("选中的用户详情:", selectedUsers)
    
    const filteredRecords = allRecords.filter(record => {
      // 修复用户匹配逻辑：优先使用uniqueOwnerId，然后使用ownerId
      const recordUniqueOwnerId = record.uniqueOwnerId || ''
      const recordOwnerId = record.ownerId || ''
      
      // 检查记录是否属于选中的用户
      const isIncluded = selectedUserIds.some(selectedUserId => {
        const match1 = recordUniqueOwnerId === selectedUserId
        const match2 = recordOwnerId === selectedUserId
        const match3 = recordUniqueOwnerId === '' && recordOwnerId.replace('device_', 'user_') === selectedUserId
        
        // 调试6月29日的记录
        const currentYear = new Date().getFullYear()
        const june29Date = `${currentYear}-06-29`
        if (record.date === june29Date) {
          console.log(`6月29日记录 ${record.id} 匹配检查:`, {
            selectedUserId,
            recordUniqueOwnerId,
            recordOwnerId,
            match1,
            match2,
            match3
          })
        }
        
        return match1 || match2 || match3
      })
      
      // 调试6月29日的记录 - 修复年份问题
      const currentYear = new Date().getFullYear()
      const june29Date = `${currentYear}-06-29`
      if (record.date === june29Date) {
        console.log(`6月29日记录 ${record.id}:`, {
          recordUniqueOwnerId,
          recordOwnerId,
          selectedUserIds,
          isIncluded,
          record
        })
      }
      
      return isIncluded
    })
    
    console.log(`过滤结果: 总记录 ${allRecords.length} -> 过滤后 ${filteredRecords.length}`)
    
    // 检查被过滤掉的记录
    const filteredOutRecords = allRecords.filter(record => {
      const recordOwnerId = record.ownerId || record.uniqueOwnerId || ''
      return !selectedUserIds.includes(recordOwnerId)
    })
    
    if (filteredOutRecords.length > 0) {
      console.log("被过滤掉的记录:", filteredOutRecords)
    }
    
    return filteredRecords
  }

  // 获取指定日期的健康记录
  const getRecordsForDate = (date: Date) => {
    const dateString = getLocalDateString(date)
    const dayRecords = records.filter(record => record.date === dateString)
    
    // 添加调试日志
    if (dayRecords.length > 0) {
      console.log(`日期 ${dateString} 找到 ${dayRecords.length} 条记录:`, dayRecords)
    }
    
    // 检查日期格式问题 - 修复年份问题
    if (date.getDate() === 29 && date.getMonth() === 5) { // 6月29日
      const currentYear = new Date().getFullYear()
      const expectedDate = `${currentYear}-06-29`
      console.log(`检查6月29日记录:`)
      console.log(`期望日期格式: ${expectedDate}`)
      console.log(`所有记录中的日期:`, records.map(r => r.date).filter(d => d.includes('06-29')))
      console.log(`匹配的记录:`, records.filter(r => r.date === dateString))
    }
    
    return dayRecords
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
  // const refreshData = useCallback(async () => {
  //   if (!isInitialized) return
  //   
  //   setIsRefreshing(true)
  //   try {
  //     console.log("正在刷新日历数据...")
  //     const allRecords = await getAllRecords()
  //     console.log("加载到的所有记录:", allRecords)
  //     console.log("选中的用户:", selectedUsers)
  //     
  //     // 根据选中的用户过滤记录
  //     const filteredRecords = getFilteredRecords(allRecords)
  //     console.log("过滤后的记录:", filteredRecords)
  //     
  //     // 检查6月29日的记录
  //     const currentYear = new Date().getFullYear()
  //     const june29Date = `${currentYear}-06-29`
  //     const june29Records = allRecords.filter(record => record.date === june29Date)
  //     console.log("6月29日的所有记录:", june29Records)
  //     
  //     const june29FilteredRecords = filteredRecords.filter(record => record.date === june29Date)
  //     console.log("6月29日过滤后的记录:", june29FilteredRecords)
  //     
  //     // 检查今天的记录
  //     const today = getLocalDateString(new Date())
  //     const todayRecords = allRecords.filter(record => record.date === today)
  //     console.log(`今天的记录 (${today}):`, todayRecords)
  //     
  //     const todayFilteredRecords = filteredRecords.filter(record => record.date === today)
  //     console.log(`今天过滤后的记录 (${today}):`, todayFilteredRecords)
  //     
  //     setRecords(filteredRecords)
  //   } catch (error) {
  //     console.error("Failed to refresh records:", error)
  //   } finally {
  //     setIsRefreshing(false)
  //   }
  // }, [getAllRecords, isInitialized, selectedUsers])

  // 从IndexedDB加载数据
  // useEffect(() => {
  //   if (isInitialized && !isLoading) {
  //     refreshData()
  //   }
  // }, [isInitialized, isLoading, refreshTrigger, selectedUsers, userSelectionVersion])

  // Use external records only
  useEffect(() => {
    if (externalRecords) {
      setRecords(externalRecords)
    }
  }, [externalRecords])

  // 添加页面可见性监听，当用户从其他页面返回时刷新数据
  // useEffect(() => {
  //   if (!isInitialized) return

  //   const handleVisibilityChange = () => {
  //     if (document.visibilityState === 'visible') {
  //       console.log("页面变为可见，触发刷新")
  //       setRefreshTrigger(prev => prev + 1)
  //     }
  //   }

  //   document.addEventListener('visibilitychange', handleVisibilityChange)
  //   return () => {
  //     document.removeEventListener('visibilitychange', handleVisibilityChange)
  //   }
  // }, [isInitialized])

  return (
    <div className="w-full">
      {/* 日历头部 */}
      <CalendarHeader
        currentDate={currentDate}
        onPreviousMonth={goToPreviousMonth}
        onNextMonth={goToNextMonth}
        onToday={goToToday}
        onRefresh={onCloudSync}
        isRefreshing={isSyncing}
        selectedUsers={selectedUsers}
        onUserSelectionChange={onUserSelectionChange}
        availableUsers={availableUsers}
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
          {selectedUsers.length > 1 && (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>多用户数据</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}