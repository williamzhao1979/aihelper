"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectItem, SelectTrigger, SelectContent } from "@/components/ui/select"
import { Calendar as CalendarIcon, Search, Users, RefreshCw, ArrowLeft } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"
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
import { useGlobalUserSelection } from "@/hooks/use-global-user-selection"
import { SingleUserSelector } from "@/components/healthcalendar/shared/single-user-selector"
import type { UserProfile } from "@/components/healthcalendar/shared/user-selector"
import dayjs from "dayjs"

const PAGE_SIZE = 20

function getRecordTypeInfo(record: any) {
  switch (record.type) {
    case "period":
      return { icon: <CalendarIcon className="h-4 w-4" />, color: "bg-red-50", dotColor: "bg-red-500", title: "生理记录" }
    case "poop":
      return { icon: <CalendarIcon className="h-4 w-4" />, color: "bg-yellow-50", dotColor: "bg-yellow-500", title: "排便记录" }
    case "meal":
      return { icon: <CalendarIcon className="h-4 w-4" />, color: "bg-orange-50", dotColor: "bg-orange-500", title: "用餐记录" }
    case "myrecord":
      return { icon: <CalendarIcon className="h-4 w-4" />, color: "bg-green-50", dotColor: "bg-green-500", title: "我的记录" }
    case "item":
      return { icon: <CalendarIcon className="h-4 w-4" />, color: "bg-amber-50", dotColor: "bg-amber-500", title: "物品记录" }
    case "health":
      return { icon: <CalendarIcon className="h-4 w-4" />, color: "bg-blue-50", dotColor: "bg-blue-500", title: "健康记录" }
    case "checkup":
      return { icon: <CalendarIcon className="h-4 w-4" />, color: "bg-purple-50", dotColor: "bg-purple-500", title: "体检记录" }
    case "thought":
      return { icon: <CalendarIcon className="h-4 w-4" />, color: "bg-yellow-50", dotColor: "bg-yellow-600", title: "想法记录" }
    case "medication":
      return { icon: <CalendarIcon className="h-4 w-4" />, color: "bg-purple-50", dotColor: "bg-purple-500", title: "用药记录" }
    case "meditation":
      return { icon: <CalendarIcon className="h-4 w-4" />, color: "bg-purple-50", dotColor: "bg-purple-500", title: "冥想记录" }
    case "exercise":
      return { icon: <CalendarIcon className="h-4 w-4" />, color: "bg-green-50", dotColor: "bg-green-500", title: "运动记录" }
    case "mood":
      return { icon: <CalendarIcon className="h-4 w-4" />, color: "bg-pink-50", dotColor: "bg-pink-500", title: "心情记录" }
    default:
      return { icon: <CalendarIcon className="h-4 w-4" />, color: "bg-gray-50", dotColor: "bg-gray-500", title: "其他记录" }
  }
}

export default function ViewRecordsPage() {
  const t = useTranslations()
  const router = useRouter()
  const { users: availableUsers, getPrimaryUser } = useUserManagement()
  const { selectedUsers, updateSelectedUsers } = useGlobalUserSelection()
  const currentUser = useMemo(() => selectedUsers[0] || getPrimaryUser(), [selectedUsers, getPrimaryUser])

  // 记录类型选项
  const recordTypeOptions = [
    { value: "all", label: t("healthcalendar.all", { defaultValue: "全部类型" }) },
    { value: "period", label: t("healthcalendar.period", { defaultValue: "生理记录" }) },
    { value: "poop", label: t("healthcalendar.poop", { defaultValue: "排便记录" }) },
    { value: "meal", label: t("healthcalendar.meal", { defaultValue: "用餐记录" }) },
    { value: "myrecord", label: t("healthcalendar.myrecord", { defaultValue: "我的记录" }) },
    { value: "item", label: t("healthcalendar.item", { defaultValue: "物品记录" }) },
    { value: "health", label: t("healthcalendar.health", { defaultValue: "健康记录" }) },
    { value: "checkup", label: t("healthcalendar.checkup", { defaultValue: "体检记录" }) },
    { value: "thought", label: t("healthcalendar.thought", { defaultValue: "想法记录" }) },
    { value: "medication", label: t("healthcalendar.medication", { defaultValue: "用药记录" }) },
    { value: "meditation", label: t("healthcalendar.meditation", { defaultValue: "冥想记录" }) },
    { value: "exercise", label: t("healthcalendar.exercise", { defaultValue: "运动记录" }) },
    { value: "mood", label: t("healthcalendar.mood", { defaultValue: "心情记录" }) },
  ]

  // 检索条件
  const [type, setType] = useState("")
  const [keyword, setKeyword] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)

  // 记录聚合
  const poopRecords = usePoopRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "").records
  const periodRecords = usePeriodRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "").records
  const mealRecords = useMealRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "").records
  const myRecords = useMyRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "").records
  const itemRecords = useItemRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "").records
  const healthRecords = useHealthRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "").records
  const moodRecords = useMoodRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "").records
  const medicationRecords = useMedicationRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "").records
  const meditationRecords = useMeditationRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "").records
  const thoughtRecords = useThoughtRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "").records
  const checkupRecords = useCheckupRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "").records
  const exerciseRecords = useExerciseRecords(currentUser?.uniqueOwnerId || "", currentUser?.uniqueOwnerId || "").records

  const allRecords = useMemo(() => [
    ...poopRecords,
    ...periodRecords,
    ...mealRecords,
    ...myRecords,
    ...itemRecords,
    ...healthRecords,
    ...moodRecords,
    ...medicationRecords,
    ...meditationRecords,
    ...thoughtRecords,
    ...checkupRecords,
    ...exerciseRecords,
  ], [poopRecords, periodRecords, mealRecords, myRecords, itemRecords, healthRecords, moodRecords, medicationRecords, meditationRecords, thoughtRecords, checkupRecords, exerciseRecords])

  // 过滤
  const filteredRecords = useMemo(() => {
    return allRecords.filter(record => {
      if (type !== "all" && record.type !== type) return false
      if (keyword && !record.content?.toLowerCase().includes(keyword.toLowerCase())) return false
      if (dateFrom && dayjs(record.date).isBefore(dayjs(dateFrom))) return false
      if (dateTo && dayjs(record.date).isAfter(dayjs(dateTo))) return false
      return true
    })
    .sort((a, b) => new Date(b.datetime || b.date).getTime() - new Date(a.datetime || a.date).getTime())
  }, [allRecords, type, keyword, dateFrom, dateTo])

  // 分页
  const pagedRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredRecords.slice(start, start + PAGE_SIZE)
  }, [filteredRecords, page])

  // 处理卡片点击
  const handleViewRecord = (record: any) => {
    router.push(`/healthcalendar/${record.type}?date=${record.date}&edit=${record.id}` as any)
    localStorage.setItem('editRecordId', record.id)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center space-x-2 text-lg">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="p-2 mr-1">
              <ArrowLeft className="h-5 w-5 text-blue-600" />
            </Button>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5 text-blue-600" />
              <span>{t("healthcalendar.search.title", { defaultValue: "检索健康记录" })}</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <Select value={type} onValueChange={setType} defaultValue="all">
              <SelectTrigger className="w-36" />
              <SelectContent>
                {recordTypeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-36"
              placeholder={t("healthcalendar.dateFrom", { defaultValue: "起始日期" })}
            />
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-36"
              placeholder={t("healthcalendar.dateTo", { defaultValue: "结束日期" })}
            />
            <Input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="w-48"
              placeholder={t("healthcalendar.searchKeyword", { defaultValue: "关键字" })}
            />
            <SingleUserSelector
              users={availableUsers}
              selectedUser={currentUser}
              onChange={user => updateSelectedUsers([user])}
            />
            <Button
              variant="outline"
              onClick={() => { setType(""); setKeyword(""); setDateFrom(""); setDateTo(""); setPage(1); }}
            >
              {t("healthcalendar.reset", { defaultValue: "重置" })}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t("healthcalendar.search.result", { defaultValue: "检索结果" })}</CardTitle>
            <span className="text-sm text-gray-500">{t("healthcalendar.search.total", { defaultValue: "共 {count} 条", count: filteredRecords.length })}</span>
          </div>
        </CardHeader>
        <CardContent>
          {pagedRecords.length === 0 ? (
            <div className="text-center py-8">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">{t("healthcalendar.search.empty", { defaultValue: "暂无记录" })}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pagedRecords.map((record) => {
                const typeInfo = getRecordTypeInfo(record)
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
                              {(record as any).ownerName || (record as any).nickname || t("unknownUser", { defaultValue: "未知用户" })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{dayjs(record.datetime || record.date).format("YYYY-MM-DD HH:mm")}</p>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      {t("view", { defaultValue: "查看" })}
                    </Button>
                  </div>
                )
              })}
              {/* 分页按钮 */}
              <div className="flex justify-between items-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  {t("healthcalendar.prevPage", { defaultValue: "上一页" })}
                </Button>
                <span className="text-xs text-gray-500">{t("healthcalendar.page", { defaultValue: "第 {page} 页", page })}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * PAGE_SIZE >= filteredRecords.length}
                  onClick={() => setPage(p => p + 1)}
                >
                  {t("healthcalendar.nextPage", { defaultValue: "下一页" })}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 