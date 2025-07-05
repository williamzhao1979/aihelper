"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Trash2, Plus, Calendar, Heart, Activity, Users, Clock, Tag } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { usePoopRecords } from "@/hooks/use-poop-records"
import { useUserManagement } from "@/hooks/use-user-management"
import { useGlobalUserSelection } from "@/hooks/use-global-user-selection"
import { HealthRecord } from "@/lib/health-database"
import { formatDisplayDateTime, formatDisplayDate } from "@/lib/utils"
import RecordTypeSelector from "@/components/healthcalendar/shared/record-type-selector"
import { SingleUserSelector } from "@/components/healthcalendar/shared/single-user-selector"
import type { UserProfile } from "@/components/healthcalendar/shared/user-selector"
import dayjs from 'dayjs'

export default function ViewPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isRecordSelectorOpen, setIsRecordSelectorOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  
  const { users: availableUsers, isLoading: usersLoading, getPrimaryUser } = useUserManagement()
  
  // 使用全局用户选择状态
  const { selectedUsers } = useGlobalUserSelection()

  // 获取当前用户（主用户或唯一选中用户），并 memoize
  const currentUser = useMemo(() => {
    if (selectedUsers.length === 1) return selectedUsers[0]
    return getPrimaryUser()
  }, [selectedUsers, getPrimaryUser])

  // Call usePoopRecords at the top level, always
  const poopRecordsApi = usePoopRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  console.log("[ViewPage] currentUser?.uniqueOwnerId:", currentUser?.uniqueOwnerId)
  console.log("[ViewPage] selectedUsers:", selectedUsers)
  // console.log("[ViewPage] globalSelectedUsers:", globalSelectedUsers)
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

  // Sync from cloud on mount and when currentUser changes - 强制获取最新数据
  useEffect(() => {
    if (!currentUser?.uniqueOwnerId) return
    console.log('[useEffect] 强制云端同步触发. currentUser:', currentUser)
    console.log('[useEffect] 同步前记录数量:', poopRecordsApi.records.length)
    
    const doSync = async () => {
      try {
        console.log('[useEffect] 开始强制云端同步，用户:', currentUser?.uniqueOwnerId)
        await poopRecordsApi.syncFromCloud()
        console.log('[useEffect] 强制云端同步完成，同步后记录数量:', poopRecordsApi.records.length)
      } catch (err) {
        console.error('[useEffect] 强制云端同步失败:', err)
      }
    }
    doSync()
  }, [currentUser?.uniqueOwnerId])

  const date = params.date as string
  const formattedDate = dayjs(date).format('YYYY年MM月DD日')
  const dayOfWeek = dayjs(date).format('dddd')

  // 获取指定日期的记录
  const dayRecords = useMemo(() => {
    console.log('[dayRecords] Filtering records for date:', date)
    console.log('[dayRecords] Available records:', mappedPoopRecords.length)
    console.log('[dayRecords] Current user:', currentUser)
    
    const filtered = mappedPoopRecords.filter(record => {
      const recordDate = dayjs(record.date).format('YYYY-MM-DD')
      const matchesDate = recordDate === date
      const matchesUser = record.ownerId === currentUser?.uniqueOwnerId || 
                         record.uniqueOwnerId === currentUser?.uniqueOwnerId
      
      console.log(`[dayRecords] Record ${record.id}: date=${recordDate}, user=${record.ownerId}, matchesDate=${matchesDate}, matchesUser=${matchesUser}`)
      
      return matchesDate && matchesUser
    })
    
    console.log('[dayRecords] Filtered records:', filtered.length)
    return filtered
  }, [mappedPoopRecords, date, currentUser])

  const handleBack = () => {
    router.push("/healthcalendar")
  }

  const handleAddRecord = () => {
    setIsRecordSelectorOpen(true)
  }

  const handleUserSelectionChange = (user: UserProfile) => {
    console.log('[ViewPage] User selection changed to:', user)
    // 用户选择变化会通过全局状态自动同步
  }

  // 手动触发云同步，带详细调试日志 - 强制获取最新数据
  const handleCloudSync = useCallback(async () => {
    if (!currentUser?.uniqueOwnerId) return
    setIsSyncing(true)
    try {
      console.log('[handleCloudSync] 手动强制云端同步触发. currentUser:', currentUser)
      console.log('[handleCloudSync] 同步前记录数量:', poopRecordsApi.records.length)
      await poopRecordsApi.syncFromCloud()
      console.log('[handleCloudSync] 手动强制云端同步完成，同步后记录数量:', poopRecordsApi.records.length)
      setRefreshVersion(v => v + 1)
    } catch (err) {
      console.error('[handleCloudSync] 手动强制云端同步失败:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [currentUser, poopRecordsApi])

  // Poop类型映射
  const getPoopTypeLabel = (type: string) => {
    const typeMap = {
      type1: "类型1 - 分离的硬块",
      type2: "类型2 - 香蕉状但结块",
      type3: "类型3 - 香蕉状有裂缝",
      type4: "类型4 - 香蕉状光滑",
      type5: "类型5 - 软块边缘清晰",
      type6: "类型6 - 糊状边缘模糊",
      type7: "类型7 - 完全液体"
    }
    return typeMap[type as keyof typeof typeMap] || type
  }
  const getPoopColorLabel = (color: string) => {
    const colorMap = {
      brown: "棕色",
      dark_brown: "深棕色",
      light_brown: "浅棕色",
      yellow: "黄色",
      green: "绿色",
      black: "黑色",
      red: "红色",
      white: "白色"
    }
    return colorMap[color as keyof typeof colorMap] || color
  }
  const getPoopSmellLabel = (smell: string) => {
    const smellMap = {
      normal: "正常",
      strong: "强烈",
      foul: "恶臭",
      sweet: "甜味",
      metallic: "金属味"
    }
    return smellMap[smell as keyof typeof smellMap] || smell
  }

  const handleEditRecord = (record: HealthRecord) => {
    // 跳转到编辑页面，便便类型跳转到/poop，例假到/period，其他到/record
    if (record.type === "poop") {
      router.push(`/healthcalendar/poop?date=${record.date}&edit=${record.id}` as any)
    } else if (record.type === "period") {
      router.push(`/healthcalendar/period?date=${record.date}&edit=${record.id}` as any)
    } else {
      router.push(`/healthcalendar/record?date=${record.date}&edit=${record.id}` as any)
    }
  }
  const handleDeleteRecord = async (recordId: string) => {
    if (window.confirm("确定要删除这条记录吗？")) {
      // 这里只做本地删除，后续可接API
      // TODO: 这里应该用 setRecords，如果有全局状态也要同步
      alert("删除功能请接入API后完善");
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
            <Button
              onClick={handleBack}
              variant="ghost"
              size="sm"
              className="flex items-center space-x-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>返回</span>
            </Button>
            <div className="p-2 bg-red-100 rounded-lg">
              <Calendar className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{formattedDate}</h1>
              <p className="text-sm text-gray-600">{dayOfWeek}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
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

      {/* User Selector */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-gray-600" />
              <span className="text-sm text-gray-600">当前用户:</span>
            </div>
            <SingleUserSelector
              users={availableUsers}
              selectedUser={selectedUsers[0] || availableUsers[0]}
              onChange={handleUserSelectionChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Records */}
      <div className="space-y-4">
        {dayRecords.length === 0 ? (
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无记录</h3>
              <p className="text-gray-600 mb-4">这一天还没有健康记录</p>
              <Button onClick={handleAddRecord} className="bg-red-600 hover:bg-red-700">
                <Plus className="h-4 w-4 mr-2" />
                添加记录
              </Button>
            </CardContent>
          </Card>
        ) : (
          dayRecords.map((record) => (
            <Card key={record.id} className="bg-white/90 backdrop-blur-sm shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>{record.type === 'poop' ? '便便记录' : '健康记录'}</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {dayjs(record.datetime || record.createdAt).format('HH:mm')}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => handleEditRecord(record)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRecord(record.id)} className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {record.content && (
                  <p className="text-gray-700 mb-3">{record.content}</p>
                )}
                
                {/* Tags */}
                {record.tags && record.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {record.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                        <Tag className="h-3 w-3" />
                        <span>{tag}</span>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Poop specific details */}
                {record.type === 'poop' && (
                  <div className="space-y-2">
                    {record.poopType && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">类型:</span>
                        <Badge variant="outline">{getPoopTypeLabel(record.poopType)}</Badge>
                      </div>
                    )}
                    {record.poopColor && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">颜色:</span>
                        <Badge variant="outline">{getPoopColorLabel(record.poopColor)}</Badge>
                      </div>
                    )}
                    {record.poopSmell && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">气味:</span>
                        <Badge variant="outline">{getPoopSmellLabel(record.poopSmell)}</Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Attachments */}
                {record.attachments && record.attachments.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">附件:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {record.attachments.map((attachment) => (
                        <div key={attachment.id} className="p-2 border rounded-lg">
                          <p className="text-sm font-medium">{attachment.name}</p>
                          <p className="text-xs text-gray-500">{attachment.type}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Record Type Selector */}
      {isRecordSelectorOpen && (
        <RecordTypeSelector
          isOpen={isRecordSelectorOpen}
          onClose={() => {
            console.log("ViewPage - onClose called, setting isRecordSelectorOpen to false")
            setIsRecordSelectorOpen(false)
          }}
          date={date}
        />
      )}
    </div>
  )
}