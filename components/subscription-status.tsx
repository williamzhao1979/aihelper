"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, ExternalLink, Loader2 } from "lucide-react"

interface SubscriptionData {
  hasActiveSubscription: boolean
  subscription: {
    status: string
    currentPeriodEnd: string
    stripePriceId: string
  } | null
}

export default function SubscriptionStatus() {
  const { data: session } = useSession()
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isManaging, setIsManaging] = useState(false)

  useEffect(() => {
    if (session?.user) {
      fetchSubscriptionStatus()
    }
  }, [session])

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch("/api/subscription/status")
      const data = await response.json()
      setSubscriptionData(data)
    } catch (error) {
      console.error("Error fetching subscription status:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManageSubscription = async () => {
    setIsManaging(true)
    try {
      const response = await fetch("/api/subscription/portal", {
        method: "POST",
      })
      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error("Error opening billing portal:", error)
      alert("Failed to open billing portal. Please try again.")
    } finally {
      setIsManaging(false)
    }
  }

  if (!session?.user) {
    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" />
          订阅状态
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscriptionData?.hasActiveSubscription ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-green-600">专业版 - 已激活</div>
                <div className="text-sm text-gray-600">
                  下次续费: {new Date(subscriptionData.subscription!.currentPeriodEnd).toLocaleDateString()}
                </div>
              </div>
              <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                {subscriptionData.subscription!.status}
              </div>
            </div>
            <Button onClick={handleManageSubscription} disabled={isManaging} variant="outline" className="w-full">
              {isManaging ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              管理订阅
            </Button>
          </>
        ) : (
          <div>
            <div className="font-semibold text-gray-600">免费版</div>
            <div className="text-sm text-gray-500">升级到专业版解锁流式响应功能</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
