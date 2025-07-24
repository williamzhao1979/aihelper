"use client"

import React, { useState, useRef } from 'react'
import TextEditModal from './text-edit-modal'

interface MultiTextEditProps {
  onResult?: (result: any) => void
}

interface TextEditInstance {
  id: string
  instanceId: string
  isProcessing: boolean
}

export default function MultiTextEdit({ 
  onResult
}: MultiTextEditProps) {
  const [instances, setInstances] = useState<TextEditInstance[]>([])
  const triggerRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  // 创建新实例
  const createInstance = () => {
    const newInstance: TextEditInstance = {
      id: `multi-text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      instanceId: `text-instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isProcessing: false
    }

    setInstances(prev => [...prev, newInstance])

    // 自动打开新创建的实例
    setTimeout(() => {
      const triggerButton = triggerRefs.current[newInstance.id]
      if (triggerButton) {
        triggerButton.click()
      }
    }, 200) // 增加延迟确保DOM更新完成
  }

  // 移除实例
  const removeInstance = (instanceId: string) => {
    setInstances(prev => prev.filter(instance => instance.id !== instanceId))
  }

  // 处理结果
  const handleResult = (result: any) => {
    // 更新实例状态
    if (result.requestId) {
      setInstances(prev => prev.map(instance => 
        instance.id === result.requestId
          ? { ...instance, isProcessing: result.type === 'text-edit-processing' }
          : instance
      ))

      // 如果处理完成（成功或失败），自动移除实例
      if (result.type !== 'text-edit-processing') {
        setTimeout(() => {
          removeInstance(result.requestId)
        }, 2000) // 2秒后移除实例，给用户时间查看结果
      }
    }

    // 转发结果
    if (onResult) {
      onResult(result)
    }
  }

  return (
    <div className="multi-text-edit">
      {/* 文章修改按钮 */}
      <button 
        className="bg-transparent border-none text-purple-500 text-sm flex items-center py-1.5 px-3 rounded-2xl cursor-pointer active:bg-purple-50"
        onClick={createInstance}
      >
        <svg className="mr-1 w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
        </svg>
        文章修改
      </button>

      {/* 为每个实例渲染一个隐藏的TextEditModal */}
      {instances.map((instance) => (
        <TextEditModal
          key={instance.id}
          onResult={handleResult}
        >
          <button
            ref={(ref) => {triggerRefs.current[instance.id] = ref}}
            style={{ display: 'none' }}
          />
        </TextEditModal>
      ))}
    </div>
  )
}

export type { TextEditInstance }
