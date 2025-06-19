"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"

type ChatVersion = "v1" | "v2"

export function useVersion() {
  const [version, setVersion] = useState<ChatVersion>('v2') // 默认 v2
  const [isLoading, setIsLoading] = useState(true)
  const { data: session } = useSession()

  // 初始化版本设置
  useEffect(() => {
    const initializeVersion = async () => {
      try {
        // 首先检查 localStorage
        const localVersion = localStorage.getItem('chat-version') as ChatVersion
        
        if (localVersion && (localVersion === 'v1' || localVersion === 'v2')) {
          setVersion(localVersion)
        }

        // 如果用户已登录，尝试从服务器获取设置
        if (session?.user) {
          try {
            const response = await fetch('/api/user/preferences')
            if (response.ok) {
              const data = await response.json()
              if (data.chatVersion) {
                setVersion(data.chatVersion)
                // 同步到本地存储
                localStorage.setItem('chat-version', data.chatVersion)
              }
            }
          } catch (error) {
            console.error('Failed to fetch user preferences:', error)
          }
        }
      } catch (error)\
