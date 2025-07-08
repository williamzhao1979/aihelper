"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Activity, 
  Heart, 
  Stethoscope, 
  Thermometer, 
  Pill,
  Camera,
  Plus,
  X,
  Utensils,
  Dumbbell,
  MoreHorizontal
} from "lucide-react"
import { useRouter } from "@/i18n/routing"
import PoopDetectiveIcon from "./poop-detective-icon"

interface RecordTypeSelectorProps {
  isOpen: boolean
  onClose: () => void
  date?: string
}

interface RecordType {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  route: string
}

export default function RecordTypeSelector({ isOpen, onClose, date }: RecordTypeSelectorProps) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [isNavigating, setIsNavigating] = useState(false)

  // 调试日志：组件状态变化
  useEffect(() => {
    console.log("RecordTypeSelector - isOpen changed:", isOpen)
  }, [isOpen])

  // 调试日志：导航状态变化
  useEffect(() => {
    console.log("RecordTypeSelector - isNavigating changed:", isNavigating)
  }, [isNavigating])

  const recordTypes: RecordType[] = [
    {
      id: "meals",
      title: "一日三餐",
      description: "记录每日饮食情况",
      icon: <Utensils className="h-6 w-6 text-emerald-600" />,
      color: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
      route: "/healthcalendar/meal"
    },
    {
      id: "poop",
      title: "排便记录",
      description: "记录排便情况和健康",
      icon: <PoopDetectiveIcon size={24} />,
      color: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200",
      route: "/healthcalendar/poop"
    },
    {
      id: "general",
      title: "健康记录",
      description: "记录身体状况、症状等",
      icon: <FileText className="h-6 w-6 text-blue-600" />,
      color: "bg-blue-50 hover:bg-blue-100 border-blue-200",
      route: "/healthcalendar/record"
    },
    {
      id: "exercise",
      title: "运动记录",
      description: "记录运动锻炼情况",
      icon: <Dumbbell className="h-6 w-6 text-cyan-600" />,
      color: "bg-cyan-50 hover:bg-cyan-100 border-cyan-200",
      route: "/healthcalendar/record"
    },
    {
      id: "mood",
      title: "心情记录",
      description: "记录情绪和心理健康",
      icon: <Heart className="h-6 w-6 text-pink-600" />,
      color: "bg-pink-50 hover:bg-pink-100 border-pink-200",
      route: "/healthcalendar/record"
    },
    {
      id: "period",
      title: "生理记录",
      description: "记录生理周期和症状",
      icon: <Activity className="h-6 w-6 text-red-600" />,
      color: "bg-red-50 hover:bg-red-100 border-red-200",
      route: "/healthcalendar/period"
    },
    {
      id: "medication",
      title: "用药记录",
      description: "记录药物使用情况",
      icon: <Pill className="h-6 w-6 text-purple-600" />,
      color: "bg-purple-50 hover:bg-purple-100 border-purple-200",
      route: "/healthcalendar/record"
    },
    {
      id: "checkup",
      title: "体检记录",
      description: "记录体检报告和结果",
      icon: <Stethoscope className="h-6 w-6 text-green-600" />,
      color: "bg-green-50 hover:bg-green-100 border-green-200",
      route: "/healthcalendar/record"
    },
    {
      id: "photo",
      title: "照片记录",
      description: "上传照片",
      icon: <Camera className="h-6 w-6 text-indigo-600" />,
      color: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200",
      route: "/healthcalendar/record"
    },
    {
      id: "other",
      title: "其他记录",
      description: "记录其他信息",
      icon: <MoreHorizontal className="h-6 w-6 text-gray-600" />,
      color: "bg-gray-50 hover:bg-gray-100 border-gray-200",
      route: "/healthcalendar/record"
    }
  ]

  const handleTypeSelect = (type: RecordType) => {
    console.log("handleTypeSelect called with type:", type.id)
    console.log("Current isNavigating state:", isNavigating)
    
    if (isNavigating) {
      console.log("Navigation already in progress, ignoring selection")
      return
    }

    setSelectedType(type.id)
    setIsNavigating(true)
    
    setTimeout(() => {
      let targetRoute = type.route
      if (date) {
        if (targetRoute.startsWith('/healthcalendar/')) {
          // 添加日期参数
          targetRoute += `?date=${date}`
          // 添加当前时间参数
          const currentTime = new Date().toTimeString().slice(0, 5) // HH:MM格式
          targetRoute += `&time=${currentTime}`
        }
      }
      console.log("Navigating to:", targetRoute)
      
      try {
        router.push(targetRoute as any)
        console.log("Navigation initiated successfully")
      } catch (error) {
        console.error("Navigation error:", error)
        setIsNavigating(false)
        setSelectedType(null)
      }
    }, 200)
  }

  const handleClose = () => {
    console.log("handleClose called")
    console.log("Current isNavigating state:", isNavigating)
    console.log("Current selectedType:", selectedType)
    
    // 如果正在导航中，不执行关闭操作
    if (isNavigating) {
      console.log("Navigation in progress, skipping close operation")
      return
    }
    
    setSelectedType(null)
    console.log("Calling onClose callback")
    onClose()
  }

  const handleOpenChange = (open: boolean) => {
    console.log("Dialog onOpenChange called with:", open)
    console.log("Current isOpen prop:", isOpen)
    console.log("Current isNavigating state:", isNavigating)
    
    if (!open && !isNavigating) {
      handleClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] overflow-y-auto" 
        onEscapeKeyDown={() => {
          console.log("ESC key pressed")
          if (!isNavigating) handleClose()
        }} 
        onInteractOutside={() => {
          console.log("Interact outside detected")
          if (!isNavigating) handleClose()
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-blue-600" />
            <span>选择记录类型</span>
            {isNavigating && (
              <span className="text-sm text-gray-500">(导航中...)</span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          {recordTypes.map((type) => (
            <Card
              key={type.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md border-2 ${
                selectedType === type.id 
                  ? 'ring-2 ring-blue-500 shadow-lg' 
                  : type.color
              } ${isNavigating ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => handleTypeSelect(type)}
            >
              <CardContent className="p-4 text-center">
                <div className="flex flex-col items-center space-y-2">
                  <div className={`p-2 rounded-full ${
                    selectedType === type.id ? 'bg-blue-100' : 'bg-white/80'
                  }`}>
                    {type.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-gray-900 leading-tight">
                      {type.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      {type.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => {
              console.log("Cancel button clicked")
              if (!isNavigating) handleClose()
            }}
            disabled={isNavigating}
          >
            取消
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 