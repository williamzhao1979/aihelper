"use client"

import React, { useState } from "react"
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
  X
} from "lucide-react"
import { useRouter } from "@/i18n/routing"
import PoopDetectiveIcon from "./poop-detective-icon"

interface RecordTypeSelectorProps {
  isOpen: boolean
  onClose: () => void
}

interface RecordType {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  route: string
}

export default function RecordTypeSelector({ isOpen, onClose }: RecordTypeSelectorProps) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<string | null>(null)

  const recordTypes: RecordType[] = [
    {
      id: "general",
      title: "一般健康记录",
      description: "记录身体状况、症状等",
      icon: <FileText className="h-6 w-6 text-blue-600" />,
      color: "bg-blue-50 hover:bg-blue-100 border-blue-200",
      route: "/healthcalendar/record"
    },
    {
      id: "period",
      title: "例假记录",
      description: "记录月经周期和症状",
      icon: <Activity className="h-6 w-6 text-red-600" />,
      color: "bg-red-50 hover:bg-red-100 border-red-200",
      route: "/healthcalendar/period"
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
      id: "symptom",
      title: "症状记录",
      description: "记录身体不适和症状",
      icon: <Thermometer className="h-6 w-6 text-orange-600" />,
      color: "bg-orange-50 hover:bg-orange-100 border-orange-200",
      route: "/healthcalendar/record"
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
      description: "上传健康相关照片",
      icon: <Camera className="h-6 w-6 text-indigo-600" />,
      color: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200",
      route: "/healthcalendar/record"
    },
    {
      id: "mood",
      title: "心情记录",
      description: "记录情绪和心理健康",
      icon: <Heart className="h-6 w-6 text-pink-600" />,
      color: "bg-pink-50 hover:bg-pink-100 border-pink-200",
      route: "/healthcalendar/record"
    }
  ]

  const handleTypeSelect = (type: RecordType) => {
    setSelectedType(type.id)
    // 延迟跳转，让用户看到选中效果
    setTimeout(() => {
      router.push(type.route as any)
      onClose()
      setSelectedType(null)
    }, 200)
  }

  const handleClose = () => {
    setSelectedType(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-blue-600" />
            <span>选择记录类型</span>
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
              }`}
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
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 