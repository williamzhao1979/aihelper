"use client"

import type React from "react"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, Zap, Check, Loader2 } from "lucide-react"

interface SubscriptionDialogProps {
  children: React.ReactNode
}

export default function SubscriptionDialog({ children }: SubscriptionDialogProps) {
  const t = useTranslations()
  const [isLoading, setIsLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleSubscribe = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/subscription/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_1234567890",
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error("No checkout URL returned")
      }
    } catch (error) {
      console.error("Error creating checkout session:", error)
      alert("Failed to start checkout process. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <Crown className="w-6 h-6 text-yellow-500" />
            升级到专业版
          </DialogTitle>
          <DialogDescription className="text-base">解锁流式响应功能，享受更快速、更流畅的AI对话体验</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Feature Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Free Plan */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">免费版</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">标准响应模式</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">多平台AI对比</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">多语言支持</span>
                </div>
                <div className="text-2xl font-bold">¥0</div>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  推荐
                </div>
              </div>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  专业版
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">所有免费功能</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold">实时流式响应</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold">更快的响应速度</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold">优先技术支持</span>
                </div>
                <div className="text-2xl font-bold">¥29/月</div>
              </CardContent>
            </Card>
          </div>

          {/* Benefits */}
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              流式响应的优势
            </h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• 实时查看AI生成过程，无需等待</li>
              <li>• 更快的感知响应速度</li>
              <li>• 可随时停止生成，节省时间</li>
              <li>• 更流畅的用户体验</li>
            </ul>
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 text-lg font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Crown className="w-5 h-5 mr-2" />
                立即升级专业版
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">安全支付由 Stripe 提供 • 随时可取消订阅</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
