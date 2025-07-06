"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react"

interface LoginFormProps {
  onSubmit: (username: string, password: string) => Promise<void>
  title?: string
  subtitle?: string
  showTestAccounts?: boolean
  className?: string
}

export function LoginForm({
  onSubmit,
  title,
  subtitle,
  showTestAccounts = true,
  className = ""
}: LoginFormProps) {
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      console.log('[LoginForm] 开始提交登录表单')
      await onSubmit(formData.username, formData.password)
      console.log('[LoginForm] 登录表单提交成功')
    } catch (error) {
      console.error('[LoginForm] 登录表单提交失败:', error)
      
      // 更详细的错误处理
      let errorMessage = t("auth.loginFailedRetry")
      
      if (error instanceof Error) {
        // 直接使用来自AuthContext的错误消息，因为它们已经是友好的中文消息
        errorMessage = error.message
        
        // 只有在错误消息是英文或者特殊情况时才进行转换
        if (error.message === "Login failed" || error.message === "Failed to fetch") {
          errorMessage = "登录失败，请检查用户名密码或网络连接"
        } else if (error.message.includes('JSON') || error.message.includes('Unexpected token')) {
          errorMessage = "服务器响应格式错误，请稍后重试"
        } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
          errorMessage = "网络连接失败，请检查网络连接"
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleSubmit(e as any)
    }
  }

  return (
    <Card className={`w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm ${className}`}>
      <CardHeader className="text-center space-y-2">
        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {title || t("auth.title")}
        </CardTitle>
        <p className="text-sm text-gray-600">{subtitle || t("auth.subtitle")}</p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-gray-700">
              {t("auth.username")}
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="username"
                type="text"
                placeholder={t("auth.usernamePlaceholder")}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                onKeyPress={handleKeyPress}
                className="pl-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              {t("auth.password")}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={t("auth.passwordPlaceholder")}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onKeyPress={handleKeyPress}
                className="pl-10 pr-10 h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.loggingIn")}
              </>
            ) : (
              t("auth.login")
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
} 