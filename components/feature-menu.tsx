"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import Link from "next/link"
import { useLocale } from "next-intl"
import { useTranslations } from "next-intl"

export default function FeatureMenu() {
  const t = useTranslations()
  const locale = useLocale()

  return (
        <Card className="mt-8 border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <span className="text-lg font-semibold">{t("chat.moreFeatures")}</span>
            </div>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href={`/${locale}/healthcalendar`}>
                <Button className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white">
                  健康日历
                </Button>
              </Link>
              <Link href={`/${locale}/textreview`}>
                <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
                  {t("chat.goToTextReview")}
                </Button>
              </Link>
              <Link href={`/${locale}/artreview`}>
                <Button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white">
                  {t("chat.goToArtReview")}
                </Button>
              </Link>
              <Link href={`/${locale}/chat`}>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
                  {t("chat.goToChat")}
                </Button>
              </Link>
              <Link href={`/${locale}/extractaudio`}>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
                  音频提取
                </Button>
              </Link>
              <Link href={`/${locale}/extracturl`}>
                <Button className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white">
                  URL提取器
                </Button>
              </Link>
              <Link href="/lianzuicounter.html">
                <Button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white">
                  练嘴皮子
                </Button>
              </Link>
              <Link href="/cowsay">
                <Button className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white">
                  Cowsay
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
  )
}
