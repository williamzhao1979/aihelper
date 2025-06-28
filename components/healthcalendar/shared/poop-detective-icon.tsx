"use client"

import React from "react"

interface PoopDetectiveIconProps {
  className?: string
  size?: number
}

export default function PoopDetectiveIcon({ className = "", size = 16 }: PoopDetectiveIconProps) {
  return (
    <div 
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* 动漫风便便主体 - 棕色云朵形状 */}
      <div className="w-full h-full bg-yellow-600 rounded-full relative overflow-hidden">
        {/* 便便顶部的小尖尖 */}
        <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-yellow-600 rounded-full"></div>
        
        {/* 便便的纹理线条 */}
        <div className="absolute top-1 left-1 w-1 h-0.5 bg-yellow-700 rounded-full opacity-60"></div>
        <div className="absolute top-2 right-1 w-0.5 h-0.5 bg-yellow-700 rounded-full opacity-60"></div>
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-0.5 bg-yellow-700 rounded-full opacity-60"></div>
        
        {/* 可爱的眼睛 */}
        <div className="absolute top-1.5 left-1 w-1 h-1 bg-white rounded-full">
          <div className="absolute top-0.5 left-0.5 w-0.5 h-0.5 bg-black rounded-full"></div>
        </div>
        <div className="absolute top-1.5 right-1 w-1 h-1 bg-white rounded-full">
          <div className="absolute top-0.5 left-0.5 w-0.5 h-0.5 bg-black rounded-full"></div>
        </div>
        
        {/* 可爱的嘴巴 */}
        <div className="absolute bottom-1.5 left-1/2 transform -translate-x-1/2 w-1 h-0.5 border-b-2 border-yellow-800 rounded-full"></div>
        
        {/* 高光效果 */}
        <div className="absolute top-0.5 left-0.5 w-0.5 h-0.5 bg-yellow-300 rounded-full opacity-80"></div>
      </div>
    </div>
  )
} 