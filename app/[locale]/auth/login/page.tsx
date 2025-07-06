"use client"

import { useAuth } from "@/components/auth/auth-context"
import { LoginForm } from "@/components/auth/login-form"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function EnvLoginPage() {
  const { login } = useAuth()
  const router = useRouter()

  // 添加调试信息
  useEffect(() => {
    console.log('[Login Page] 页面加载')
    console.log('[Login Page] 当前URL:', window.location.href)
    console.log('[Login Page] 查询参数:', window.location.search)
    
    const urlParams = new URLSearchParams(window.location.search)
    const callbackUrl = urlParams.get("callbackUrl")
    console.log('[Login Page] callbackUrl:', callbackUrl)
  }, [])

  const handleLogin = async (username: string, password: string) => {
    try {
      console.log('[Login] 开始登录流程')
      console.log('[Login] 用户名:', username)
      console.log('[Login] 当前页面URL:', window.location.href)
      console.log('[Login] 查询参数:', window.location.search)
      
      await login(username, password)
      
      console.log('[Login] 登录API调用成功，等待状态更新...')
      
      // 等待一小段时间确保认证状态已更新
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // 登录成功，重定向到原页面或首页
      const urlParams = new URLSearchParams(window.location.search)
      let callbackUrl = urlParams.get("callbackUrl")
      
      console.log('[Login] 登录成功，准备跳转')
      console.log('[Login] callbackUrl (原始):', callbackUrl)
      console.log('[Login] 当前URL:', window.location.href)
      
      if (callbackUrl) {
        // 解码 URL 编码的回调地址
        try {
          callbackUrl = decodeURIComponent(callbackUrl)
        } catch (e) {
          console.warn('[Login] URL解码失败:', e)
        }
        
        console.log('[Login] callbackUrl (解码后):', callbackUrl)
        
        // 确保回调URL是绝对路径或相对路径
        if (!callbackUrl.startsWith('/')) {
          callbackUrl = '/' + callbackUrl
        }
        
        console.log('[Login] 最终跳转URL:', callbackUrl)
        
        // 使用window.location.href进行强制跳转
        setTimeout(() => {
          console.log('[Login] 执行跳转到:', callbackUrl)
          console.log('[Login] 使用window.location.href进行跳转')
          window.location.href = callbackUrl!
        }, 100)
      } else {
        console.log('[Login] 没有callbackUrl，跳转到首页')
        // 如果没有回调URL，跳转到首页
        setTimeout(() => {
          console.log('[Login] 执行跳转到首页')
          console.log('[Login] 使用window.location.href进行跳转')
          window.location.href = "/"
        }, 100)
      }
    } catch (error) {
      console.error('[Login] 登录失败:', error)
      // 错误处理由 LoginForm 组件处理
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <LoginForm onSubmit={handleLogin} />
    </div>
  )
} 