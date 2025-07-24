"use client"

import React, { useState, useRef } from 'react'
import ArtCritiqueModal from './art-critique-modal'

interface MultiArtCritiqueProps {
  onResult?: (result: any) => void
}

interface CritiqueInstance {
  id: string
  instanceId: string
  isProcessing: boolean
}

export default function MultiArtCritique({ 
  onResult
}: MultiArtCritiqueProps) {
  const [instances, setInstances] = useState<CritiqueInstance[]>([])
  const triggerRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  // 创建新实例
  const createInstance = () => {
    const newInstance: CritiqueInstance = {
      id: `multi-art-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      instanceId: `art-instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
          ? { ...instance, isProcessing: result.type === 'art-critique-processing' }
          : instance
      ))

      // 如果处理完成（成功或失败），自动移除实例
      if (result.type !== 'art-critique-processing') {
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
    <div className="multi-art-critique">
      {/* 绘画点评按钮 */}
      <button 
        className="bg-transparent border-none text-orange-500 text-sm flex items-center py-1.5 px-3 rounded-2xl cursor-pointer active:bg-orange-50"
        onClick={createInstance}
      >
        <svg className="mr-1 w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7H14A7,7 0 0,1 21,14H22A1,1 0 0,1 23,15V18A1,1 0 0,1 22,19H21V20A2,2 0 0,1 19,22H5A2,2 0 0,1 3,20V19H2A1,1 0 0,1 1,18V15A1,1 0 0,1 2,14H3A7,7 0 0,1 10,7H11V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M7.5,13A2.5,2.5 0 0,0 5,15.5A2.5,2.5 0 0,0 7.5,18A2.5,2.5 0 0,0 10,15.5A2.5,2.5 0 0,0 7.5,13M16.5,13A2.5,2.5 0 0,0 14,15.5A2.5,2.5 0 0,0 16.5,18A2.5,2.5 0 0,0 19,15.5A2.5,2.5 0 0,0 16.5,13Z"/>
        </svg>
        绘画点评
      </button>

      {/* 为每个实例渲染一个隐藏的ArtCritiqueModal */}
      {instances.map((instance) => (
        <ArtCritiqueModal
          key={instance.id}
          onResult={handleResult}
        >
          <button
            ref={(ref) => {triggerRefs.current[instance.id] = ref}}
            style={{ display: 'none' }}
          />
        </ArtCritiqueModal>
      ))}
    </div>
  )
}

export type { CritiqueInstance }
