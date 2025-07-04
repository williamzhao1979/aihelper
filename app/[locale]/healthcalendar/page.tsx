"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
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
import { StorageProviderSelector } from "@/components/storage-provider-selector"
import { GoogleDriveSyncStatus } from "@/components/google-drive-sync-status"
import { useGoogleDriveAuth } from "@/hooks/use-google-drive-auth"
import { usePoopRecords } from "@/hooks/use-poop-records"
import type { HealthRecord } from "@/lib/health-database"

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
  const [isSyncing, setIsSyncing] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  
  const { users: availableUsers, isLoading: usersLoading, getPrimaryUser } = useUserManagement()
  const { getAllRecords, isInitialized, getMigrationStatus, migrateToMultiUser } = useHealthDatabase()
  const { isAuthenticated: isGoogleDriveConnected } = useGoogleDriveAuth()

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

  // 获取当前用户（主用户或唯一选中用户），并 memoize
  const currentUser = useMemo(() => {
    if (selectedUsers.length === 1) return selectedUsers[0]
    return getPrimaryUser()
  }, [selectedUsers, getPrimaryUser])

  // Call usePoopRecords at the top level, always
  const poopRecordsApi = usePoopRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const { records: poopRecords } = poopRecordsApi

  // Map PoopRecord[] to HealthRecord[] for calendar/stats
  const mappedPoopRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedPoopRecords] mapping records, refreshVersion:', refreshVersion, 'poopRecords:', poopRecords)
    return poopRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      type: "poop",
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
      })) || [],
      poopType: r.poopType,
      poopColor: r.poopColor,
      poopSmell: r.poopSmell,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
  }, [poopRecords, currentUser, refreshVersion])

  // Sync from cloud on mount and when currentUser changes
  useEffect(() => {
    if (!currentUser?.uniqueOwnerId) return
    console.log('[useEffect] Cloud sync triggered. currentUser:', currentUser)
    console.log('[useEffect] poopRecordsApi at effect start:', poopRecordsApi)
    console.log('[useEffect] records before sync:', poopRecordsApi.records)
    const doSync = async () => {
      try {
        console.log('[useEffect] Starting cloud sync for user:', currentUser?.uniqueOwnerId)
        await poopRecordsApi.syncFromCloud()
        console.log('[useEffect] Cloud sync complete. records after sync:', poopRecordsApi.records)
      } catch (err) {
        console.error('[useEffect] Cloud sync failed:', err)
      }
    }
    doSync()
  }, [currentUser?.uniqueOwnerId])

  // 计算统计数据（使用mappedPoopRecords）
  const calculateStats = useCallback(() => {
    if (!isInitialized || selectedUsers.length === 0) {
      setStats({
        monthlyRecords: 0,
        healthDays: 0,
        periodCycle: "28天"
      })
      return
    }
    const allRecords = mappedPoopRecords
    const selectedUserIds = selectedUsers.map(user => user.uniqueOwnerId)
    const filteredRecords = allRecords.filter(record => 
      selectedUserIds.includes(record.ownerId || record.uniqueOwnerId || '')
    )
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const monthlyRecords = filteredRecords.filter(record => {
      const recordDate = new Date(record.date)
      return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear
    }).length
    const uniqueDates = new Set(filteredRecords.map(record => record.date))
    const healthDays = uniqueDates.size
    setStats({
      monthlyRecords,
      healthDays,
      periodCycle: "28天"
    })
  }, [isInitialized, selectedUsers, mappedPoopRecords])

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

  const handleTestInlineSelector = () => {
    router.push("/healthcalendar/test-inline-selector")
  }

  const handleGoogleDriveTest = () => {
    router.push("/healthcalendar/google-drive-test" as any)
  }

  const handleGoogleDriveAuthTest = () => {
    router.push("/healthcalendar/google-drive-auth-test" as any)
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

  // 手动触发云同步，带详细调试日志
  const handleCloudSync = useCallback(async () => {
    if (!currentUser?.uniqueOwnerId) return
    setIsSyncing(true)
    try {
      console.log('[handleCloudSync] Manual cloud sync triggered. currentUser:', currentUser)
      console.log('[handleCloudSync] poopRecordsApi at start:', poopRecordsApi)
      console.log('[handleCloudSync] records before sync:', poopRecordsApi.records)
      await poopRecordsApi.syncFromCloud()
      console.log('[handleCloudSync] Cloud sync complete. records after sync:', poopRecordsApi.records)
      setRefreshVersion(v => v + 1)
    } catch (err) {
      console.error('[handleCloudSync] Cloud sync failed:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [currentUser, poopRecordsApi])

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
              <p className="text-sm text-gray-600">记录健康，管理生活</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleUserManagement}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <Users className="h-4 w-4" />
              <span>用户管理</span>
            </Button>
            <Button
              onClick={handleAddRecord}
              className="flex items-center space-x-1 bg-red-600 hover:bg-red-700"
            >
              <Plus className="h-4 w-4" />
              <span>添加记录</span>
            </Button>
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
            <UserSelector
              selectedUsers={selectedUsers}
              onUserSelectionChange={handleUserSelectionChange}
              availableUsers={availableUsers}
              className="w-32"
            />
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowAllUsers}
                className="text-xs"
              >
                显示所有
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloudSync}
                className="text-xs ml-2"
                disabled={isSyncing}
              >
                {isSyncing ? '同步中...' : '刷新'}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <HealthCalendar 
            selectedUsers={selectedUsers} 
            onUserSelectionChange={handleUserSelectionChange}
            availableUsers={availableUsers}
            userSelectionVersion={userSelectionVersion}
            records={mappedPoopRecords}
            onCloudSync={handleCloudSync}
            isSyncing={isSyncing}
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

      {/* Cloud Storage Integration */}
      <div className="mt-6 space-y-4">
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardContent className="p-6">
            <StorageProviderSelector />
          </CardContent>
        </Card>
        
        {/* Google Drive Sync Status */}
        <GoogleDriveSyncStatus isConnected={isGoogleDriveConnected} />
      </div>

      {/* Debug Button - 页面最下方 */}
      <div className="mt-6 flex flex-col items-center space-y-2">
        <div className="flex justify-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDebug}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            调试
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTestInlineSelector}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            测试选择器
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoogleDriveTest}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Google Drive测试
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGoogleDriveAuthTest}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            认证测试
          </Button>
        </div>
      </div>

      {/* Record Type Selector */}
      <RecordTypeSelector 
        isOpen={isRecordSelectorOpen}
        onClose={() => setIsRecordSelectorOpen(false)}
      />
    </div>
  )
}