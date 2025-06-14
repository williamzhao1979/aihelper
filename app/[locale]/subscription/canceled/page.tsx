import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XCircle } from "lucide-react"
import Link from "next/link"

export default function SubscriptionCanceledPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="w-16 h-16 text-gray-400" />
          </div>
          <CardTitle className="text-2xl">订阅已取消</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">您已取消订阅流程。您仍然可以使用免费版本的所有功能。</p>
          <div className="space-y-2">
            <Link href="/">
              <Button className="w-full">返回首页</Button>
            </Link>
            <p className="text-sm text-gray-500">随时可以重新订阅专业版功能</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
