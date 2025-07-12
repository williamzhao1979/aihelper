"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2, User, Lock, Phone, MessageSquare, ArrowRight, Check } from "lucide-react"

interface LoginHealthProps {
  onSubmit: (username: string, password: string) => Promise<void>
  title?: string
  subtitle?: string
  className?: string
}

export function LoginHealth({
  onSubmit,
  title,
  subtitle,
  className = ""
}: LoginHealthProps) {
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [loginType, setLoginType] = useState<'username' | 'phone'>('username')
  const [showSuccess, setShowSuccess] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    phone: "",
    verificationCode: "",
    remember: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      console.log('[LoginHealth] 开始提交登录表单')
      // 使用用户名或手机号进行登录
      const loginField = loginType === 'username' ? formData.username : formData.phone
      await onSubmit(loginField, formData.password)
      
      // 显示成功消息
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
      }, 3000)
      
      console.log('[LoginHealth] 登录表单提交成功')
    } catch (error) {
      console.error('[LoginHealth] 登录表单提交失败:', error)
      
      let errorMessage = "登录失败，请重试"
      
      if (error instanceof Error) {
        errorMessage = error.message
        
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

  const handleSocialLogin = (platform: string) => {
    const platforms = {
      apple: t("auth.appleLogin"),
      wechat: t("auth.wechatLogin"),
      google: t("auth.googleLogin")
    }
    alert(`即将跳转至${platforms[platform as keyof typeof platforms]}授权`)
  }

  return (
    <>
      {/* 健康背景元素 */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 opacity-8">
        <div className="absolute top-[10%] left-[5%] text-6xl text-orange-400 opacity-40">
          🍎
        </div>
        <div className="absolute top-[25%] right-[7%] text-6xl text-red-400 opacity-40">
          💓
        </div>
        <div className="absolute bottom-[15%] left-[10%] text-6xl text-green-400 opacity-40">
          🏃
        </div>
        <div className="absolute bottom-[30%] right-[15%] text-6xl text-orange-500 opacity-40">
          🥕
        </div>
      </div>

      {/* 成功提示 */}
      {showSuccess && (
        <div className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-8 py-4 rounded-full font-semibold shadow-lg z-50 flex items-center gap-2 animate-in slide-in-from-top-2">
          <Check className="w-5 h-5" />
          {t("auth.loginSuccess")}
        </div>
      )}

      <div className={`w-full max-w-md bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden transition-transform duration-400 hover:-translate-y-1 ${className}`}>
        {/* 顶部健康插画区域 */}
        <div className="h-48 bg-gradient-to-br from-orange-400 to-emerald-400 relative overflow-hidden flex justify-center items-center px-5">
          <div className="flex gap-8">
            {['🍎', '🏃', '💓', '🥕'].map((icon, index) => (
              <div
                key={index}
                className="w-16 h-16 bg-white/25 rounded-full flex justify-center items-center text-2xl text-white shadow-lg animate-bounce"
                style={{ animationDelay: `${index * 0.5}s` }}
              >
                {icon}
              </div>
            ))}
          </div>
        </div>

        {/* 登录表单区域 */}
        <div className="p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              {title || t("auth.title")}
            </h1>
            <p className="text-gray-600">
              {subtitle || t("auth.subtitle")}
            </p>
          </div>

          {/* 登录方式切换 */}
          <div className="flex bg-gray-50 rounded-2xl p-1.5 mb-6 shadow-inner">
            <button
              type="button"
              onClick={() => setLoginType('username')}
              className={`flex-1 text-center py-3 px-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                loginType === 'username'
                  ? 'bg-white text-orange-500 shadow-md -translate-y-0.5'
                  : 'text-gray-500'
              }`}
            >
              <User className="w-4 h-4" />
              {t("auth.usernameLogin")}
            </button>
            <button
              type="button"
              onClick={() => setLoginType('phone')}
              className={`flex-1 text-center py-3 px-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                loginType === 'phone'
                  ? 'bg-white text-orange-500 shadow-md -translate-y-0.5'
                  : 'text-gray-500'
              }`}
            >
              <Phone className="w-4 h-4" />
              {t("auth.phoneLogin")}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 表单内容区域 */}
            <div className="min-h-[200px] relative">
              {/* 用户名登录表单 */}
              <div className={`absolute top-0 left-0 w-full transition-all duration-500 ${
                loginType === 'username' 
                  ? 'opacity-100 translate-y-0 pointer-events-auto' 
                  : 'opacity-0 translate-y-5 pointer-events-none'
              }`}>
                <div className="space-y-5">
                  <div>
                    <Label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                      <User className="w-4 h-4 text-emerald-500" />
                      {t("auth.username")}
                    </Label>
                    <Input
                      type="text"
                      placeholder={t("auth.usernamePlaceholder")}
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl text-base transition-all duration-300 bg-gray-50 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20"
                      required={loginType === 'username'}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div>
                    <Label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                      <Lock className="w-4 h-4 text-emerald-500" />
                      {t("auth.password")}
                    </Label>
                    <Input
                      type="password"
                      placeholder={t("auth.passwordPlaceholder")}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl text-base transition-all duration-300 bg-gray-50 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <label className="flex items-center gap-2 text-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.remember}
                        onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                        className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400"
                      />
                      {t("auth.rememberMe")}
                    </label>
                    <a href="#" className="text-orange-500 font-medium hover:opacity-80 transition-opacity">
                      {t("auth.forgotPassword")}
                    </a>
                  </div>
                </div>
              </div>

              {/* 手机号登录表单 */}
              <div className={`absolute top-0 left-0 w-full transition-all duration-500 ${
                loginType === 'phone' 
                  ? 'opacity-100 translate-y-0 pointer-events-auto' 
                  : 'opacity-0 translate-y-5 pointer-events-none'
              }`}>
                <div className="space-y-5">
                  <div>
                    <Label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                      <Phone className="w-4 h-4 text-emerald-500" />
                      {t("auth.phone")}
                    </Label>
                    <Input
                      type="tel"
                      placeholder={t("auth.phonePlaceholder")}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-5 py-4 border-2 border-gray-100 rounded-2xl text-base transition-all duration-300 bg-gray-50 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20"
                      required={loginType === 'phone'}
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div>
                    <Label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                      <MessageSquare className="w-4 h-4 text-emerald-500" />
                      {t("auth.verificationCode")}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder={t("auth.verificationCodePlaceholder")}
                        value={formData.verificationCode}
                        onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value })}
                        className="flex-1 px-5 py-4 border-2 border-gray-100 rounded-2xl text-base transition-all duration-300 bg-gray-50 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-400/20"
                        required={loginType === 'phone'}
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        className="px-4 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-medium transition-all duration-300"
                        disabled={isLoading}
                      >
                        {t("auth.getVerificationCode")}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-start">
                    <label className="flex items-center gap-2 text-gray-700 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.remember}
                        onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                        className="w-4 h-4 text-orange-500 rounded focus:ring-orange-400"
                      />
                      {t("auth.rememberMe")}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 rounded-2xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {/* 登录按钮 */}
            <div className="mt-8 relative">
              <Button
                type="submit"
                className="w-full py-5 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2 relative overflow-hidden"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t("auth.loggingIn")}
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    {t("auth.login")}
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* 分割线 */}
          <div className="relative text-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative bg-white px-4 text-gray-500 text-sm">
              {t("auth.orLoginWith")}
            </div>
          </div>

          {/* 社交登录 */}
          <div className="flex justify-center gap-6 mb-6">
            {[
              { key: 'apple', icon: '🍎', color: 'hover:bg-gray-100' },
              { key: 'wechat', icon: '💬', color: 'hover:bg-green-50' },
              { key: 'google', icon: '🔍', color: 'hover:bg-red-50' }
            ].map(({ key, icon, color }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSocialLogin(key)}
                className={`w-14 h-14 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${color}`}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* 注册链接 */}
          <div className="text-center text-gray-600 text-sm">
            {t("auth.noAccount")}{' '}
            <a href="#" className="text-orange-500 font-semibold hover:opacity-80 transition-opacity ml-1">
              {t("auth.signUp")}
            </a>
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="h-8 bg-gradient-to-r from-orange-400 to-emerald-400 rounded-b-3xl"></div>
      </div>
    </>
  )
}
