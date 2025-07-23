"use client"

import React, { useState, useRef } from 'react'
import URLExtractionModal from './url-extraction-modal'

interface MultiURLExtractorProps {
  onResult?: (result: any) => void
}

interface ExtractorInstance {
  id: string
  instanceId: string
  isProcessing: boolean
}

export default function MultiURLExtractor({ 
  onResult
}: MultiURLExtractorProps) {
  const [instances, setInstances] = useState<ExtractorInstance[]>([])
  const triggerRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  // 创建新实例
  const createInstance = () => {
    const newInstance: ExtractorInstance = {
      id: `multi-url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      instanceId: `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    if (result.sessionId) {
      setInstances(prev => prev.map(instance => 
        instance.id === result.sessionId
          ? { ...instance, isProcessing: result.type === 'url-extraction-processing' }
          : instance
      ))

      // 如果处理完成（成功或失败），自动移除实例
      if (result.type !== 'url-extraction-processing') {
        setTimeout(() => {
          removeInstance(result.sessionId)
        }, 2000) // 2秒后移除实例，给用户时间查看结果
      }
    }

    // 转发结果
    if (onResult) {
      onResult(result)
    }
  }

  return (
    <div className="multi-url-extractor">
      {/* 合并的URL提取按钮 */}
      <button 
        className="bg-transparent border-none text-indigo-500 text-sm flex items-center py-1.5 px-3 rounded-2xl cursor-pointer active:bg-indigo-50"
        onClick={createInstance}
      >
        <svg className="mr-1 w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10.59 13.41c.41.39.41 1.03 0 1.42-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0 5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.982 2.982 0 0 0 0-4.24 2.982 2.982 0 0 0-4.24 0l-3.53 3.53a2.982 2.982 0 0 0 0 4.24zm2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0 5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.982 2.982 0 0 0 0 4.24 2.982 2.982 0 0 0 4.24 0l3.53-3.53a2.982 2.982 0 0 0 0-4.24.973.973 0 0 1 0-1.42z"/>
        </svg>
        URL提取
      </button>

      {/* 为每个实例渲染一个隐藏的URLExtractionModal */}
      {instances.map((instance) => (
        <URLExtractionModal
          key={instance.id}
          sessionId={instance.id}
          instanceId={instance.instanceId}
          onResult={handleResult}
        >
          <button
            ref={(ref) => {triggerRefs.current[instance.id] = ref}}
            style={{ display: 'none' }}
          />
        </URLExtractionModal>
      ))}
    </div>
  )
}

export type { ExtractorInstance }
