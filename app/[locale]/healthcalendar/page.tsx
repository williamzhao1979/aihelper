"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Calendar, Heart, Activity } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import HealthCalendar from "@/components/healthcalendar/calendar/health-calendar"
import RecordTypeSelector from "@/components/healthcalendar/shared/record-type-selector"

export default function HealthCalendarPage() {
  const router = useRouter()
  const [isRecordSelectorOpen, setIsRecordSelectorOpen] = useState(false)

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
                <p className="text-lg font-semibold text-gray-900">12</p>
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
                <p className="text-lg font-semibold text-gray-900">28</p>
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
                <p className="text-lg font-semibold text-gray-900">28天</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>健康日历</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <HealthCalendar />
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