"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import RecordTypeSelector from "@/components/healthcalendar/shared/record-type-selector"

export default function DebugOnClosePage() {
  const [isRecordSelectorOpen, setIsRecordSelectorOpen] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const handleOpenSelector = () => {
    addLog("Opening RecordTypeSelector")
    setIsRecordSelectorOpen(true)
  }

  const handleCloseSelector = () => {
    addLog("onClose callback triggered - closing selector")
    setIsRecordSelectorOpen(false)
  }

  const clearLogs = () => {
    setDebugLogs([])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">onClose 调试页面</h1>
          <p className="text-sm text-gray-600">用于调试 RecordTypeSelector 的 onClose 函数</p>
        </div>

        {/* Controls */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>控制面板</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-4">
              <Button 
                onClick={handleOpenSelector}
                className="bg-blue-600 hover:bg-blue-700"
              >
                打开记录类型选择器
              </Button>
              <Button 
                onClick={clearLogs}
                variant="outline"
              >
                清除日志
              </Button>
            </div>
            <div className="text-sm text-gray-600">
              当前状态: {isRecordSelectorOpen ? "选择器已打开" : "选择器已关闭"}
            </div>
          </CardContent>
        </Card>

        {/* Debug Logs */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>调试日志</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
              {debugLogs.length === 0 ? (
                <p className="text-gray-500 text-sm">暂无日志</p>
              ) : (
                <div className="space-y-1">
                  {debugLogs.map((log, index) => (
                    <div key={index} className="text-sm font-mono text-gray-700">
                      {log}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
          <CardHeader>
            <CardTitle>调试说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-700">
            <p>1. 点击"打开记录类型选择器"按钮</p>
            <p>2. 尝试以下操作并观察日志：</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>点击取消按钮</li>
              <li>按 ESC 键</li>
              <li>点击对话框外部区域</li>
              <li>选择一个记录类型</li>
            </ul>
            <p>3. 观察控制台输出和页面日志</p>
            <p>4. 检查是否有重复调用或异常行为</p>
          </CardContent>
        </Card>
      </div>

      {/* Record Type Selector */}
      {isRecordSelectorOpen && (
        <RecordTypeSelector
          isOpen={isRecordSelectorOpen}
          onClose={handleCloseSelector}
          date="2024-01-15"
        />
      )}
    </div>
  )
} 