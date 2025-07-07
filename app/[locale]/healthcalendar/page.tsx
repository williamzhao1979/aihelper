"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Calendar, Heart, Activity, Plus, Users, Droplets, Stethoscope, Pill, Camera, FileText, RefreshCw } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useToast } from "@/hooks/use-toast"
import { usePathname } from "next/navigation"
import { usePoopRecords } from "@/hooks/use-poop-records"
import { usePeriodRecords } from "@/hooks/use-period-records"
import { useUserManagement } from "@/hooks/use-user-management"
import { useGlobalUserSelection, initializeGlobalUserSelection } from "@/hooks/use-global-user-selection"
import { useHealthDatabase } from "@/hooks/use-health-database"
import { HealthRecord } from "@/lib/health-database"
import HealthCalendar from "@/components/healthcalendar/calendar/health-calendar"
import { SingleUserSelector } from "@/components/healthcalendar/shared/single-user-selector"
import RecordTypeSelector from "@/components/healthcalendar/shared/record-type-selector"
import type { UserProfile } from "@/components/healthcalendar/shared/user-selector"
import { generatePoopSummary } from "@/lib/poop-options"
import dayjs from 'dayjs'

export default function HealthCalendarPage() {
  const router = useRouter()
  const { toast } = useToast()
  const pathname = usePathname()
  const [isRecordSelectorOpen, setIsRecordSelectorOpen] = useState(false)
  const [userSelectionVersion, setUserSelectionVersion] = useState(0)
  const [stats, setStats] = useState({
    monthlyRecords: 0,
    healthDays: 0,
    periodCycle: "28天"
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)

  // useEffect(() => {
  //   // 页面加载时执行一次
  //   forceRefreshUsers();
  // }, []);
  
  const { users: availableUsers, isLoading: usersLoading, getPrimaryUser, forceRefresh: forceRefreshUsers } = useUserManagement()
  const { getAllRecords, isInitialized, getMigrationStatus, migrateToMultiUser } = useHealthDatabase()

  // 使用全局用户选择状态
  const { selectedUsers, updateSelectedUsers } = useGlobalUserSelection()

  // 退出登录功能
  const handleLogout = async () => {
    try {
      // 调用logout API清除cookie
      const response = await fetch('/api/auth/env-logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        toast({
          title: "退出成功",
          description: "您已成功退出登录",
        })
        
        // 获取当前locale
        const locale = pathname.split('/')[1] || 'zh'
        const currentPath = pathname
        
        // 跳转到登录页面，设置callbackUrl为当前页面
        const loginUrl = `/${locale}/auth/login?callbackUrl=${encodeURIComponent(currentPath)}`
        console.log('[Logout] 跳转到登录页:', loginUrl)
        window.location.href = loginUrl
      } else {
        throw new Error('Logout failed')
      }
    } catch (error) {
      console.error('[Logout] 退出失败:', error)
      toast({
        title: "退出失败",
        description: "退出登录时发生错误，请重试",
        variant: "destructive",
      })
    }
  }

  // 初始化全局用户选择状态
  useEffect(() => {
    if (availableUsers.length > 0 && selectedUsers.length === 0) {
      const primaryUser = getPrimaryUser()
      if (primaryUser) {
        console.log('[HealthCalendarPage] Initializing global user selection with primary user:', primaryUser)
        initializeGlobalUserSelection(primaryUser)
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

  // Call usePoopRecords and usePeriodRecords at the top level, always
  const poopRecordsApi = usePoopRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const periodRecordsApi = usePeriodRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const { records: poopRecords } = poopRecordsApi
  const { records: periodRecords } = periodRecordsApi

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
      datetime: r.datetime, // 映射datetime字段
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

  // Map PeriodRecord[] to HealthRecord[] for calendar/stats
  const mappedPeriodRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedPeriodRecords] mapping records, refreshVersion:', refreshVersion, 'periodRecords:', periodRecords)
    return periodRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "period",
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
      })) || [],
      flow: r.flow,
      pain: r.pain,
      mood: r.mood,
      symptoms: r.symptoms,
      notes: r.notes,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
  }, [periodRecords, currentUser, refreshVersion])

  // Sync from cloud on mount and when currentUser changes - 强制获取最新数据
  useEffect(() => {
    if (!currentUser?.uniqueOwnerId) return
    console.log('[useEffect] 强制云端同步触发. currentUser:', currentUser)
    console.log('[useEffect] 同步前记录数量:', poopRecordsApi.records.length, 'periodRecords:', periodRecordsApi.records.length)
    
    const doSync = async () => {
      try {
        console.log('[useEffect] 开始强制云端同步，用户:', currentUser?.uniqueOwnerId)
        await Promise.all([
          poopRecordsApi.syncFromCloud(),
          periodRecordsApi.syncFromCloud()
        ])
        console.log('[useEffect] 强制云端同步完成，同步后记录数量:', poopRecordsApi.records.length, 'periodRecords:', periodRecordsApi.records.length)
      } catch (err) {
        console.error('[useEffect] 强制云端同步失败:', err)
      }
    }
    doSync()
  }, [currentUser?.uniqueOwnerId])

  // 计算统计数据（使用mappedPoopRecords和mappedPeriodRecords）
  const calculateStats = useCallback(() => {
    if (!isInitialized || selectedUsers.length === 0) {
      setStats({
        monthlyRecords: 0,
        healthDays: 0,
        periodCycle: "28天"
      })
      return
    }
    const allRecords = [...mappedPoopRecords, ...mappedPeriodRecords]
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
  }, [isInitialized, selectedUsers, mappedPoopRecords, mappedPeriodRecords])

  // 当用户选择或数据变化时重新计算统计
  useEffect(() => {
    calculateStats()
  }, [calculateStats])

  const todayDate = dayjs().format('YYYY-MM-DD')

  const handleAddPeriod = () => {
    router.push("/healthcalendar/period")
  }

  const handleAddPoop = () => {
    router.push("/healthcalendar/record") // Go to record type selection/creation page
  }

const handleRecordSelector = () => {
    router.push("/healthcalendar/record") // Go to record type selection/creation page
  }

const handleAddRecord = () => {
    setIsRecordSelectorOpen(true)
  }

  const handleDebug = () => {
    router.push("/healthcalendar/debug")
  }

  const handleTestInlineSelector = () => {
    router.push("/healthcalendar/test-inline-selector")
  }

  const handleUserManagement = () => {
    router.push("/healthcalendar/users")
  }

  const handleUserSelectionChange = (users: UserProfile[]) => {
    console.log('[HealthCalendarPage] handleUserSelectionChange called with:', users)
    updateSelectedUsers(users)
    setUserSelectionVersion(prev => prev + 1)
    console.log('Selected users:', users)
    console.log('Selected user IDs:', users.map(u => u.uniqueOwnerId))
    // 这里可以根据选中的用户加载相应的数据
  }

  const handleShowAllUsers = () => {
    // 临时显示所有用户的记录
    updateSelectedUsers(availableUsers)
    setUserSelectionVersion(prev => prev + 1)
    console.log('显示所有用户记录')
    toast({
      title: "显示所有记录",
      description: "已切换到显示所有用户的记录",
    })
  }

  // 手动触发云同步，带详细调试日志 - 强制获取最新数据
  const handleCloudSync = useCallback(async () => {
    if (!currentUser?.uniqueOwnerId) return
    setIsSyncing(true)
    try {
      console.log('[handleCloudSync] 手动强制云端同步触发. currentUser:', currentUser)
      console.log('[handleCloudSync] 同步前记录数量:', poopRecordsApi.records.length, 'periodRecords:', periodRecordsApi.records.length)
      
      // 同时刷新用户数据和健康记录数据
      const [userRefreshResult, poopRecordsRefreshResult, periodRecordsRefreshResult] = await Promise.allSettled([
        forceRefreshUsers(),
        poopRecordsApi.syncFromCloud(),
        periodRecordsApi.syncFromCloud()
      ])
      
      // 检查用户数据刷新结果
      if (userRefreshResult.status === 'fulfilled') {
        console.log('[handleCloudSync] 用户数据刷新成功')
      } else {
        console.error('[handleCloudSync] 用户数据刷新失败:', userRefreshResult.reason)
      }
      
      // 检查大便记录数据刷新结果
      if (poopRecordsRefreshResult.status === 'fulfilled') {
        console.log('[handleCloudSync] 大便记录数据刷新成功，同步后记录数量:', poopRecordsApi.records.length)
      } else {
        console.error('[handleCloudSync] 大便记录数据刷新失败:', poopRecordsRefreshResult.reason)
      }
      
      // 检查生理记录数据刷新结果
      if (periodRecordsRefreshResult.status === 'fulfilled') {
        console.log('[handleCloudSync] 生理记录数据刷新成功，同步后记录数量:', periodRecordsApi.records.length)
      } else {
        console.error('[handleCloudSync] 生理记录数据刷新失败:', periodRecordsRefreshResult.reason)
      }
      
      setRefreshVersion(v => v + 1)
    } catch (err) {
      console.error('[handleCloudSync] 手动强制云端同步失败:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [currentUser, poopRecordsApi, periodRecordsApi, forceRefreshUsers])

  // 获取当前显示的用户信息
  const getDisplayUsersText = () => {
    if (selectedUsers.length === 0) return "选择用户"
    if (selectedUsers.length === 1) return selectedUsers[0].nickname
    if (selectedUsers.length === availableUsers.length) return "所有用户"
    return `${selectedUsers.length}个用户`
  }

  // 获取最近记录（按发生时间排序，取最新的5条）
  const recentRecords = useMemo(() => {
    const allRecords = [...mappedPoopRecords, ...mappedPeriodRecords]
    const selectedUserIds = selectedUsers.map(user => user.uniqueOwnerId)
    const filteredRecords = allRecords.filter(record => 
      selectedUserIds.includes(record.ownerId || record.uniqueOwnerId || '')
    )
    
    // 按发生时间排序，取最新的5条
    const sortedRecords = filteredRecords
      .sort((a, b) => {
        const aTime = new Date(a.datetime || a.date).getTime()
        const bTime = new Date(b.datetime || b.date).getTime()
        return bTime - aTime
      })
      .slice(0, 5)
    
    console.log('[recentRecords] 最近记录计算:', {
      totalRecords: allRecords.length,
      filteredRecords: filteredRecords.length,
      recentRecords: sortedRecords.length,
      selectedUsers: selectedUserIds
    })
    
    return sortedRecords
  }, [mappedPoopRecords, mappedPeriodRecords, selectedUsers])

  // 获取记录类型图标和颜色
  const getRecordTypeInfo = (record: HealthRecord) => {
    switch (record.type) {
      case "period":
        return {
          icon: <Droplets className="h-4 w-4" />,
          color: "bg-red-50",
          dotColor: "bg-red-500",
          title: "生理记录"
        }
      case "poop":
        return {
          icon: <Activity className="h-4 w-4" />,
          color: "bg-yellow-50",
          dotColor: "bg-yellow-500",
          title: "排便记录"
        }
      case "health":
        return {
          icon: <Heart className="h-4 w-4" />,
          color: "bg-blue-50",
          dotColor: "bg-blue-500",
          title: "健康记录"
        }
      default:
        return {
          icon: <FileText className="h-4 w-4" />,
          color: "bg-gray-50",
          dotColor: "bg-gray-500",
          title: "其他记录"
        }
    }
  }

  // 获取记录摘要
  const getRecordSummary = (record: HealthRecord) => {
    if (record.type === "period") {
      const flowText = record.flow ? `流量${record.flow === 'light' ? '轻' : record.flow === 'medium' ? '中等' : '重'}` : ''
      const painText = record.pain ? `疼痛${record.pain === 'none' ? '无' : record.pain === 'mild' ? '轻微' : record.pain === 'moderate' ? '中等' : '严重'}` : ''
      return [flowText, painText].filter(Boolean).join(' · ') || '生理记录'
    }
    if (record.type === "poop") {
      return generatePoopSummary(record.poopType, record.poopColor, record.poopSmell)
    }
    return record.content?.slice(0, 20) + (record.content && record.content.length > 20 ? '...' : '') || '健康记录'
  }

  // 格式化时间显示
  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))

    if (diffInDays > 0) {
      return `${diffInDays}天前`
    } else if (diffInHours > 0) {
      return `${diffInHours}小时前`
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes}分钟前`
    } else {
      return '刚刚'
    }
  }

  // 处理查看记录
  const handleViewRecord = (record: HealthRecord) => {
    if (record.type === "period") {
      router.push("/healthcalendar/period?date=${record.date}&edit=${record.id}` as any" as any)
      // 使用 localStorage 传递编辑信息
      localStorage.setItem('editRecordId', record.id)
    } else if (record.type === "poop") {
      // 排便记录跳转到排便记录页面
      // router.push("/healthcalendar/poop" as any)
      router.push(`/healthcalendar/poop?date=${record.date}&edit=${record.id}` as any)
      // 使用 localStorage 传递编辑信息
      localStorage.setItem('editRecordId', record.id)
    } else {
      // 对于其他类型的记录，跳转到记录详情页面
      router.push(`/healthcalendar/view/${record.date}` as any)
    }
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
              onClick={() => setIsRecordSelectorOpen(true)}
              className="flex items-center space-x-1 bg-red-600 hover:bg-red-700"
            >
              <Plus className="h-4 w-4" />
              <span>添加记录</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600" />
                <span className="text-xs text-gray-600">本月记录&nbsp;&nbsp;
                <span className="text-lg font-semibold text-gray-900">{stats.monthlyRecords}
                </span>
                </span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-xs text-gray-600">健康天数&nbsp;&nbsp;
                <span className="text-lg font-semibold text-gray-900">{stats.healthDays}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-xs text-gray-600">生理周期</p>
                <p className="text-lg font-semibold text-gray-900">{stats.periodCycle}</p>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* Calendar */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center justify-between">
            {/* 左侧内容：图标 + 标题 */}
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 text-blue-600" />
              <span>健康日历</span>
            </div>

            {/* 右侧内容：SingleUserSelector */}
            <div className="flex items-center space-x-2">
              <SingleUserSelector
                users={availableUsers}
                selectedUser={selectedUsers[0] || availableUsers[0]}
                onChange={user => handleUserSelectionChange([user])}
              />
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <HealthCalendar 
            selectedUsers={selectedUsers} 
            onUserSelectionChange={handleUserSelectionChange}
            availableUsers={availableUsers}
            userSelectionVersion={userSelectionVersion}
            records={[...mappedPoopRecords, ...mappedPeriodRecords]}
            onCloudSync={handleCloudSync}
            isSyncing={isSyncing}
          />
        </CardContent>
      </Card>

      {/* Recent Records */}
      <div className="mt-6">
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">最近记录</CardTitle>
              <div className="flex items-center space-x-2">
                {recentRecords.length > 0 && (
                  <span className="text-sm text-gray-500">
                    共 {recentRecords.length} 条记录
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloudSync}
                  disabled={isSyncing}
                  className="p-1 h-8 w-8"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recentRecords.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">暂无记录</p>
                <p className="text-sm text-gray-500">开始记录您的健康数据吧</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentRecords.map((record) => {
                  const typeInfo = getRecordTypeInfo(record)
                  const summary = getRecordSummary(record)
                  const timeAgo = formatTimeAgo(new Date(record.datetime || record.date))
                  
                  return (
                    <div 
                      key={record.id}
                      className={`flex items-center justify-between p-3 ${typeInfo.color} rounded-lg cursor-pointer hover:opacity-80 transition-opacity`}
                      onClick={() => handleViewRecord(record)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 ${typeInfo.dotColor} rounded-full`}></div>
                        <div className="flex items-center space-x-2">
                          {typeInfo.icon}
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">{typeInfo.title}</p>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {record.ownerName || '未知用户'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">{timeAgo} · {summary}</p>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        查看
                      </Button>
                    </div>
                  )
                })}
                
                {/* 查看更多按钮 */}
                {recentRecords.length >= 5 && (
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => router.push("/healthcalendar/view" as any)}
                    >
                      查看更多记录
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 退出按钮 */}
        <div className="mt-4">
          <Button
            onClick={handleLogout}
            variant="destructive"
            size="sm"
            className="w-full flex items-center justify-center space-x-2"
          >
            <span>退出</span>
          </Button>
        </div>

        {/* Management Accordion Card */}
        <div className="mt-4">
          <Accordion type="single" collapsible defaultValue="">
            <AccordionItem value="management">
              <AccordionTrigger>管理</AccordionTrigger>
              <AccordionContent>
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
                    onClick={() => router.push("/healthcalendar/test-global-user" as any)}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <span>测试全局用户选择</span>
                  </Button>
                  <Button
                    onClick={() => router.push("/healthcalendar/test-recent-records" as any)}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-1"
                  >
                    <span>测试最近记录</span>
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        
      </div>

      {/* Record Type Selector */}
      {isRecordSelectorOpen && (
        <RecordTypeSelector
          isOpen={isRecordSelectorOpen}
          onClose={() => {
            console.log("HealthCalendarPage - onClose called, setting isRecordSelectorOpen to false")
            setIsRecordSelectorOpen(false)
          }}
          date={todayDate}
        />
      )}
    </div>
  )
}