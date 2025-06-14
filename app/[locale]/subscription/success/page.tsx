"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Crown, Loader2 } from "lucide-react"
import Link from "next/link"

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const [isLoading, setIsLoading] = useState(true)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (sessionId) {
      // In a real app, you'd verify the session with Stripe
      setTimeout(() => {
        setSuccess(true)
        setIsLoading(false)
      }, 2000)
    } else {
      setIsLoading(false)
    }
  }, [sessionId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            <span>验证订阅状态...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {success ? (
              <CheckCircle className="w-16 h-16 text-green-500" />
            ) : (
              <Crown className="w-16 h-16 text-yellow-500" />
            )}
          </div>
          <CardTitle className="text-2xl">{success ? "订阅成功！" : "欢迎升级专业版"}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            {success
              ? "您现在可以使用流式响应功能了！享受更快速、更流畅的AI对话体验。"
              : "感谢您选择专业版！您的订阅正在处理中。"}
          </p>
          <div className="space-y-2">
            <Link href="/">
              <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                开始使用流式响应
              </Button>
            </Link>
            <Link href="/subscription">
              <Button variant="outline" className="w-full">
                管理订阅
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
