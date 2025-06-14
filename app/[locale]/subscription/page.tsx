import SubscriptionStatus from "@/components/subscription-status"
import { Crown } from "lucide-react"

export default function SubscriptionPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2 mb-4">
            <Crown className="w-8 h-8 text-yellow-500" />
            订阅管理
          </h1>
          <p className="text-gray-600">管理您的专业版订阅</p>
        </div>

        <SubscriptionStatus />
      </div>
    </div>
  )
}
