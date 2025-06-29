"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Calendar, Heart, Activity, Users, Settings } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import HealthCalendar from "@/components/healthcalendar/calendar/health-calendar"
import RecordTypeSelector from "@/components/healthcalendar/shared/record-type-selector"
import { useUserManagement } from "@/hooks/use-user-management"
import UserSelector, { type UserProfile } from "@/components/healthcalendar/shared/user-selector"
import { useHealthDatabase } from "@/hooks/use-health-database"
import { useToast } from "@/hooks/use-toast"

export default function HealthCalendarPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([])
  const [isRecordSelectorOpen, setIsRecordSelectorOpen] = useState(false)
  const [userSelectionVersion, setUserSelectionVersion] = useState(0)
  const [stats, setStats] = useState({
    monthlyRecords: 0,
    healthDays: 0,
    periodCycle: "28天"
  })
  
  const { users: availableUsers, isLoading: usersLoading, getPrimaryUser } = useUserManagement()
  const { getAllRecords, isInitialized, getMigrationStatus, migrateToMultiUser } = useHealthDatabase()

  // 默认选中主用户
  useEffect(() => {
    if (availableUsers.length > 0 && selectedUsers.length === 0) {
      const primaryUser = getPrimaryUser()
      if (primaryUser) {
        setSelectedUsers([primaryUser])
      }
    }
  }, [availableUsers, selectedUsers.length, getPrimaryUser])

  // 自动检查并迁移数据
  useEffect(() => {
    const checkAndMigrateData = async () => {
      if (!isInitialized) return
      
      try {
        const status = await getMigrationStatus()
        console.log("数据迁移状态:", status)
        
        if (status.needsMigration > 0) {
          console.log(`发现 ${status.needsMigration} 条记录需要迁移到多用户版本`)
          
          // 自动迁移数据
          const result = await migrateToMultiUser()
          console.log(`数据迁移完成: 成功 ${result.migrated} 条，失败 ${result.errors} 条`)
          
          if (result.migrated > 0) {
            toast({
              title: "数据迁移完成",
              description: `已将 ${result.migrated} 条记录迁移到多用户版本`,
            })
          }
        }
      } catch (error) {
        console.error("数据迁移检查失败:", error)
      }
    }

    checkAndMigrateData()
  }, [isInitialized, getMigrationStatus, migrateToMultiUser])

  // 计算统计数据
  const calculateStats = useCallback(async () => {
    if (!isInitialized || selectedUsers.length === 0) {
      setStats({
        monthlyRecords: 0,
        healthDays: 0,
        periodCycle: "28天"
      })
      return
    }

    try {
      const allRecords = await getAllRecords()
      
      // 根据选中的用户过滤记录
      const selectedUserIds = selectedUsers.map(user => user.uniqueOwnerId)
      const filteredRecords = allRecords.filter(record => 
        selectedUserIds.includes(record.ownerId || record.uniqueOwnerId || '')
      )

      // 计算本月记录数
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      const monthlyRecords = filteredRecords.filter(record => {
        const recordDate = new Date(record.date)
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear
      }).length

      // 计算健康天数（有记录的天数）
      const uniqueDates = new Set(filteredRecords.map(record => record.date))
      const healthDays = uniqueDates.size

      setStats({
        monthlyRecords,
        healthDays,
        periodCycle: "28天"
      })
    } catch (error) {
      console.error("计算统计数据失败:", error)
      setStats({
        monthlyRecords: 0,
        healthDays: 0,
        periodCycle: "28天"
      })
    }
  }, [isInitialized, selectedUsers, getAllRecords])

  // 当用户选择或数据变化时重新计算统计
  useEffect(() => {
    calculateStats()
  }, [calculateStats])

  const handleAddRecord = () => {
    setIsRecordSelectorOpen(true)
  }

  const handleAddPeriod = () => {
    router.push("/healthcalendar/period")
  }

  const handleAddPoop = () => {
    router.push("/healthcalendar/poop")
  }

  const handleDebug = () => {
    router.push("/healthcalendar/debug")
  }

  const handleUserManagement = () => {
    router.push("/healthcalendar/users")
  }

  const handleUserSelectionChange = (users: UserProfile[]) => {
    setSelectedUsers(users)
    setUserSelectionVersion(prev => prev + 1)
    console.log('Selected users:', users)
    console.log('Selected user IDs:', users.map(u => u.uniqueOwnerId))
    // 这里可以根据选中的用户加载相应的数据
  }

  const handleShowAllUsers = () => {
    // 临时显示所有用户的记录
    setSelectedUsers(availableUsers)
    setUserSelectionVersion(prev => prev + 1)
    console.log('显示所有用户记录')
    toast({
      title: "显示所有记录",
      description: "已切换到显示所有用户的记录",
    })
  }

  // 获取当前显示的用户信息
  const getDisplayUsersText = () => {
    if (selectedUsers.length === 0) return "选择用户"
    if (selectedUsers.length === 1) return selectedUsers[0].nickname
    if (selectedUsers.length === availableUsers.length) return "所有用户"
    return `${selectedUsers.length}个用户`
  }

  if (usersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载用户数据中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Heart className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">健康日历</h1>
              <p className="text-sm text-gray-600">记录健康，关爱生活</p>
            </div>
          </div>
          <div className="flex flex-col space-y-2">
            <Button
              onClick={handleAddRecord}
              className="flex items-center space-x-1 bg-red-600 hover:bg-red-700"
            >
              <Plus className="h-4 w-4" />
              <span>记录</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUserManagement}
              className="p-2"
              title="用户管理"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddPoop}
                className="flex items-center space-x-2 px-2 py-1"
              >
                <img
                  src="/poop-detective.png"
                  alt="屁屁侦探"
                  className="w-8 h-8 object-contain"
                  style={{ minWidth: 32, minHeight: 32 }}
                />
                <span className="flex flex-col leading-tight text-xs text-gray-800 text-left">
                  <span>今 天</span>
                  <span>大 了 没？</span>
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddPeriod}
                className="flex items-center space-x-1"
              >
                <Activity className="h-4 w-4" />
                <span>例假</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">本月记录</p>
                <p className="text-lg font-semibold text-gray-900">{stats.monthlyRecords}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-xs text-gray-600">健康天数</p>
                <p className="text-lg font-semibold text-gray-900">{stats.healthDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-xs text-gray-600">例假周期</p>
                <p className="text-lg font-semibold text-gray-900">{stats.periodCycle}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span>健康日历</span>
              {selectedUsers.length > 1 && (
                <span className="text-sm text-gray-500">
                  ({selectedUsers.length}个用户)
                </span>
              )}
            </div>
            {/* <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const primaryUser = availableUsers.find(user => user.role === 'primary')
                if (primaryUser) {
                  handleUserSelectionChange([primaryUser])
                }
              }}
              className="text-xs"
            >
              本人
            </Button> */}
            <UserSelector
              selectedUsers={selectedUsers}
              onUserSelectionChange={handleUserSelectionChange}
              availableUsers={availableUsers}
              className="w-32"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleShowAllUsers}
              className="text-xs"
            >
              显示所有
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <HealthCalendar 
            selectedUsers={selectedUsers} 
            onUserSelectionChange={handleUserSelectionChange}
            availableUsers={availableUsers}
            userSelectionVersion={userSelectionVersion}
          />
        </CardContent>
      </Card>

      {/* Recent Records */}
      <div className="mt-6">
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">最近记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">例假记录</p>
                    <p className="text-xs text-gray-600">今天 · 流量中等</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  查看
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">身体不适</p>
                    <p className="text-xs text-gray-600">昨天 · 后腰疼痛</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  查看
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">体检报告</p>
                    <p className="text-xs text-gray-600">3天前 · 年度体检</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  查看
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Button - 页面最下方 */}
      <div className="mt-6 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDebug}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          调试
        </Button>
      </div>

      {/* Record Type Selector */}
      <RecordTypeSelector 
        isOpen={isRecordSelectorOpen}
        onClose={() => setIsRecordSelectorOpen(false)}
      />
    </div>
  )
} 