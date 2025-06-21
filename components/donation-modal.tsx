"use client"

import { useEffect } from "react"
import { X, Heart } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useDonation } from "./donation-provider"
import { useTranslations } from "next-intl"
import Image from "next/image"
import {
  Check,
  Sparkles,
  Send,
  AlertCircle,
  Loader2,
  Zap,
  Crown,
  Lock,
  Star,
  Clock,
  Settings,
  Languages,
  RotateCcw,
} from "lucide-react"
import LanguageSwitcher from "./language-switcher"

export function DonationModal() {
  const { isModalOpen, closeModal } = useDonation()
  const t = useTranslations("donation")

  // ESC键关闭弹窗
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isModalOpen) {
        closeModal()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isModalOpen, closeModal])

  return (
    <Dialog open={isModalOpen} onOpenChange={closeModal}>
      <DialogContent className="max-w-md p-0 bg-gradient-to-br from-slate-800 via-blue-900 to-slate-800 border-0 overflow-hidden">
        <div className="relative p-8">
          {/* 关闭按钮 */}
          {/* <button
            onClick={closeModal}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all duration-300 hover:rotate-90"
          >
            <X className="w-5 h-5" />
          </button> */}

          {/* 标题 */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent mb-2">
              {t("title")}
            </h2>
          </div>

          {/* 感谢消息 */}
          <div className="text-center mb-6 text-gray-100">
            <p className="text-lg leading-relaxed mb-4">
              <span className="text-orange-400">"</span>
              {t("message")}
              <span className="text-orange-400">"</span>
            </p>
            <p className="text-base opacity-90">{t("subMessage")}</p>
          </div>

          {/* 二维码容器 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 mb-6">
            <div className="flex flex-col items-center">
              <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center mb-4 overflow-hidden">
                <Image
                  src="/dashang.jpg"
                  alt={t("qrAlt")}
                  width={192}
                  height={192}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // 如果图片加载失败，显示占位符
                    const target = e.target as HTMLImageElement
                    target.style.display = "none"
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center text-gray-600">
                          <svg class="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4z"/>
                            <path d="M15 15h2v2h-2zm0 2h2v2h-2zm2 0h2v2h-2z"/>
                          </svg>
                        </div>
                      `
                    }
                  }}
                />
              </div>
              <div className="text-orange-400 font-semibold text-lg">{t("qrLabel")}</div>
            </div>
          </div>

          {/* 感谢语 */}
          <div className="text-center text-green-400 font-medium flex items-center justify-center gap-2">
            <Heart className="w-5 h-5 text-red-400" />
            {t("thankYou")}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
