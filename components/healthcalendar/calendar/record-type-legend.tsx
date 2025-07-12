"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface RecordTypeLegendProps {
  className?: string
}

const recordTypes = [
  {
    type: "period",
    label: "生理记录",
    color: "bg-red-500",
    description: "月经周期记录"
  },
  {
    type: "poop", 
    label: "排便记录",
    color: "bg-yellow-500",
    description: "大便健康记录"
  },
  {
    type: "meal",
    label: "用餐记录", 
    color: "bg-orange-500",
    description: "饮食营养记录"
  },
  {
    type: "myrecord",
    label: "我的记录",
    color: "bg-green-500",
    description: "个人自定义记录"
  },
  {
    type: "item",
    label: "物品记录",
    color: "bg-amber-500", 
    description: "物品使用记录"
  },
  {
    type: "health",
    label: "健康记录",
    color: "bg-blue-500",
    description: "健康状况记录"
  },
  {
    type: "mood",
    label: "心情记录",
    color: "bg-pink-500",
    description: "情绪和心理健康记录"
  },
  {
    type: "checkup",
    label: "体检记录",
    color: "bg-purple-500",
    description: "体检报告记录"
  }
]

export default function RecordTypeLegend({ className }: RecordTypeLegendProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={cn("bg-white/90 backdrop-blur-sm border rounded-lg shadow-sm", className)}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-2">
          <Info className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-700">记录类型说明</span>
          <Badge variant="secondary" className="text-xs">
            {recordTypes.length}种
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 h-7 w-7 hover:bg-white/60"
        >
          {isExpanded ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* 内容区域 */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-500 mb-3 text-center">
            📍 日历中的彩色圆点表示不同类型的健康记录
          </p>
          
          {/* 图例网格 - 响应式布局 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {recordTypes.map((item) => (
              <div 
                key={item.type} 
                className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-transparent hover:border-gray-200 hover:shadow-sm group"
              >
                {/* 圆点示例 - 增加悬停效果 */}
                <div className={cn(
                  "w-3 h-3 rounded-full flex-shrink-0 transition-transform duration-200 group-hover:scale-125",
                  item.color
                )} />
                
                {/* 标签和描述 */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {item.label}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* 说明文字 */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <div className="text-blue-600 mt-0.5">💡</div>
                <div className="text-xs text-blue-700 leading-relaxed">
                  <strong>使用提示：</strong>
                  <br />• 同一天可能有多种记录类型，会显示多个圆点
                  <br />• 点击日期可查看详细记录和编辑
                  <br />• 圆点数量超过3个时会显示总数
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
