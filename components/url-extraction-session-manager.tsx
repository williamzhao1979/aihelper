"use client"

import React, { useState, useCallback } from 'react'
import URLExtractionModal from './url-extraction-modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'

interface URLExtractionSession {
  id: string
  instanceId: string
  isActive: boolean
  isProcessing: boolean
  createdAt: Date
}

interface URLExtractionSessionManagerProps {
  onResult?: (result: any) => void
  children?: React.ReactNode
  maxSessions?: number
}

export default function URLExtractionSessionManager({ 
  onResult, 
  children,
  maxSessions = 5 
}: URLExtractionSessionManagerProps) {
  const [sessions, setSessions] = useState<URLExtractionSession[]>([])

  // 创建新会话
  const createNewSession = useCallback(() => {
    if (sessions.length >= maxSessions) {
      console.warn(`已达到最大会话数限制: ${maxSessions}`)
      return null
    }

    const newSession: URLExtractionSession = {
      id: `url-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      instanceId: `url-instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isActive: true,
      isProcessing: false,
      createdAt: new Date()
    }

    setSessions(prev => [...prev, newSession])
    return newSession
  }, [sessions.length, maxSessions])

  // 关闭会话
  const closeSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(session => session.id !== sessionId))
  }, [])

  // 更新会话状态
  const updateSessionStatus = useCallback((sessionId: string, isProcessing: boolean) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, isProcessing }
        : session
    ))
  }, [])

  // 处理结果回调
  const handleResult = useCallback((result: any) => {
    // 更新会话状态
    if (result.sessionId) {
      if (result.type === 'url-extraction-processing') {
        updateSessionStatus(result.sessionId, true)
      } else {
        updateSessionStatus(result.sessionId, false)
      }
    }

    // 转发结果给父组件
    if (onResult) {
      onResult(result)
    }
  }, [onResult, updateSessionStatus])

  // 处理开始回调
  const handleProcessingStart = useCallback(() => {
    // 可以在这里添加全局处理开始逻辑
  }, [])

  return (
    <div className="url-extraction-session-manager">
      {/* 主要的触发按钮或组件 */}
      {children}

      {/* 活跃会话指示器 */}
      {sessions.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          <div className="bg-white rounded-lg shadow-lg border p-3 max-w-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                URL提取器会话 ({sessions.length}/{maxSessions})
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={createNewSession}
                disabled={sessions.length >= maxSessions}
                className="h-6 w-6 p-0"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="space-y-1">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={session.isProcessing ? "default" : "secondary"}
                      className="h-4 text-xs"
                    >
                      {session.instanceId.slice(-8)}
                    </Badge>
                    {session.isProcessing && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => closeSession(session.id)}
                    className="h-4 w-4 p-0 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 为每个会话渲染一个URLExtractionModal */}
      {sessions.map((session) => (
        <URLExtractionModal
          key={session.id}
          sessionId={session.id}
          instanceId={session.instanceId}
          onResult={handleResult}
          onProcessingStart={handleProcessingStart}
        >
          {/* 这个按钮会自动隐藏，因为我们通过会话管理器控制 */}
          <div style={{ display: 'none' }} />
        </URLExtractionModal>
      ))}
    </div>
  )
}

// 导出类型供其他组件使用
export type { URLExtractionSession }
