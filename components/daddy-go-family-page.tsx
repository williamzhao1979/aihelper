"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Heart, Home, Star, Search, Smile, Camera, Eye, EyeOff, Sparkles, Gift, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useLocale } from "next-intl"

interface FamilyPhoto {
  url: string
  caption: string
}

interface FloatingHeart {
  id: number
  left: number
  animationDuration: number
  fontSize: number
}

export default function DaddyGoFamilyPage() {
  const locale = useLocale()
  const [showRiddleAnswer, setShowRiddleAnswer] = useState(false)
  const [currentPhoto, setCurrentPhoto] = useState<FamilyPhoto | null>(null)
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([])
  const [currentDate, setCurrentDate] = useState("")
  const heartIdRef = useRef(0)

  const familyPhotos: FamilyPhoto[] = [
    {
      url: "/placeholder.svg?height=300&width=400&text=Family+Dinner",
      caption: "一家人围坐在餐桌旁讨论周末计划",
    },
    {
      url: "/placeholder.svg?height=300&width=400&text=Reading+Together",
      caption: "父女一起在客厅阅读的温馨时光",
    },
    {
      url: "/placeholder.svg?height=300&width=400&text=Family+Meeting",
      caption: "家庭会议中的欢乐时刻",
    },
    {
      url: "/placeholder.svg?height=300&width=400&text=Game+Night",
      caption: "家庭游戏夜的全家福",
    },
    {
      url: "/placeholder.svg?height=300&width=400&text=Weekend+Fun",
      caption: "周末全家一起制作手工的快乐时光",
    },
  ]

  useEffect(() => {
    // Set current date
    setCurrentDate(new Date().toLocaleDateString("zh-CN"))

    // Show random photo on load
    const randomIndex = Math.floor(Math.random() * familyPhotos.length)
    setCurrentPhoto(familyPhotos[randomIndex])
  }, [])

  useEffect(() => {
    // Create floating hearts
    const createHeart = () => {
      const newHeart: FloatingHeart = {
        id: heartIdRef.current++,
        left: Math.random() * 100,
        animationDuration: 3 + Math.random() * 3,
        fontSize: 0.8 + Math.random() * 1.2,
      }

      setFloatingHearts((prev) => [...prev, newHeart])

      // Remove heart after animation
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((heart) => heart.id !== newHeart.id))
      }, newHeart.animationDuration * 1000)
    }

    // Create hearts periodically
    const interval = setInterval(createHeart, 800)

    // Initial hearts
    for (let i = 0; i < 5; i++) {
      setTimeout(createHeart, i * 200)
    }

    return () => clearInterval(interval)
  }, [])

  const changePhoto = () => {
    const randomIndex = Math.floor(Math.random() * familyPhotos.length)
    setCurrentPhoto(familyPhotos[randomIndex])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 relative overflow-hidden">
      {/* Floating Hearts */}
      <div className="fixed inset-0 pointer-events-none z-10">
        {floatingHearts.map((heart) => (
          <div
            key={heart.id}
            className="absolute text-pink-400 animate-bounce"
            style={{
              left: `${heart.left}%`,
              fontSize: `${heart.fontSize}rem`,
              animation: `float-up ${heart.animationDuration}s linear forwards`,
            }}
          >
            ❤️
          </div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-8 relative z-20">
        {/* Back to Home Button */}
        <div className="flex justify-start">
          <Link href={`/${locale}`}>
            <Button
              variant="outline"
              className="bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>
        </div>

        {/* Header */}
        <Card className="relative overflow-hidden bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-white border-0 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-blue-500/20 backdrop-blur-sm"></div>
          <CardContent className="relative z-10 text-center py-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Home className="w-12 h-12 animate-pulse" />
              <h1 className="text-5xl font-bold tracking-wide">DaddyGo的温馨小屋</h1>
            </div>
            <p className="text-xl opacity-90 font-medium">装满爱与温暖的每一天</p>
            <div className="mt-6 flex justify-center gap-2">
              {[...Array(5)].map((_, i) => (
                <Sparkles key={i} className="w-6 h-6 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Blessings Section */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="border-b border-pink-100">
            <CardTitle className="flex items-center gap-3 text-2xl text-pink-600">
              <Gift className="w-8 h-8" />
              来自爸爸的祝福
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 border-l-4 border-pink-400 relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-500">13岁</Badge>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                给大宝贝 <Heart className="w-5 h-5 text-pink-500 animate-pulse" />
              </h3>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>亲爱的孩子：</p>
                <p>愿你像春天的花朵一样绽放，像夏日的阳光一样灿烂，在成长的路上永远保持那份纯真与勇气。</p>
                <p className="font-semibold text-pink-600">爸爸会一直做你最坚实的后盾，见证你每一个精彩的瞬间！</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-6 border-l-4 border-blue-400 relative overflow-hidden">
              <div className="absolute top-2 right-2">
                <Badge className="bg-green-400 text-green-900 hover:bg-green-500">9岁</Badge>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                给小宝贝 <Heart className="w-5 h-5 text-blue-500 animate-pulse" />
              </h3>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>亲爱的小天使：</p>
                <p>愿你的每一天都充满欢声笑语，像小鸟一样自由快乐，像彩虹一样绚丽多彩。</p>
                <p className="font-semibold text-blue-600">爸爸永远是你最忠实的观众，欣赏你创造的每一个奇迹！</p>
              </div>
            </div>

            <div className="text-center py-4">
              <p className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
                爸爸永远爱你们
                <Heart className="w-6 h-6 text-red-500 animate-pulse" />
                <Heart className="w-6 h-6 text-red-500 animate-pulse" style={{ animationDelay: "0.5s" }} />
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Encouragement Section */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="border-b border-purple-100">
            <CardTitle className="flex items-center gap-3 text-2xl text-purple-600">
              <Star className="w-8 h-8" />
              来自爸爸的鼓励
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-6 border-l-4 border-yellow-400">
              <h3 className="text-xl font-bold text-gray-800 mb-4">给大宝贝</h3>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>爸爸看到你在学业上的努力，就像看到一颗正在打磨的钻石，每一面都在闪闪发光！</p>
                <p className="font-semibold text-orange-600">
                  记住：成功不是终点，而是沿途风景的总和。享受学习的过程，爸爸为你骄傲！
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl p-6 border-l-4 border-green-400">
              <h3 className="text-xl font-bold text-gray-800 mb-4">给小宝贝</h3>
              <div className="space-y-3 text-gray-700 leading-relaxed">
                <p>你最近的表现简直像小火箭一样冲上云霄！爸爸看到了你的每一个进步。</p>
                <p className="font-semibold text-teal-600">
                  就像拼图一样，每一天的努力都在完成人生美丽的图画。继续加油，小冠军！
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Content Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Daily Riddle */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="border-b border-blue-100">
              <CardTitle className="flex items-center gap-3 text-xl text-blue-600">
                <Search className="w-6 h-6" />
                今日谜语
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <div className="text-gray-700 leading-relaxed mb-4 space-y-2">
                  <p>有头没有尾，有角没有嘴，</p>
                  <p>摇动角和水，水从尾流出。</p>
                  <p className="font-semibold text-blue-600">（打一生活用品）</p>
                </div>
                <Button
                  onClick={() => setShowRiddleAnswer(!showRiddleAnswer)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {showRiddleAnswer ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      隐藏答案
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      显示答案
                    </>
                  )}
                </Button>
                {showRiddleAnswer && (
                  <div className="mt-4 p-4 bg-white/80 rounded-lg border border-blue-300 animate-in slide-in-from-top-2 duration-300">
                    <p className="font-bold text-blue-700">答案：水龙头</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tongue Twister */}
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="border-b border-green-100">
              <CardTitle className="flex items-center gap-3 text-xl text-green-600">
                <Smile className="w-6 h-6" />
                今日绕口令
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <div className="text-gray-700 leading-relaxed space-y-2">
                  <p>四是四，十是十，</p>
                  <p>十四是十四，四十是四十。</p>
                  <p>谁能分得清，请来试一试！</p>
                  <p className="text-sm text-green-600 italic mt-4">（爸爸挑战了三次才说顺溜呢~）</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Joke */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="border-b border-yellow-100">
            <CardTitle className="flex items-center gap-3 text-2xl text-yellow-600">
              <Smile className="w-8 h-8" />
              今日笑话
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-200">
              <div className="text-gray-700 leading-relaxed space-y-3">
                <p>老师问："谁能用'果然'造个句子？"</p>
                <p>小明举手："先吃水果，然后喝汽水。"</p>
                <p>老师："不对，不是'果然后'！"</p>
                <p>小明想了想："那我重新造——先吃水果，然，后再喝汽水。"</p>
                <p className="text-yellow-600 italic font-medium mt-4">（希望这个笑话能带给你们欢乐的时光 😊）</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Family Photo */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
          <CardHeader className="border-b border-purple-100">
            <CardTitle className="flex items-center gap-3 text-2xl text-purple-600">
              <Camera className="w-8 h-8" />
              今日家庭照片
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              {currentPhoto && (
                <>
                  <div className="relative overflow-hidden rounded-2xl shadow-lg">
                    <img
                      src={currentPhoto.url || "/placeholder.svg"}
                      alt={currentPhoto.caption}
                      className="w-full h-64 object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                  <p className="text-gray-600 italic text-lg">{currentPhoto.caption}</p>
                </>
              )}
              <Button
                onClick={changePhoto}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Camera className="w-4 h-4 mr-2" />
                换一张照片
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-0 shadow-lg">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 flex items-center justify-center gap-2">
              制作于 <span className="font-semibold">{currentDate}</span> · 装满父爱的小屋
              <Heart className="w-5 h-5 text-red-500 animate-pulse" />
            </p>
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.7;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(-100px) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
