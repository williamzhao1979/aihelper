"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface CompactLegendProps {
  className?: string
}

const recordTypes = [
  { type: "period", label: "生理", color: "bg-red-500" },
  { type: "poop", label: "排便", color: "bg-yellow-500" },
  { type: "meal", label: "用餐", color: "bg-orange-500" },
  { type: "myrecord", label: "记录", color: "bg-green-500" },
  { type: "item", label: "物品", color: "bg-amber-500" },
  { type: "health", label: "健康", color: "bg-blue-500" },
  { type: "checkup", label: "体检", color: "bg-purple-500" }
]

export default function CompactLegend({ className }: CompactLegendProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-xs", className)}>
      <span className="text-gray-500 mr-1">说明：</span>
      {recordTypes.map((item) => (
        <div key={item.type} className="flex items-center space-x-1">
          <div className={cn("w-2 h-2 rounded-full", item.color)} />
          <span className="text-gray-600">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
