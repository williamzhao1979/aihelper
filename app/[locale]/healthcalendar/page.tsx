"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Calendar, Heart, Activity, Plus, Users, Droplets, Stethoscope, Pill, Camera, FileText, RefreshCw, Utensils, Package, Lightbulb, Brain, Dumbbell } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useToast } from "@/hooks/use-toast"
import { usePathname } from "next/navigation"
import { usePoopRecords } from "@/hooks/use-poop-records"
import { usePeriodRecords } from "@/hooks/use-period-records"
import { useMealRecords } from "@/hooks/use-meal-records"
import { useMyRecords } from "@/hooks/use-my-records"
import { useItemRecords } from "@/hooks/use-item-records"
import { useHealthRecords } from "@/hooks/use-health-records"
import { useMoodRecords } from "@/hooks/use-mood-records"
import { useMedicationRecords } from "@/hooks/use-medication-records"
import { useMeditationRecords } from "@/hooks/use-meditation-records"
import { useThoughtRecords } from "@/hooks/use-thoughts-records"
import { useCheckupRecords } from "@/hooks/use-checkup-records"
import { useExerciseRecords } from "@/hooks/use-exercise-records"
import { useUserManagement } from "@/hooks/use-user-management"
import { useGlobalUserSelection, initializeGlobalUserSelection } from "@/hooks/use-global-user-selection"
import { useHealthDatabase } from "@/hooks/use-health-database"
import { HealthRecord } from "@/lib/health-database"
import HealthCalendar from "@/components/healthcalendar/calendar/health-calendar"
import { SingleUserSelector } from "@/components/healthcalendar/shared/single-user-selector"
import RecordTypeSelector from "@/components/healthcalendar/shared/record-type-selector"
import CompactLegend from "@/components/healthcalendar/calendar/compact-legend"
import type { UserProfile } from "@/components/healthcalendar/shared/user-selector"
import { generatePoopSummary } from "@/lib/poop-options"
import { getMealTypeLabel, getFoodTypeLabel, getMealPortionLabel, getMealConditionLabel } from "@/lib/meal-options"
import dayjs from 'dayjs'
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslations } from 'next-intl'

export default function HealthCalendarPage() {
  const router = useRouter()
  const { toast } = useToast()
  const pathname = usePathname()
  const [isRecordSelectorOpen, setIsRecordSelectorOpen] = useState(false)
  const [userSelectionVersion, setUserSelectionVersion] = useState(0)
  const [stats, setStats] = useState({
    monthlyRecords: 0,
    healthDays: 0,
    monthlyPoopRecords: 0,
    periodCycle: "28天"
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [recentTab, setRecentTab] = useState<'recent' | 'updated'>('recent')
  const t = useTranslations()

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

  // Call usePoopRecords, usePeriodRecords, and useMealRecords at the top level, always
  const poopRecordsApi = usePoopRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const periodRecordsApi = usePeriodRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const mealRecordsApi = useMealRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const myRecordsApi = useMyRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const itemRecordsApi = useItemRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const healthRecordsApi = useHealthRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const moodRecordsApi = useMoodRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const medicationRecordsApi = useMedicationRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const meditationRecordsApi = useMeditationRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const thoughtRecordsApi = useThoughtRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const checkupRecordsApi = useCheckupRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const exerciseRecordsApi = useExerciseRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const { records: poopRecords } = poopRecordsApi
  const { records: periodRecords } = periodRecordsApi
  const { records: mealRecords } = mealRecordsApi
  const { records: myRecords } = myRecordsApi
  const { records: itemRecords } = itemRecordsApi
  const { records: healthRecords } = healthRecordsApi
  const { records: moodRecords } = moodRecordsApi
  const { records: medicationRecords } = medicationRecordsApi
  const { records: meditationRecords } = meditationRecordsApi
  const { records: thoughtRecords } = thoughtRecordsApi
  const { records: checkupRecords } = checkupRecordsApi
  const { records: exerciseRecords } = exerciseRecordsApi

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
        url: a.url, // 添加 url 字段
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
        url: a.url, // 添加 url 字段
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

  // Map MealRecord[] to HealthRecord[] for calendar/stats
  const mappedMealRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedMealRecords] mapping records, refreshVersion:', refreshVersion, 'mealRecords:', mealRecords)
    return mealRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "meal",
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url, // 添加 url 字段
      })) || [],
      mealType: r.mealType,
      foodTypes: r.foodTypes,
      mealPortion: r.mealPortion,
      mealCondition: r.mealCondition,
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
  }, [mealRecords, currentUser, refreshVersion])

  // Map MyRecord[] to HealthRecord[] for calendar/stats
  const mappedMyRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedMyRecords] mapping records, refreshVersion:', refreshVersion, 'myRecords:', myRecords)
    return myRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "myrecord",
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url, // 添加 url 字段
      })) || [],
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
  }, [myRecords, currentUser, refreshVersion])
  
  // Map ItemRecord[] to HealthRecord[] for calendar/stats
  const mappedItemRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedItemRecords] mapping records, refreshVersion:', refreshVersion, 'itemRecords:', itemRecords)
    const mapped = itemRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "item" as const, // Using as const to ensure TypeScript knows this is a literal type
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url, // 添加 url 字段
      })) || [],
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
    console.log('[mappedItemRecords] mapped results:', {
      count: mapped.length,
      first: mapped.length > 0 ? mapped[0] : null
    })
    return mapped
  }, [itemRecords, currentUser, refreshVersion])
  
  // Map HealthRecord[] to HealthRecord[] for calendar/stats
  const mappedHealthRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedHealthRecords] mapping records, refreshVersion:', refreshVersion, 'healthRecords:', healthRecords)
    const mapped = healthRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "health" as const, // Using as const to ensure TypeScript knows this is a literal type
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url, // 添加 url 字段
      })) || [],
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
    console.log('[mappedHealthRecords] mapped results:', {
      count: mapped.length,
      first: mapped.length > 0 ? mapped[0] : null
    })
    return mapped
  }, [healthRecords, currentUser, refreshVersion])

  // Map MedicationRecord[] to HealthRecord[] for calendar/stats
  const mappedMedicationRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedMedicationRecords] mapping records, refreshVersion:', refreshVersion, 'medicationRecords:', medicationRecords)
    const mapped = medicationRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "medication" as const, // Using as const to ensure TypeScript knows this is a literal type
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url, // 添加 url 字段
      })) || [],
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
    console.log('[mappedMedicationRecords] mapped results:', {
      count: mapped.length,
      first: mapped.length > 0 ? mapped[0] : null
    })
    return mapped
  }, [medicationRecords, currentUser, refreshVersion])

  // Map MeditationRecord[] to HealthRecord[] for calendar/stats
  const mappedMeditationRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedMeditationRecords] mapping records, refreshVersion:', refreshVersion, 'meditationRecords:', meditationRecords)
    const mapped = meditationRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime,
      type: "meditation" as const,
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url,
      })) || [],
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
    console.log('[mappedMeditationRecords] mapped results:', {
      count: mapped.length,
      first: mapped.length > 0 ? mapped[0] : null
    })
    return mapped
  }, [meditationRecords, currentUser, refreshVersion])

  // Map CheckupRecord[] to HealthRecord[] for calendar/stats
  const mappedCheckupRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedCheckupRecords] mapping records, refreshVersion:', refreshVersion, 'checkupRecords:', checkupRecords)
    const mapped = checkupRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "checkup" as const, // Using as const to ensure TypeScript knows this is a literal type
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url, // 添加 url 字段
      })) || [],
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
    console.log('[mappedCheckupRecords] mapped results:', {
      count: mapped.length,
      first: mapped.length > 0 ? mapped[0] : null
    })
    return mapped
  }, [checkupRecords, currentUser, refreshVersion])
  
  // Map ThoughtRecord[] to HealthRecord[] for calendar/stats
  const mappedThoughtRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedThoughtRecords] mapping records, refreshVersion:', refreshVersion, 'thoughtRecords:', thoughtRecords)
    const mapped = thoughtRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "thought" as const, // Using as const to ensure TypeScript knows this is a literal type
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url, // 添加 url 字段
      })) || [],
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
    console.log('[mappedThoughtRecords] mapped results:', {
      count: mapped.length,
      first: mapped.length > 0 ? mapped[0] : null
    })
    return mapped
  }, [thoughtRecords, currentUser, refreshVersion])

  // Map MoodRecord[] to HealthRecord[] for calendar/stats
  const mappedMoodRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedMoodRecords] mapping records, refreshVersion:', refreshVersion, 'moodRecords:', moodRecords)
    const mapped = moodRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "mood" as const, // Using as const to ensure TypeScript knows this is a literal type
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url, // 添加 url 字段
      })) || [],
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
    console.log('[mappedMoodRecords] mapped results:', {
      count: mapped.length,
      first: mapped.length > 0 ? mapped[0] : null
    })
    return mapped
  }, [moodRecords, currentUser, refreshVersion])

  // Map ExerciseRecord[] to HealthRecord[] for calendar/stats
  const mappedExerciseRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedExerciseRecords] mapping records, refreshVersion:', refreshVersion, 'exerciseRecords:', exerciseRecords)
    const mapped = exerciseRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime,
      type: "exercise" as const,
      content: r.content,
      tags: r.tags,
      attachments: r.attachments?.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        url: a.url,
      })) || [],
      createdAt: new Date(r.createdAt),
      updatedAt: new Date(r.updatedAt),
    }))
    console.log('[mappedExerciseRecords] mapped results:', {
      count: mapped.length,
      first: mapped.length > 0 ? mapped[0] : null
    })
    return mapped
  }, [exerciseRecords, currentUser, refreshVersion])

  // Sync from cloud on mount and when currentUser changes - 强制获取最新数据
  useEffect(() => {
    if (!currentUser?.uniqueOwnerId) return
    console.log('[useEffect] 强制云端同步触发. currentUser:', currentUser)
    console.log('[useEffect] 同步前记录数量:', poopRecordsApi.records.length, 'periodRecords:', periodRecordsApi.records.length, 'mealRecords:', mealRecordsApi.records.length, 'myRecords:', myRecordsApi.records.length)
    
    const doSync = async () => {
      try {
        console.log('[useEffect] 开始强制云端同步，用户:', currentUser?.uniqueOwnerId)
        await Promise.all([
          poopRecordsApi.syncFromCloud(),
          periodRecordsApi.syncFromCloud(),
          mealRecordsApi.syncFromCloud(),
          myRecordsApi.syncFromCloud(),
          itemRecordsApi.syncFromCloud(),
          healthRecordsApi.syncFromCloud(),
          moodRecordsApi.syncFromCloud(),
          medicationRecordsApi.syncFromCloud(),
          meditationRecordsApi.syncFromCloud(),
          thoughtRecordsApi.syncFromCloud(),
          checkupRecordsApi.syncFromCloud(),
          exerciseRecordsApi.syncFromCloud()
        ])
        console.log('[useEffect] 强制云端同步完成，同步后记录数量:', poopRecordsApi.records.length, 'periodRecords:', periodRecordsApi.records.length, 'mealRecords:', mealRecordsApi.records.length, 'myRecords:', myRecordsApi.records.length, 'itemRecords:', itemRecordsApi.records.length, 'healthRecords:', healthRecordsApi.records.length, 'moodRecords:', moodRecordsApi.records.length, 'medicationRecords:', medicationRecordsApi.records.length, 'meditationRecords:', meditationRecordsApi.records.length, 'thoughtRecords:', thoughtRecordsApi.records.length, 'checkupRecords:', checkupRecordsApi.records.length, 'exerciseRecords:', exerciseRecordsApi.records.length)
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
        monthlyPoopRecords: 0,
        periodCycle: "28天"
      })
      return
    }
    const allRecords = [...mappedPoopRecords, ...mappedPeriodRecords, ...mappedMealRecords, ...mappedMyRecords, ...mappedItemRecords, ...mappedHealthRecords, ...mappedMoodRecords, ...mappedMedicationRecords, ...mappedMeditationRecords, ...mappedThoughtRecords, ...mappedCheckupRecords, ...mappedExerciseRecords]
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
    
    // 计算本月排便记录数
    const monthlyPoopRecords = filteredRecords.filter(record => {
      const recordDate = new Date(record.date)
      return record.type === 'poop' && recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear
    }).length
    
    const uniqueDates = new Set(filteredRecords.map(record => record.date))
    const healthDays = uniqueDates.size
    setStats({
      monthlyRecords,
      healthDays,
      monthlyPoopRecords,
      periodCycle: "28天"
    })
  }, [isInitialized, selectedUsers, mappedPoopRecords, mappedPeriodRecords, mappedMealRecords, mappedMyRecords, mappedItemRecords, mappedHealthRecords, mappedMoodRecords, mappedMedicationRecords, mappedMeditationRecords, mappedThoughtRecords, mappedCheckupRecords, mappedExerciseRecords])

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
      console.log('[handleCloudSync] 同步前记录数量:', poopRecordsApi.records.length, 'periodRecords:', periodRecordsApi.records.length, 'mealRecords:', mealRecordsApi.records.length, 'myRecords:', myRecordsApi.records.length, 'itemRecords:', itemRecordsApi.records.length, 'healthRecords:', healthRecordsApi.records.length, 'moodRecords:', moodRecordsApi.records.length, 'medicationRecords:', medicationRecordsApi.records.length, 'meditationRecords:', meditationRecordsApi.records.length, 'thoughtRecords:', thoughtRecordsApi.records.length, 'checkupRecords:', checkupRecordsApi.records.length, 'exerciseRecords:', exerciseRecordsApi.records.length)
      
      // 同时刷新用户数据和健康记录数据
      const [userRefreshResult, poopRecordsRefreshResult, periodRecordsRefreshResult, mealRecordsRefreshResult, myRecordsRefreshResult, itemRecordsRefreshResult, healthRecordsRefreshResult, moodRecordsRefreshResult, medicationRecordsRefreshResult, meditationRecordsRefreshResult, thoughtRecordsRefreshResult, checkupRecordsRefreshResult, exerciseRecordsRefreshResult] = await Promise.allSettled([
        forceRefreshUsers(),
        poopRecordsApi.syncFromCloud(),
        periodRecordsApi.syncFromCloud(),
        mealRecordsApi.syncFromCloud(),
        myRecordsApi.syncFromCloud(),
        itemRecordsApi.syncFromCloud(),
        healthRecordsApi.syncFromCloud(),
        moodRecordsApi.syncFromCloud(),
        medicationRecordsApi.syncFromCloud(),
        meditationRecordsApi.syncFromCloud(),
        thoughtRecordsApi.syncFromCloud(),
        checkupRecordsApi.syncFromCloud(),
        exerciseRecordsApi.syncFromCloud()
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
      
      // 检查饮食记录数据刷新结果
      if (mealRecordsRefreshResult.status === 'fulfilled') {
        console.log('[handleCloudSync] 饮食记录数据刷新成功，同步后记录数量:', mealRecordsApi.records.length)
      } else {
        console.error('[handleCloudSync] 饮食记录数据刷新失败:', mealRecordsRefreshResult.reason)
      }
      
      // 检查其他记录数据刷新结果
      if (myRecordsRefreshResult.status === 'fulfilled') {
        console.log('[handleCloudSync] 其他记录数据刷新成功，同步后记录数量:', myRecordsApi.records.length)
      } else {
        console.error('[handleCloudSync] 其他记录数据刷新失败:', myRecordsRefreshResult.reason)
      }
      
      // 检查物品记录数据刷新结果
      if (itemRecordsRefreshResult.status === 'fulfilled') {
        console.log('[handleCloudSync] 物品记录数据刷新成功，同步后记录数量:', itemRecordsApi.records.length)
      } else {
        console.error('[handleCloudSync] 物品记录数据刷新失败:', itemRecordsRefreshResult.reason)
      }
      
      // 检查健康记录数据刷新结果
      if (healthRecordsRefreshResult.status === 'fulfilled') {
        console.log('[handleCloudSync] 健康记录数据刷新成功，同步后记录数量:', healthRecordsApi.records.length)
      } else {
        console.error('[handleCloudSync] 健康记录数据刷新失败:', healthRecordsRefreshResult.reason)
      }
      
      // 检查心情记录数据刷新结果
      if (moodRecordsRefreshResult.status === 'fulfilled') {
        console.log('[handleCloudSync] 心情记录数据刷新成功，同步后记录数量:', moodRecordsApi.records.length)
      } else {
        console.error('[handleCloudSync] 心情记录数据刷新失败:', moodRecordsRefreshResult.reason)
      }
      
      // 检查用药记录数据刷新结果
      if (medicationRecordsRefreshResult.status === 'fulfilled') {
        console.log('[handleCloudSync] 用药记录数据刷新成功，同步后记录数量:', medicationRecordsApi.records.length)
      } else {
        console.error('[handleCloudSync] 用药记录数据刷新失败:', medicationRecordsRefreshResult.reason)
      }
      
      // 检查冥想记录数据刷新结果
      if (meditationRecordsRefreshResult.status === 'fulfilled') {
        console.log('[handleCloudSync] 冥想记录数据刷新成功，同步后记录数量:', meditationRecordsApi.records.length)
      } else {
        console.error('[handleCloudSync] 冥想记录数据刷新失败:', meditationRecordsRefreshResult.reason)
      }
      
      // 检查想法记录数据刷新结果
      if (thoughtRecordsRefreshResult.status === 'fulfilled') {
        console.log('[handleCloudSync] 想法记录数据刷新成功，同步后记录数量:', thoughtRecordsApi.records.length)
      } else {
        console.error('[handleCloudSync] 想法记录数据刷新失败:', thoughtRecordsRefreshResult.reason)
      }
      
      // 检查体检记录数据刷新结果
      if (checkupRecordsRefreshResult.status === 'fulfilled') {
        console.log('[handleCloudSync] 体检记录数据刷新成功，同步后记录数量:', checkupRecordsApi.records.length)
      } else {
        console.error('[handleCloudSync] 体检记录数据刷新失败:', checkupRecordsRefreshResult.reason)
      }
      
      // 检查运动记录数据刷新结果
      if (exerciseRecordsRefreshResult.status === 'fulfilled') {
        console.log('[handleCloudSync] 运动记录数据刷新成功，同步后记录数量:', exerciseRecordsApi.records.length)
      } else {
        console.error('[handleCloudSync] 运动记录数据刷新失败:', exerciseRecordsRefreshResult.reason)
      }
      
      setRefreshVersion(v => v + 1)
    } catch (err) {
      console.error('[handleCloudSync] 手动强制云端同步失败:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [currentUser, poopRecordsApi, periodRecordsApi, mealRecordsApi, myRecordsApi, itemRecordsApi, healthRecordsApi, moodRecordsApi, medicationRecordsApi, meditationRecordsApi, thoughtRecordsApi, checkupRecordsApi, exerciseRecordsApi, forceRefreshUsers])

  // 获取当前显示的用户信息
  const getDisplayUsersText = () => {
    if (selectedUsers.length === 0) return "选择用户"
    if (selectedUsers.length === 1) return selectedUsers[0].nickname
    if (selectedUsers.length === availableUsers.length) return "所有用户"
    return `${selectedUsers.length}个用户`
  }

  // 最近记录（按发生时间排序）
  const recentRecords = useMemo(() => {
    const allRecords = [
      ...mappedPoopRecords,
      ...mappedPeriodRecords,
      ...mappedMealRecords,
      ...mappedMyRecords,
      ...mappedItemRecords,
      ...mappedHealthRecords,
      ...mappedMoodRecords,
      ...mappedMedicationRecords,
      ...mappedMeditationRecords,
      ...mappedThoughtRecords,
      ...mappedCheckupRecords,
      ...mappedExerciseRecords
    ]
    const selectedUserIds = selectedUsers.map(u => u.uniqueOwnerId)
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
    return sortedRecords
  }, [mappedPoopRecords, mappedPeriodRecords, mappedMealRecords, mappedMyRecords, mappedItemRecords, mappedHealthRecords, mappedMoodRecords, mappedMedicationRecords, mappedMeditationRecords, mappedThoughtRecords, mappedCheckupRecords, mappedExerciseRecords, selectedUsers])

  // 最近更新记录（按更新时间排序）
  const recentUpdatedRecords = useMemo(() => {
    const allRecords = [
      ...mappedPoopRecords,
      ...mappedPeriodRecords,
      ...mappedMealRecords,
      ...mappedMyRecords,
      ...mappedItemRecords,
      ...mappedHealthRecords,
      ...mappedMoodRecords,
      ...mappedMedicationRecords,
      ...mappedMeditationRecords,
      ...mappedThoughtRecords,
      ...mappedCheckupRecords,
      ...mappedExerciseRecords
    ]
    const selectedUserIds = selectedUsers.map(u => u.uniqueOwnerId)
    const filteredRecords = allRecords.filter(record =>
      selectedUserIds.includes(record.ownerId || record.uniqueOwnerId || '')
    )
    // 按更新时间排序，取最新的5条
    const sortedRecords = filteredRecords
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt).getTime()
        const bTime = new Date(b.updatedAt || b.createdAt).getTime()
        return bTime - aTime
      })
      .slice(0, 5)
    return sortedRecords
  }, [mappedPoopRecords, mappedPeriodRecords, mappedMealRecords, mappedMyRecords, mappedItemRecords, mappedHealthRecords, mappedMoodRecords, mappedMedicationRecords, mappedMeditationRecords, mappedThoughtRecords, mappedCheckupRecords, mappedExerciseRecords, selectedUsers])

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
      case "myrecord":
        return {
          icon: <Heart className="h-4 w-4" />,
          color: "bg-green-50",
          dotColor: "bg-green-500",
          title: "我的记录"
        }
      case "meal":
        return {
          icon: <Utensils className="h-4 w-4" />,
          color: "bg-orange-50",
          dotColor: "bg-orange-500",
          title: "用餐记录"
        }
      case "item":
        return {
          icon: <Package className="h-4 w-4" />,
          color: "bg-amber-50",
          dotColor: "bg-amber-500",
          title: "物品记录"
        }
      case "health":
        return {
          icon: <Stethoscope className="h-4 w-4" />,
          color: "bg-blue-50",
          dotColor: "bg-blue-500",
          title: "健康记录"
        }
      case "checkup":
        return {
          icon: <Camera className="h-4 w-4" />,
          color: "bg-purple-50",
          dotColor: "bg-purple-500",
          title: "体检记录"
        }
      case "thought":
        return {
          icon: <Lightbulb className="h-4 w-4" />,
          color: "bg-yellow-50",
          dotColor: "bg-yellow-600",
          title: "想法记录"
        }
      case "medication":
        return {
          icon: <Pill className="h-4 w-4" />,
          color: "bg-purple-50",
          dotColor: "bg-purple-500",
          title: "用药记录"
        }
      case "meditation":
        return {
          icon: <Brain className="h-4 w-4" />,
          color: "bg-purple-50",
          dotColor: "bg-purple-500",
          title: "冥想记录"
        }
      case "exercise":
        return {
          icon: <Dumbbell className="h-4 w-4" />,
          color: "bg-green-50",
          dotColor: "bg-green-500",
          title: "运动记录"
        }
      case "mood":
        return {
          icon: <Heart className="h-4 w-4" />,
          color: "bg-pink-50",
          dotColor: "bg-pink-500",
          title: "心情记录"
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
    if (record.type === "meal") {
      const mealTypeText = record.mealType ? getMealTypeLabel(record.mealType) : ''
      const portionText = record.mealPortion ? getMealPortionLabel(record.mealPortion) : ''
      const foodTypesText = record.foodTypes && record.foodTypes.length > 0 
        ? record.foodTypes.map(type => getFoodTypeLabel(type)).join('、') 
        : ''
      
      const summaryParts = [mealTypeText, foodTypesText, portionText].filter(Boolean)
      return summaryParts.length > 0 ? summaryParts.join(' · ') : '用餐记录'
    }
    if (record.type === "myrecord") {
      return record.content?.slice(0, 20) + (record.content && record.content.length > 20 ? '...' : '') || '其他记录'
    }
    if (record.type === "item") {
      return record.content?.slice(0, 20) + (record.content && record.content.length > 20 ? '...' : '') || '物品记录'
    }
    if (record.type === "health") {
      return record.content?.slice(0, 20) + (record.content && record.content.length > 20 ? '...' : '') || '健康记录'
    }
    if (record.type === "checkup") {
      return record.content?.slice(0, 20) + (record.content && record.content.length > 20 ? '...' : '') || '体检记录'
    }
    if (record.type === "thought") {
      return record.content?.slice(0, 20) + (record.content && record.content.length > 20 ? '...' : '') || '想法记录'
    }
    if (record.type === "medication") {
      return record.content?.slice(0, 20) + (record.content && record.content.length > 20 ? '...' : '') || '用药记录'
    }
    if (record.type === "meditation") {
      return record.content?.slice(0, 20) + (record.content && record.content.length > 20 ? '...' : '') || '冥想记录'
    }
    if (record.type === "exercise") {
      return record.content?.slice(0, 20) + (record.content && record.content.length > 20 ? '...' : '') || '运动记录'
    }
    if (record.type === "mood") {
      return record.content?.slice(0, 20) + (record.content && record.content.length > 20 ? '...' : '') || '心情记录'
    }
    return record.content?.slice(0, 20) + (record.content && record.content.length > 20 ? '...' : '') || '其他记录'
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
      router.push(`/healthcalendar/period?date=${record.date}&edit=${record.id}` as any)
      // 使用 localStorage 传递编辑信息
      localStorage.setItem('editRecordId', record.id)
    } else if (record.type === "poop") {
      // 排便记录跳转到排便记录页面
      // router.push("/healthcalendar/poop" as any)
      router.push(`/healthcalendar/poop?date=${record.date}&edit=${record.id}` as any)
      // 使用 localStorage 传递编辑信息
      localStorage.setItem('editRecordId', record.id)
    } else if (record.type === "meal") {
      // 饮食记录跳转到饮食记录页面
      router.push(`/healthcalendar/meal?date=${record.date}&edit=${record.id}` as any)
      // 使用 localStorage 传递编辑信息
      localStorage.setItem('editRecordId', record.id)
    } else if (record.type === "myrecord") {
      // 其他记录跳转到其他记录页面
      router.push(`/healthcalendar/myrecord?date=${record.date}&edit=${record.id}` as any)
      // 使用 localStorage 传递编辑信息
      localStorage.setItem('editRecordId', record.id)
    } else if (record.type === "item") {
      // 物品记录跳转到物品记录页面
      router.push(`/healthcalendar/itemrecord?date=${record.date}&edit=${record.id}` as any)
      // 使用 localStorage 传递编辑信息
      localStorage.setItem('editRecordId', record.id)
    } else if (record.type === "health") {
      // 健康记录跳转到健康记录页面
      router.push(`/healthcalendar/health?date=${record.date}&edit=${record.id}` as any)
      // 使用 localStorage 传递编辑信息
      localStorage.setItem('editRecordId', record.id)
    } else if (record.type === "checkup") {
      // 体检记录跳转到体检记录页面
      router.push(`/healthcalendar/checkup?date=${record.date}&edit=${record.id}` as any)
      // 使用 localStorage 传递编辑信息
      localStorage.setItem('editRecordId', record.id)
    } else if (record.type === "thought") {
      // 想法记录跳转到想法记录页面
      router.push(`/healthcalendar/thoughts?date=${record.date}&edit=${record.id}` as any)
      // 使用 localStorage 传递编辑信息
      localStorage.setItem('editRecordId', record.id)
    } else if (record.type === "medication") {
      // 用药记录跳转到用药记录页面
      router.push(`/healthcalendar/medication?date=${record.date}&edit=${record.id}` as any)
      // 使用 localStorage 传递编辑信息
      localStorage.setItem('editRecordId', record.id)
    } else if (record.type === "meditation") {
      // 冥想记录跳转到冥想记录页面
      router.push(`/healthcalendar/meditation?date=${record.date}&edit=${record.id}` as any)
      // 使用 localStorage 传递编辑信息
      localStorage.setItem('editRecordId', record.id)
    } else if (record.type === "exercise") {
      // 运动记录跳转到运动记录页面
      router.push(`/healthcalendar/exercise?date=${record.date}&edit=${record.id}` as any)
      // 使用 localStorage 传递编辑信息
      localStorage.setItem('editRecordId', record.id)
    } else if (record.type === "mood") {
      // 心情记录跳转到心情记录页面
      router.push(`/healthcalendar/mood?date=${record.date}&edit=${record.id}` as any)
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
        {/* <Card className="bg-white/80 backdrop-blur-sm">
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
        </Card> */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-xs text-gray-600">大便次数&nbsp;&nbsp;
                <span className="text-lg font-semibold text-gray-900">{stats.monthlyPoopRecords}</span>
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
            records={[...mappedPoopRecords, ...mappedPeriodRecords, ...mappedMealRecords, ...mappedMyRecords, ...mappedItemRecords, ...mappedHealthRecords, ...mappedMoodRecords, ...mappedMedicationRecords, ...mappedMeditationRecords, ...mappedThoughtRecords, ...mappedCheckupRecords, ...mappedExerciseRecords]}
            onCloudSync={handleCloudSync}
            isSyncing={isSyncing}
          />
        </CardContent>
      </Card>

      {/* Compact Legend - 记录类型说明 */}
      <div className="mt-6">
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardContent className="p-4">
            <CompactLegend />
          </CardContent>
        </Card>
      </div>


      {/* Recent Records */}
      <div className="mt-6">
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{recentTab === 'recent' ? '最近记录' : '最近更新'}</CardTitle>
              <div className="flex items-center space-x-2">
                <Tabs value={recentTab} onValueChange={v => setRecentTab(v as 'recent' | 'updated')}>
                  <TabsList>
                    <TabsTrigger value="recent">最近记录</TabsTrigger>
                    <TabsTrigger value="updated">最近更新</TabsTrigger>
                  </TabsList>
                </Tabs>
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
            {(recentTab === 'recent' ? recentRecords : recentUpdatedRecords).length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">暂无记录</p>
                <p className="text-sm text-gray-500">开始记录您的健康数据吧</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(recentTab === 'recent' ? recentRecords : recentUpdatedRecords).map((record) => {
                  const typeInfo = getRecordTypeInfo(record)
                  const summary = getRecordSummary(record)
                  const timeAgo = formatTimeAgo(new Date(record.datetime || record.date))
                  
                  return (
                    <div 
                      key={record.id}
                      className={`flex items-center justify-between p-2 ${typeInfo.color} rounded-lg cursor-pointer hover:opacity-80 transition-opacity`}
                      onClick={() => handleViewRecord(record)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 ${typeInfo.dotColor} rounded-full`}></div>
                        <div className="flex items-center space-x-1">
                          {typeInfo.icon}
                          <div>
                            <div className="flex items-center space-x-1">
                              <p className="text-sm font-medium text-gray-900">{typeInfo.title}</p>
                              <span className="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded-full">
                                {record.ownerName || '未知用户'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-700 mt-0.5 max-w-[320px] whitespace-normal break-words">{summary}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {t('healthcalendar.recordTime')}: {record.datetime ? dayjs(record.datetime).format('MM-DD HH:mm') : dayjs(record.createdAt).format('MM-DD HH:mm')} ({formatTimeAgo(new Date(record.datetime || record.createdAt))})
                            </div>
                            {record.updatedAt && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                {t('healthcalendar.updateTime')}: {dayjs(record.updatedAt).format('MM-DD HH:mm')} ({formatTimeAgo(new Date(record.updatedAt))})
                              </div>
                            )}
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
                {(recentTab === 'recent' ? recentRecords : recentUpdatedRecords).length >= 5 && (
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

        {/* Management Section */}
        <div className="mt-4">
          <Accordion type="single" collapsible defaultValue="">
            <AccordionItem value="management">
              <AccordionTrigger className="px-4 py-3 bg-white/90 backdrop-blur-sm shadow-lg rounded-t-lg flex items-center space-x-2 text-lg">
                <Users className="w-5 h-5 text-blue-600" />
                <span>系统管理</span>
              </AccordionTrigger>
              <AccordionContent className="p-0">
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg rounded-t-none rounded-b-lg border-t-0">
                  <CardContent>
                    <div className="space-y-3">
                      {/* User Management */}
                      <div 
                        className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={handleUserManagement}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">用户管理</p>
                              <p className="text-xs text-gray-600">管理家庭成员和权限设置</p>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          进入
                        </Button>
                      </div>

                      {/* Test Global User Selection */}
                      <div 
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                        onClick={() => router.push("/healthcalendar/test-global-user" as any)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">测试全局用户选择</p>
                              <p className="text-xs text-gray-600">测试多用户数据切换功能</p>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          测试
                        </Button>
                      </div>

                      {/* Test Recent Records */}
                      <div 
                        className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                        onClick={() => router.push("/healthcalendar/test-recent-records" as any)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-purple-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">测试最近记录</p>
                              <p className="text-xs text-gray-600">测试记录显示和同步功能</p>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          测试
                        </Button>
                      </div>

                      {/* Debug Page */}
                      <div 
                        className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                        onClick={handleDebug}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <div className="flex items-center space-x-2">
                            <Activity className="h-4 w-4 text-orange-600" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">调试工具</p>
                              <p className="text-xs text-gray-600">系统调试和数据修复工具</p>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          调试
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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