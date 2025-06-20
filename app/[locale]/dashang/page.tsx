"use client"
import { CheckCircle } from "lucide-react"
import { DonationProvider } from "@/components/donation-provider"
import { DonationButton } from "@/components/donation-button"
import { DonationModal } from "@/components/donation-modal"
import { useTranslations } from "next-intl"

export default function DashangPage() {
  const t = useTranslations("donation")

  return (
    <DonationProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-red-900 to-blue-900 text-white">
        {/* 主要内容 */}
        <div className="container mx-auto px-6 py-12 flex items-center justify-center min-h-screen">
          <div className="max-w-4xl w-full text-center">
            {/* 标题区域 */}
            <div className="mb-12">
              <h1 className="text-5xl md:text-6xl font-bold mb-4 relative inline-block">
                <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  {t("pageTitle")}
                </span>
                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-orange-400 to-red-400 rounded-full"></div>
              </h1>
              <p className="text-xl md:text-2xl mt-8 text-gray-100 opacity-90">{t("pageSubtitle")}</p>
            </div>

            {/* 功能介绍 */}
            <div className="bg-black/20 backdrop-blur-lg rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl">
              <div className="text-left space-y-6">
                <p className="text-lg md:text-xl leading-relaxed mb-8 text-gray-100">{t("intro")}</p>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-white">{t("feature1Title")}</strong>
                      <span className="text-gray-300"> - {t("feature1Desc")}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-white">{t("feature2Title")}</strong>
                      <span className="text-gray-300"> - {t("feature2Desc")}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-white">{t("feature3Title")}</strong>
                      <span className="text-gray-300"> - {t("feature3Desc")}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-white">{t("feature4Title")}</strong>
                      <span className="text-gray-300"> - {t("feature4Desc")}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <strong className="text-white">{t("feature5Title")}</strong>
                      <span className="text-gray-300"> - {t("feature5Desc")}</span>
                    </div>
                  </div>
                </div>

                <p className="text-lg md:text-xl leading-relaxed mt-8 text-gray-100">{t("callToAction")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 悬浮打赏按钮 */}
        <DonationButton />

        {/* 打赏弹窗 */}
        <DonationModal />
      </div>
    </DonationProvider>
  )
}
