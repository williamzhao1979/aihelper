"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Edit, Trash2, Plus, Calendar, Heart, Activity, Users, Clock, Tag, X, FileText, Package, Utensils, Droplets, Stethoscope, Lightbulb, Pill, Brain, Dumbbell } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { usePoopRecords } from "@/hooks/use-poop-records"
import { usePeriodRecords } from "@/hooks/use-period-records"
import { useMealRecords } from "@/hooks/use-meal-records"
import { useMyRecords } from "@/hooks/use-my-records"
import { useItemRecords } from "@/hooks/use-item-records"
import { useHealthRecords } from "@/hooks/use-health-records"
import { useMoodRecords } from "@/hooks/use-mood-records"
import { useExerciseRecords } from "@/hooks/use-exercise-records"
import { useMedicationRecords } from "@/hooks/use-medication-records"
import { useMeditationRecords } from "@/hooks/use-meditation-records"
import { useThoughtRecords } from "@/hooks/use-thoughts-records"
import { useCheckupRecords } from "@/hooks/use-checkup-records"
import { useUserManagement } from "@/hooks/use-user-management"
import { useGlobalUserSelection } from "@/hooks/use-global-user-selection"
import { HealthRecord } from "@/lib/health-database"
import { formatDisplayDateTime, formatDisplayDate } from "@/lib/utils"
import { getMealTypeLabel, getFoodTypeLabel, getMealPortionLabel, getMealConditionLabel } from "@/lib/meal-options"
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
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<HealthRecord | null>(null)
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null) // 图片放大模态框
  
  const { users: availableUsers, isLoading: usersLoading, getPrimaryUser } = useUserManagement()
  
  // 使用全局用户选择状态
  const { selectedUsers } = useGlobalUserSelection()

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
  const exerciseRecordsApi = useExerciseRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const medicationRecordsApi = useMedicationRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const meditationRecordsApi = useMeditationRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const thoughtRecordsApi = useThoughtRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  const checkupRecordsApi = useCheckupRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "")
  console.log("[ViewPage] currentUser?.uniqueOwnerId:", currentUser?.uniqueOwnerId)
  console.log("[ViewPage] selectedUsers:", selectedUsers)
  // console.log("[ViewPage] globalSelectedUsers:", globalSelectedUsers)
  const { records: poopRecords } = poopRecordsApi
  const { records: periodRecords } = periodRecordsApi
  const { records: mealRecords } = mealRecordsApi
  const { records: myRecords } = myRecordsApi
  const { records: itemRecords } = itemRecordsApi
  const { records: healthRecords } = healthRecordsApi
  const { records: moodRecords } = moodRecordsApi
  const { records: exerciseRecords } = exerciseRecordsApi
  const { records: medicationRecords } = medicationRecordsApi
  const { records: meditationRecords } = meditationRecordsApi
  const { records: thoughtRecords } = thoughtRecordsApi
  const { records: checkupRecords } = checkupRecordsApi

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
    return itemRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "item",
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
  }, [itemRecords, currentUser, refreshVersion])
  
  // Map HealthRecord[] to HealthRecord[] for calendar/stats
  const mappedHealthRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedHealthRecords] mapping records, refreshVersion:', refreshVersion, 'healthRecords:', healthRecords)
    return healthRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "health",
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
  }, [healthRecords, currentUser, refreshVersion])

  // Map MoodRecord[] to HealthRecord[] for calendar/stats
  const mappedMoodRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedMoodRecords] mapping records, refreshVersion:', refreshVersion, 'moodRecords:', moodRecords)
    return moodRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "mood" as const,
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
  }, [moodRecords, currentUser, refreshVersion])

  // Map ExerciseRecord[] to HealthRecord[] for calendar/stats
  const mappedExerciseRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedExerciseRecords] mapping records, refreshVersion:', refreshVersion, 'exerciseRecords:', exerciseRecords)
    return exerciseRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "exercise",
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
  }, [exerciseRecords, currentUser, refreshVersion])

  // Map MedicationRecord[] to HealthRecord[] for calendar/stats
  const mappedMedicationRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedMedicationRecords] mapping records, refreshVersion:', refreshVersion, 'medicationRecords:', medicationRecords)
    return medicationRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "medication",
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
  }, [medicationRecords, currentUser, refreshVersion])

  // Map MeditationRecord[] to HealthRecord[] for calendar/stats
  const mappedMeditationRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedMeditationRecords] mapping records, refreshVersion:', refreshVersion, 'meditationRecords:', meditationRecords)
    return meditationRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "meditation",
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
  }, [meditationRecords, currentUser, refreshVersion])

  // Map CheckupRecord[] to HealthRecord[] for calendar/stats
  const mappedCheckupRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedCheckupRecords] mapping records, refreshVersion:', refreshVersion, 'checkupRecords:', checkupRecords)
    return checkupRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "checkup",
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
  }, [checkupRecords, currentUser, refreshVersion])
  
  // Map ThoughtRecord[] to HealthRecord[] for calendar/stats
  const mappedThoughtRecords: HealthRecord[] = useMemo(() => {
    console.log('[mappedThoughtRecords] mapping records, refreshVersion:', refreshVersion, 'thoughtRecords:', thoughtRecords)
    return thoughtRecords.map((r) => ({
      id: r.id,
      recordId: r.id,
      uniqueOwnerId: currentUser?.uniqueOwnerId || "",
      ownerId: currentUser?.uniqueOwnerId || "",
      ownerName: currentUser?.nickname || "",
      date: r.date,
      datetime: r.datetime, // 映射datetime字段
      type: "thought",
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
  }, [thoughtRecords, currentUser, refreshVersion])

  // Sync from cloud on mount and when currentUser changes - 强制获取最新数据
  useEffect(() => {
    if (!currentUser?.uniqueOwnerId) return
    console.log('[useEffect] 强制云端同步触发. currentUser:', currentUser)
    console.log('[useEffect] 同步前记录数量:', poopRecordsApi.records.length, 'periodRecords:', periodRecordsApi.records.length, 'mealRecords:', mealRecordsApi.records.length, 'myRecords:', myRecordsApi.records.length, 'itemRecords:', itemRecordsApi.records.length, 'healthRecords:', healthRecordsApi.records.length, 'exerciseRecords:', exerciseRecordsApi.records.length, 'medicationRecords:', medicationRecordsApi.records.length, 'thoughtRecords:', thoughtRecordsApi.records.length, 'checkupRecords:', checkupRecordsApi.records.length)
    
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
          exerciseRecordsApi.syncFromCloud(),
          medicationRecordsApi.syncFromCloud(),
          meditationRecordsApi.syncFromCloud(),
          thoughtRecordsApi.syncFromCloud(),
          checkupRecordsApi.syncFromCloud()
        ])
        console.log('[useEffect] 强制云端同步完成，同步后记录数量:', poopRecordsApi.records.length, 'periodRecords:', periodRecordsApi.records.length, 'mealRecords:', mealRecordsApi.records.length, 'myRecords:', myRecordsApi.records.length, 'itemRecords:', itemRecordsApi.records.length, 'healthRecords:', healthRecordsApi.records.length, 'moodRecords:', moodRecordsApi.records.length, 'exerciseRecords:', exerciseRecordsApi.records.length, 'medicationRecords:', medicationRecordsApi.records.length, 'meditationRecords:', meditationRecordsApi.records.length, 'thoughtRecords:', thoughtRecordsApi.records.length, 'checkupRecords:', checkupRecordsApi.records.length)
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
    console.log('[dayRecords] Available records:', mappedPoopRecords.length, 'periodRecords:', mappedPeriodRecords.length, 'mealRecords:', mappedMealRecords.length, 'myRecords:', mappedMyRecords.length, 'itemRecords:', mappedItemRecords.length, 'healthRecords:', mappedHealthRecords.length, 'moodRecords:', mappedMoodRecords.length, 'exerciseRecords:', mappedExerciseRecords.length, 'medicationRecords:', mappedMedicationRecords.length, 'meditationRecords:', mappedMeditationRecords.length, 'thoughtRecords:', mappedThoughtRecords.length, 'checkupRecords:', mappedCheckupRecords.length)
    console.log('[dayRecords] Current user:', currentUser)
    
    const allRecords = [...mappedPoopRecords, ...mappedPeriodRecords, ...mappedMealRecords, ...mappedMyRecords, ...mappedItemRecords, ...mappedHealthRecords, ...mappedMoodRecords, ...mappedExerciseRecords, ...mappedMedicationRecords, ...mappedMeditationRecords, ...mappedThoughtRecords, ...mappedCheckupRecords]
    
    const filtered = allRecords.filter(record => {
      const recordDate = dayjs(record.date).format('YYYY-MM-DD')
      const matchesDate = recordDate === date
      const matchesUser = record.ownerId === currentUser?.uniqueOwnerId || 
                         record.uniqueOwnerId === currentUser?.uniqueOwnerId
      
      console.log(`[dayRecords] Record ${record.id}: date=${recordDate}, user=${record.ownerId}, matchesDate=${matchesDate}, matchesUser=${matchesUser}`)
      
      return matchesDate && matchesUser
    })
    
    console.log('[dayRecords] Filtered records:', filtered.length)
    return filtered
  }, [mappedPoopRecords, mappedPeriodRecords, mappedMealRecords, mappedMyRecords, mappedItemRecords, mappedHealthRecords, mappedMoodRecords, mappedExerciseRecords, mappedMedicationRecords, mappedMeditationRecords, mappedThoughtRecords, mappedCheckupRecords, date, currentUser])

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
      console.log('[handleCloudSync] 同步前记录数量:', poopRecordsApi.records.length, 'periodRecords:', periodRecordsApi.records.length, 'mealRecords:', mealRecordsApi.records.length, 'myRecords:', myRecordsApi.records.length, 'itemRecords:', itemRecordsApi.records.length, 'healthRecords:', healthRecordsApi.records.length, 'moodRecords:', moodRecordsApi.records.length, 'exerciseRecords:', exerciseRecordsApi.records.length, 'medicationRecords:', medicationRecordsApi.records.length, 'meditationRecords:', meditationRecordsApi.records.length, 'thoughtRecords:', thoughtRecordsApi.records.length, 'checkupRecords:', checkupRecordsApi.records.length)
      await Promise.all([
        poopRecordsApi.syncFromCloud(),
        periodRecordsApi.syncFromCloud(),
        mealRecordsApi.syncFromCloud(),
        myRecordsApi.syncFromCloud(),
        itemRecordsApi.syncFromCloud(),
        healthRecordsApi.syncFromCloud(),
        moodRecordsApi.syncFromCloud(),
        exerciseRecordsApi.syncFromCloud(),
        medicationRecordsApi.syncFromCloud(),
        meditationRecordsApi.syncFromCloud(),
        thoughtRecordsApi.syncFromCloud(),
        checkupRecordsApi.syncFromCloud()
      ])
      console.log('[handleCloudSync] 手动强制云端同步完成，同步后记录数量:', poopRecordsApi.records.length, 'periodRecords:', periodRecordsApi.records.length, 'mealRecords:', mealRecordsApi.records.length, 'myRecords:', myRecordsApi.records.length, 'itemRecords:', itemRecordsApi.records.length, 'healthRecords:', healthRecordsApi.records.length, 'moodRecords:', moodRecordsApi.records.length, 'exerciseRecords:', exerciseRecordsApi.records.length, 'medicationRecords:', medicationRecordsApi.records.length, 'meditationRecords:', meditationRecordsApi.records.length, 'thoughtRecords:', thoughtRecordsApi.records.length, 'checkupRecords:', checkupRecordsApi.records.length)
      setRefreshVersion(v => v + 1)
    } catch (err) {
      console.error('[handleCloudSync] 手动强制云端同步失败:', err)
    } finally {
      setIsSyncing(false)
    }
  }, [currentUser, poopRecordsApi, periodRecordsApi, mealRecordsApi, myRecordsApi, itemRecordsApi, healthRecordsApi, moodRecordsApi, exerciseRecordsApi, medicationRecordsApi, meditationRecordsApi, thoughtRecordsApi, checkupRecordsApi])

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

  // Period类型映射
  const getPeriodFlowLabel = (flow: string) => {
    const flowMap = {
      light: "轻量",
      medium: "中等",
      heavy: "大量"
    }
    return flowMap[flow as keyof typeof flowMap] || flow
  }

  const getPeriodPainLabel = (pain: string) => {
    const painMap = {
      none: "无疼痛",
      mild: "轻微疼痛",
      moderate: "中等疼痛",
      severe: "严重疼痛"
    }
    return painMap[pain as keyof typeof painMap] || pain
  }

  const getPeriodMoodLabel = (mood: string) => {
    const moodMap = {
      good: "心情好",
      normal: "一般",
      bad: "心情差"
    }
    return moodMap[mood as keyof typeof moodMap] || mood
  }

  const handleEditRecord = (record: HealthRecord) => {
    const recordId = record.id
    const currentDate = date
    
    // 根据记录类型跳转到相应的编辑页面
    if (record.type === 'poop') {
      router.push(`/healthcalendar/poop?edit=${recordId}&date=${currentDate}` as any)
    } else if (record.type === 'period') {
      router.push(`/healthcalendar/period?edit=${recordId}&date=${currentDate}` as any)
    } else if (record.type === 'meal') {
      router.push(`/healthcalendar/meal?edit=${recordId}&date=${currentDate}` as any)
    } else if (record.type === 'myrecord') {
      router.push(`/healthcalendar/myrecord?edit=${recordId}&date=${currentDate}` as any)
    } else if (record.type === 'item') {
      router.push(`/healthcalendar/itemrecord?edit=${recordId}&date=${currentDate}` as any)
    } else if (record.type === 'health') {
      router.push(`/healthcalendar/health?edit=${recordId}&date=${currentDate}` as any)
    } else if (record.type === 'mood') {
      router.push(`/healthcalendar/mood?edit=${recordId}&date=${currentDate}` as any)
    } else if (record.type === 'exercise') {
      router.push(`/healthcalendar/exercise?edit=${recordId}&date=${currentDate}` as any)
    } else if (record.type === 'medication') {
      router.push(`/healthcalendar/medication?edit=${recordId}&date=${currentDate}` as any)
    } else if (record.type === 'meditation') {
      router.push(`/healthcalendar/meditation?edit=${recordId}&date=${currentDate}` as any)
    } else if (record.type === 'thought') {
      router.push(`/healthcalendar/thoughts?edit=${recordId}&date=${currentDate}` as any)
    } else if (record.type === 'checkup') {
      router.push(`/healthcalendar/checkup?edit=${recordId}&date=${currentDate}` as any)
    }
  }
  const handleDeleteClick = (record: HealthRecord) => {
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  }

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;

    const recordId = recordToDelete.id;
    setDeletingRecordId(recordId);
    setDeleteDialogOpen(false);

    try {
      // 根据记录类型调用相应的删除API
      if (poopRecordsApi.records.find(r => r.id === recordId)) {
        // 删除便便记录
        await poopRecordsApi.deleteRecord(recordId);
        toast({
          title: "删除成功",
          description: "便便记录已删除并同步到云端",
        });
      } else if (periodRecordsApi.records.find(r => r.id === recordId)) {
        // 删除生理记录
        await periodRecordsApi.deleteRecord(recordId);
        toast({
          title: "删除成功",
          description: "生理记录已删除并同步到云端",
        });
      } else if (mealRecordsApi.records.find(r => r.id === recordId)) {
        // 删除饮食记录
        await mealRecordsApi.deleteRecord(recordId);
        toast({
          title: "删除成功",
          description: "饮食记录已删除并同步到云端",
        });
      } else if (myRecordsApi.records.find(r => r.id === recordId)) {
        // 删除其他记录
        await myRecordsApi.deleteRecord(recordId);
        toast({
          title: "删除成功",
          description: "其他记录已删除并同步到云端",
        });
      } else if (itemRecordsApi.records.find(r => r.id === recordId)) {
        // 删除物品记录
        await itemRecordsApi.deleteRecord(recordId);
        toast({
          title: "删除成功",
          description: "物品记录已删除并同步到云端",
        });
      } else if (healthRecordsApi.records.find(r => r.id === recordId)) {
        // 删除健康记录
        await healthRecordsApi.deleteRecord(recordId);
        toast({
          title: "删除成功",
          description: "健康记录已删除并同步到云端",
        });
      } else if (moodRecordsApi.records.find(r => r.id === recordId)) {
        // 删除心情记录
        await moodRecordsApi.deleteRecord(recordId);
        toast({
          title: "删除成功",
          description: "心情记录已删除并同步到云端",
        });
      } else if (exerciseRecordsApi.records.find(r => r.id === recordId)) {
        // 删除运动记录
        await exerciseRecordsApi.deleteRecord(recordId);
        toast({
          title: "删除成功",
          description: "运动记录已删除并同步到云端",
        });
      } else if (medicationRecordsApi.records.find(r => r.id === recordId)) {
        // 删除用药记录
        await medicationRecordsApi.deleteRecord(recordId);
        toast({
          title: "删除成功",
          description: "用药记录已删除并同步到云端",
        });
      } else if (meditationRecordsApi.records.find(r => r.id === recordId)) {
        // 删除冥想记录
        await meditationRecordsApi.deleteRecord(recordId);
        toast({
          title: "删除成功",
          description: "冥想记录已删除并同步到云端",
        });
      } else if (thoughtRecordsApi.records.find(r => r.id === recordId)) {
        // 删除想法记录
        await thoughtRecordsApi.deleteRecord(recordId);
        toast({
          title: "删除成功",
          description: "想法记录已删除并同步到云端",
        });
      } else if (checkupRecordsApi.records.find(r => r.id === recordId)) {
        // 删除体检记录
        await checkupRecordsApi.deleteRecord(recordId);
        toast({
          title: "删除成功",
          description: "体检记录已删除并同步到云端",
        });
      } else {
        toast({
          title: "删除失败",
          description: "未找到要删除的记录",
          variant: "destructive",
        });
        return;
      }

      // 强制刷新数据以确保UI更新
      setRefreshVersion(v => v + 1);
      
    } catch (error) {
      console.error('[handleDeleteConfirm] 删除记录失败:', error);
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "删除记录时发生错误",
        variant: "destructive",
      });
    } finally {
      setDeletingRecordId(null);
      setRecordToDelete(null);
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setRecordToDelete(null);
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
                    <div className="flex items-center space-x-2">
                      {record.type === 'period' ? <Droplets className="h-4 w-4 text-red-500" /> : 
                       record.type === 'poop' ? <Activity className="h-4 w-4 text-yellow-500" /> :
                       record.type === 'meal' ? <Utensils className="h-4 w-4 text-orange-500" /> :
                       record.type === 'myrecord' ? <Heart className="h-4 w-4 text-green-500" /> :
                       record.type === 'item' ? <Package className="h-4 w-4 text-amber-500" /> :
                       record.type === 'health' ? <Stethoscope className="h-4 w-4 text-blue-500" /> :
                       record.type === 'mood' ? <Heart className="h-4 w-4 text-pink-500" /> :
                       record.type === 'exercise' ? <Dumbbell className="h-4 w-4 text-green-600" /> :
                       record.type === 'medication' ? <Pill className="h-4 w-4 text-purple-500" /> :
                       record.type === 'meditation' ? <Brain className="h-4 w-4 text-purple-600" /> :
                       record.type === 'thought' ? <Lightbulb className="h-4 w-4 text-yellow-600" /> :
                       record.type === 'checkup' ? <Stethoscope className="h-4 w-4 text-green-600" /> :
                       <FileText className="h-4 w-4 text-blue-500" />}
                      <div className={`w-3 h-3 rounded-full ${
                        record.type === 'period' ? 'bg-red-500' : 
                        record.type === 'poop' ? 'bg-yellow-500' : 
                        record.type === 'meal' ? 'bg-orange-500' :
                        record.type === 'myrecord' ? 'bg-green-500' :
                        record.type === 'item' ? 'bg-amber-500' :
                        record.type === 'health' ? 'bg-blue-500' :
                        record.type === 'mood' ? 'bg-pink-500' :
                        record.type === 'exercise' ? 'bg-green-600' :
                        record.type === 'medication' ? 'bg-purple-500' :
                        record.type === 'meditation' ? 'bg-purple-600' :
                        record.type === 'thought' ? 'bg-yellow-600' :
                        record.type === 'checkup' ? 'bg-green-600' :
                        'bg-blue-500'
                      }`}></div>
                    </div>
                    <span>{
                      record.type === 'period' ? '生理记录' : 
                      record.type === 'poop' ? '排便记录' : 
                      record.type === 'meal' ? '用餐记录' :
                      record.type === 'myrecord' ? '我的记录' :
                      record.type === 'item' ? '物品记录' :
                      record.type === 'health' ? '健康记录' :
                      record.type === 'mood' ? '心情记录' :
                      record.type === 'exercise' ? '运动记录' :
                      record.type === 'medication' ? '用药记录' :
                      record.type === 'meditation' ? '冥想记录' :
                      record.type === 'thought' ? '想法记录' :
                      record.type === 'checkup' ? '体检记录' :
                      '其他记录'
                    }</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {dayjs(record.datetime || record.createdAt).format('HH:mm')}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => handleEditRecord(record)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteClick(record)} 
                      className="text-red-600 hover:text-red-700"
                      disabled={deletingRecordId === record.id}
                    >
                      {deletingRecordId === record.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
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

                {/* Period specific details */}
                {record.type === 'period' && (
                  <div className="space-y-2">
                    {record.flow && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">流量:</span>
                        <Badge variant="outline">{getPeriodFlowLabel(record.flow)}</Badge>
                      </div>
                    )}
                    {record.pain && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">疼痛:</span>
                        <Badge variant="outline">{getPeriodPainLabel(record.pain)}</Badge>
                      </div>
                    )}
                    {record.mood && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">心情:</span>
                        <Badge variant="outline">{getPeriodMoodLabel(record.mood)}</Badge>
                      </div>
                    )}
                    {record.symptoms && record.symptoms.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">症状:</span>
                        <div className="flex flex-wrap gap-1">
                          {record.symptoms.map((symptom, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {symptom}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Meal specific details */}
                {record.type === 'meal' && (
                  <div className="space-y-2">
                    {record.mealType && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">餐次:</span>
                        <Badge variant="outline">{getMealTypeLabel(record.mealType)}</Badge>
                      </div>
                    )}
                    {record.foodTypes && record.foodTypes.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">食物类型:</span>
                        <div className="flex flex-wrap gap-1">
                          {record.foodTypes.map((foodType, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {getFoodTypeLabel(foodType)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {record.mealPortion && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">进食量:</span>
                        <Badge variant="outline">{getMealPortionLabel(record.mealPortion)}</Badge>
                      </div>
                    )}
                    {record.mealCondition && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-600">进食情况:</span>
                        <Badge variant="outline">{getMealConditionLabel(record.mealCondition)}</Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Attachments */}
                {record.attachments && record.attachments.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">附件:</h4>
                    
                    {/* 图片预览网格 */}
                    {record.attachments.filter(a => a.type.startsWith('image/') && a.url).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
                        {record.attachments
                          .filter(a => a.type.startsWith('image/') && a.url)
                          .map(attachment => (
                            <div key={attachment.id} className="relative group">
                              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-pointer">
                                <img
                                  src={attachment.url}
                                  alt={attachment.name}
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                                  onClick={() => attachment.url && setImageModalUrl(attachment.url)}
                                />
                              </div>
                              {/* 文件名 */}
                              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate rounded-b-lg">
                                {attachment.name}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                    
                    {/* 非图片附件列表 */}
                    {record.attachments.filter(a => !a.type.startsWith('image/')).length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {record.attachments
                          .filter(a => !a.type.startsWith('image/'))
                          .map(attachment => (
                            <div key={attachment.id} className="p-2 border rounded-lg">
                              <p className="text-sm font-medium">{attachment.name}</p>
                              <p className="text-xs text-gray-500">{attachment.type}</p>
                            </div>
                          ))}
                      </div>
                    )}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条{
                recordToDelete?.type === 'poop' ? '便便' : 
                recordToDelete?.type === 'period' ? '生理' : 
                recordToDelete?.type === 'meal' ? '用餐' : 
                recordToDelete?.type === 'myrecord' ? '我的' : 
                recordToDelete?.type === 'item' ? '物品' : 
                recordToDelete?.type === 'health' ? '健康' :
                recordToDelete?.type === 'mood' ? '心情' :
                recordToDelete?.type === 'exercise' ? '运动' :
                recordToDelete?.type === 'medication' ? '用药' :
                recordToDelete?.type === 'meditation' ? '冥想' :
                recordToDelete?.type === 'thought' ? '想法' :
                recordToDelete?.type === 'checkup' ? '体检' : '其他'
              }记录吗？
              <br />
              <span className="text-red-600 font-medium">此操作无法撤销。</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={deletingRecordId === recordToDelete?.id}
            >
              {deletingRecordId === recordToDelete?.id ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>删除中...</span>
                </div>
              ) : (
                "确认删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 图片放大模态框 */}
      {imageModalUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setImageModalUrl(null)}
        >
          <div className="relative max-w-4xl max-h-4xl w-full h-full flex items-center justify-center p-4">
            <img
              src={imageModalUrl}
              alt="放大图片"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-50 hover:bg-opacity-75"
              onClick={() => setImageModalUrl(null)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}