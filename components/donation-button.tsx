"use client"
import { Coffee } from "lucide-react"
import { useDonation } from "./donation-provider"
import { useTranslations } from "next-intl"

interface DonationButtonProps {
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"
  size?: "sm" | "md" | "lg"
  className?: string
}

export function DonationButton({ position = "bottom-right", size = "md", className = "" }: DonationButtonProps) {
  const { openModal } = useDonation()
  const t = useTranslations("donation")

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  }

  const sizeClasses = {
    sm: "w-14 h-14",
    md: "w-20 h-20",
    lg: "w-24 h-24",
  }

  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }

  return (
    <div className={`fixed ${positionClasses[position]} z-50 ${className}`}>
      <div className="relative group">
        {/* 主按钮 */}
        <button
          onClick={openModal}
          className={`
            ${sizeClasses[size]}
            rounded-full
            bg-gradient-to-br from-orange-400 via-red-400 to-red-500
            shadow-lg shadow-red-500/50
            flex items-center justify-center
            text-white
            transition-all duration-300 ease-out
            hover:scale-110 hover:-translate-y-2 hover:shadow-xl hover:shadow-red-500/60
            active:scale-95
            animate-pulse
            group-hover:animate-none
            relative overflow-hidden
          `}
        >
          <Coffee
            className={`${iconSizes[size]} transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110`}
          />

          {/* 蒸汽效果 */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="steam-1 w-1 h-4 bg-white/60 rounded-full blur-sm animate-steam"></div>
          </div>
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 translate-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
            <div className="steam-2 w-1 h-4 bg-white/40 rounded-full blur-sm animate-steam"></div>
          </div>
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200">
            <div className="steam-3 w-1 h-4 bg-white/50 rounded-full blur-sm animate-steam"></div>
          </div>
        </button>

        {/* 提示标签 */}
        <div className="absolute right-full top-1/2 transform -translate-y-1/2 mr-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 pointer-events-none">
          <div className="bg-black/80 text-white px-3 py-2 rounded-full text-sm whitespace-nowrap backdrop-blur-sm">
            {t("buttonLabel")}
          </div>
          <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-l-8 border-l-black/80 border-y-4 border-y-transparent"></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes steam {
          0% { 
            transform: translateY(0) scale(1); 
            opacity: 0;
          }
          50% { 
            transform: translateY(-8px) scale(1.2); 
            opacity: 0.6;
          }
          100% { 
            transform: translateY(-16px) scale(1.5); 
            opacity: 0;
          }
        }
        .animate-steam {
          animation: steam 2s infinite;
        }
        .steam-1 {
          animation-delay: 0.2s;
        }
        .steam-2 {
          animation-delay: 0.4s;
        }
        .steam-3 {
          animation-delay: 0.6s;
        }
      `}</style>
    </div>
  )
}
