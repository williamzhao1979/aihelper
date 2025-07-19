"use client"

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface ToolCard {
  icon: string
  name: string
  description: string
  category: string
  type: 'available' | 'developing' | 'upcoming'
  isSelfDeveloped?: boolean
}

const toolsData: ToolCard[] = [
  { icon: '🤖', name: 'MyAIChat', description: '我的AI助手', category: 'myaichat', type: 'available', isSelfDeveloped: true },
  { icon: '🔗', name: 'URL提取器', description: '快速提取文本中的链接', category: 'utility', type: 'available', isSelfDeveloped: true },
  { icon: '🎵', name: '音频提取器', description: '从视频中提取音频', category: 'media', type: 'available', isSelfDeveloped: true },
  { icon: '📝', name: '文章点评助手', description: 'AI智能文章分析', category: 'ai', type: 'available', isSelfDeveloped: true },
  { icon: '🎨', name: '绘画评价助手', description: '专业绘画作品点评', category: 'ai', type: 'available', isSelfDeveloped: true },
  { icon: '📅', name: '健康日历(私用)', description: '记录全家吃喝拉撒', category: 'ai', type: 'available', isSelfDeveloped: true },
  
  // 开发中工具
  { icon: '📅', name: '健康日历', description: '个人健康管理日程', category: 'developing', type: 'developing', isSelfDeveloped: true },
  
  // 待开发工具
  { icon: '📷', name: '图片压缩器', description: '无损压缩图片大小', category: 'upcoming', type: 'upcoming' },
  { icon: '🔤', name: '文本格式化', description: '美化文本排版格式', category: 'upcoming', type: 'upcoming' },
  { icon: '🏠', name: '二维码生成', description: '快速生成二维码', category: 'upcoming', type: 'upcoming' },
  { icon: '🌐', name: '翻译助手', description: '多语言实时翻译', category: 'upcoming', type: 'upcoming' },
  { icon: '🔐', name: '密码生成器', description: '生成安全密码', category: 'upcoming', type: 'upcoming' },
  { icon: '🎬', name: '视频转换器', description: '转换视频格式', category: 'upcoming', type: 'upcoming' },
  { icon: '📊', name: 'Markdown编辑器', description: '在线Markdown编辑', category: 'upcoming', type: 'upcoming' },
  { icon: '⏰', name: '时间戳转换', description: '时间格式转换工具', category: 'upcoming', type: 'upcoming' },
  { icon: '📋', name: 'JSON格式化', description: 'JSON数据美化', category: 'upcoming', type: 'upcoming' },
  { icon: '🖼️', name: '图片格式转换', description: '转换图片格式', category: 'upcoming', type: 'upcoming' },
  { icon: '📏', name: '单位转换器', description: '各种单位换算', category: 'upcoming', type: 'upcoming' },
  { icon: '🤖', name: '代码生成器', description: 'AI代码生成助手', category: 'upcoming', type: 'upcoming' },
  { icon: '📄', name: 'PDF工具', description: 'PDF合并分割工具', category: 'upcoming', type: 'upcoming' },
  { icon: '🎲', name: '随机数生成', description: '生成随机数字', category: 'upcoming', type: 'upcoming' },
  { icon: '📹', name: 'GIF制作器', description: '制作动态GIF图', category: 'upcoming', type: 'upcoming' },
  { icon: '📱', name: '设备信息检测', description: '检测设备详细信息', category: 'upcoming', type: 'upcoming' },
  { icon: '✍️', name: 'AI写作助手', description: '智能文案创作生成', category: 'upcoming', type: 'upcoming' },
  { icon: '🖼️', name: 'AI图像生成', description: '文字描述生成图片', category: 'upcoming', type: 'upcoming' },
  { icon: '🗣️', name: 'AI语音合成', description: '文字转语音播报', category: 'upcoming', type: 'upcoming' },
  { icon: '📊', name: 'AI数据洞察', description: '智能数据分析报告', category: 'upcoming', type: 'upcoming' },
  { icon: '📋', name: 'AI简历优化', description: '职业简历智能优化', category: 'upcoming', type: 'upcoming' },
  { icon: '📧', name: 'AI邮件助手', description: '智能邮件内容生成', category: 'upcoming', type: 'upcoming' },
  { icon: '🎯', name: 'AI学习规划', description: '个性化学习计划制定', category: 'upcoming', type: 'upcoming' },
  { icon: '💪', name: 'AI健身教练', description: '智能健身计划推荐', category: 'upcoming', type: 'upcoming' },
  { icon: '💰', name: 'AI理财顾问', description: '个人投资建议分析', category: 'upcoming', type: 'upcoming' },
  { icon: '⚖️', name: 'AI法律咨询', description: '基础法律问题解答', category: 'upcoming', type: 'upcoming' },
]

const categories = [
  { id: 'all', name: '全部' },
  { id: 'media', name: '媒体处理' },
  { id: 'text', name: '文本工具' },
  { id: 'utility', name: '实用工具' },
  { id: 'ai', name: 'AI助手' },
  { id: 'developing', name: '开发中' },
  { id: 'upcoming', name: '待开发' },
]

export default function MyToolsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [filteredTools, setFilteredTools] = useState(toolsData)
  const router = useRouter()
  const params = useParams()
  const locale = params?.locale || 'zh' // 获取当前 locale，默认为 'zh'

  useEffect(() => {
    let filtered = toolsData

    // 分类筛选
    if (activeCategory === 'all') {
      // 在"全部"分类中，只显示已完成的工具
      filtered = filtered.filter(tool => tool.type === 'available')
    } else if (activeCategory === 'developing') {
      filtered = filtered.filter(tool => tool.type === 'developing')
    } else if (activeCategory === 'upcoming') {
      filtered = filtered.filter(tool => tool.type === 'upcoming')
    } else {
      // 其他分类（媒体处理、文本工具等），只显示已完成的工具
      filtered = filtered.filter(tool => 
        tool.category === activeCategory && tool.type === 'available'
      )
    }

    // 搜索筛选
    if (searchTerm) {
      filtered = filtered.filter(tool =>
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredTools(filtered)
  }, [searchTerm, activeCategory])

  const handleToolClick = (tool: ToolCard) => {
    if (tool.type === 'developing') {
      // 处理开发中工具的跳转
      if (tool.name === '健康日历') {
        window.location.href = '/health_calendar.html'
      } else {
        alert(`${tool.name} 正在开发中，即将上线！`)
      }
    } else if (tool.type === 'upcoming') {
      alert(`${tool.name} 正在开发中，敬请期待！`)
    } else {
      // 处理已完成工具的跳转
      switch (tool.name) {
        case 'MyAIChat':
          router.push(`/${locale}/myaichat`)
          break
        case 'URL提取器':
          router.push(`/${locale}/extracturl`)
          break
        case '音频提取器':
          router.push(`/${locale}/extractaudio`)
          break
        case '文章点评助手':
          router.push(`/${locale}/textreview`)
          break
        case '绘画评价助手':
          router.push(`/${locale}/artreview`)
          break
        case '健康日历(私用)':
          router.push(`/${locale}/healthcalendar`)
          break
        default:
          console.log(`点击了工具: ${tool.name}`)
          alert(`即将打开: ${tool.name}`)
      }
    }
  }

  const availableTools = toolsData.filter(tool => tool.type === 'available')
  const developingTools = toolsData.filter(tool => tool.type === 'developing')
  const upcomingTools = toolsData.filter(tool => tool.type === 'upcoming')
  const selfDevelopedCount = toolsData.filter(tool => tool.isSelfDeveloped).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-purple-800 text-white overflow-x-hidden">
      <div className="max-w-lg mx-auto px-3 py-4">
        {/* 头部 */}
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold mb-2 drop-shadow-lg">🛠️ 我的工具箱</h1>
          <p className="text-sm opacity-90 font-light">精选工具，让生活更顺心</p>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-4">
          <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-600 text-base">🔍</span>
          <input
            type="text"
            className="w-full py-3 px-4 pl-10 bg-white/95 backdrop-blur-md rounded-2xl text-sm text-gray-900 placeholder-gray-500 border-none outline-none shadow-lg transition-all focus:bg-white focus:shadow-xl focus:-translate-y-0.5"
            placeholder="搜索工具..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 分类筛选 */}
        <div className="flex gap-1.5 mb-4 flex-wrap py-0.5">
          {categories.map(category => (
            <button
              key={category.id}
              className={`px-3 py-1.5 rounded-2xl text-xs cursor-pointer transition-all whitespace-nowrap backdrop-blur-md ${
                activeCategory === category.id
                  ? 'bg-white/30 scale-105'
                  : 'bg-white/20 hover:bg-white/30 hover:scale-105'
              }`}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* 工具网格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
          {filteredTools.map((tool, index) => (
            <div
              key={`${tool.name}-${index}`}
              className={`relative bg-white/95 backdrop-blur-md rounded-xl p-3.5 text-center cursor-pointer transition-all duration-300 border border-white/20 shadow-lg overflow-hidden group ${
                tool.type === 'developing'
                  ? 'bg-orange-500/20 border-orange-500/60'
                  : tool.type === 'upcoming'
                  ? 'bg-white/15 border-dashed border-white/40'
                  : 'hover:-translate-y-2 hover:scale-105 hover:shadow-xl hover:bg-white'
              }`}
              onClick={() => handleToolClick(tool)}
              style={{
                animation: `fadeIn 0.5s ease ${index * 0.05}s both`
              }}
            >
              {/* 光效 */}
              {tool.type === 'available' && (
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent transform -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
              )}
              
              {/* 开发中工具的闪烁效果 */}
              {tool.type === 'developing' && (
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-orange-500/30 to-transparent transform -translate-x-full animate-pulse" />
              )}

              <div className={`text-3xl mb-2 transition-transform group-hover:scale-110 ${
                tool.type === 'developing' ? 'text-orange-400' : ''
              }`}>
                {tool.icon}
              </div>
              
              <div className={`text-sm font-semibold mb-1 pr-3 ${
                tool.type === 'upcoming' ? 'text-white' : 'text-gray-900'
              }`}>
                {tool.name}
              </div>
              
              <div className={`text-xs leading-tight mb-1.5 pr-3 ${
                tool.type === 'upcoming' ? 'text-white/80' : 'text-gray-600'
              }`}>
                {tool.description}
              </div>

              {/* 标签 */}
              {tool.type === 'developing' && (
                <div className="text-xs text-orange-400 font-semibold bg-orange-500/30 px-1.5 py-0.5 rounded-lg inline-block border border-orange-500/50">
                  开发中
                </div>
              )}
              
              {tool.type === 'upcoming' && (
                <div className="text-xs text-yellow-300 font-medium bg-yellow-500/20 px-1.5 py-0.5 rounded-lg inline-block">
                  敬请期待
                </div>
              )}

              {/* 自开发标签 */}
              {tool.isSelfDeveloped && (
                <div className="absolute top-1.5 right-1.5 text-xs text-green-400 font-semibold bg-green-500/20 px-1 py-0.5 rounded-md border border-green-500/40 backdrop-blur-sm">
                  自开发
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 开发中工具单独展示 */}
        {activeCategory === 'all' && (
          <div className="mt-8">
            <div className="text-center mb-4">
              <h2 className="text-xl font-semibold mb-1 drop-shadow-md">⚡ 开发中工具集</h2>
              <p className="text-sm opacity-80 font-light">正在紧张开发的功能</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              {developingTools.map((tool, index) => (
                <div
                  key={`developing-${tool.name}-${index}`}
                  className="relative bg-orange-500/20 backdrop-blur-md rounded-xl border-2 border-orange-500/60 p-3.5 text-center cursor-pointer transition-all duration-300 overflow-hidden group hover:-translate-y-1 hover:scale-105 hover:bg-orange-500/30 hover:border-orange-500/80 hover:shadow-xl"
                  onClick={() => handleToolClick(tool)}
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-orange-500/30 to-transparent transform -translate-x-full animate-pulse" />
                  
                  <div className="text-3xl mb-2 text-orange-400 transition-transform group-hover:scale-110">
                    {tool.icon}
                  </div>
                  
                  <div className="text-sm font-semibold text-white mb-1">
                    {tool.name}
                  </div>
                  
                  <div className="text-xs text-white/90 leading-tight mb-1.5">
                    {tool.description}
                  </div>

                  <div className="text-xs text-orange-400 font-semibold bg-orange-500/30 px-1.5 py-0.5 rounded-lg inline-block border border-orange-500/50">
                    开发中
                  </div>

                  {tool.isSelfDeveloped && (
                    <div className="absolute top-1.5 right-1.5 text-xs text-green-400 font-semibold bg-green-500/20 px-1 py-0.5 rounded-md border border-green-500/40 backdrop-blur-sm">
                      自开发
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 待开发工具单独展示 */}
        {activeCategory === 'all' && (
          <div className="mt-8">
            <div className="text-center mb-4">
              <h2 className="text-xl font-semibold mb-1 drop-shadow-md">🚀 待开发工具集</h2>
              <p className="text-sm opacity-80 font-light">即将推出的AI智能工具</p>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              {upcomingTools.slice(0, 20).map((tool, index) => (
                <div
                  key={`upcoming-${tool.name}-${index}`}
                  className="relative bg-white/15 backdrop-blur-md rounded-xl border-2 border-dashed border-white/40 p-3.5 text-center cursor-pointer transition-all duration-300 overflow-hidden hover:-translate-y-1 hover:scale-105 hover:bg-white/25 hover:border-white/60"
                  onClick={() => handleToolClick(tool)}
                >
                  <div className="text-3xl mb-2 opacity-80 transition-all group-hover:opacity-100 group-hover:scale-110">
                    {tool.icon}
                  </div>
                  
                  <div className="text-sm font-semibold text-white mb-1">
                    {tool.name}
                  </div>
                  
                  <div className="text-xs text-white/80 leading-tight mb-1.5">
                    {tool.description}
                  </div>

                  <div className="text-xs text-yellow-300 font-medium bg-yellow-500/20 px-1.5 py-0.5 rounded-lg inline-block">
                    敬请期待
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 统计信息 */}
        <div className="mt-6 mb-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 text-center border border-white/20 transition-all hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-lg">
              <div className="text-xl mb-1.5 opacity-90">🛠️</div>
              <div className="text-2xl font-bold text-white mb-0.5">{toolsData.length}</div>
              <div className="text-xs text-white/80 font-medium">总工具数</div>
            </div>
            
            <div className="bg-green-500/20 backdrop-blur-md rounded-xl p-4 text-center border border-green-500/40 transition-all hover:-translate-y-0.5 hover:bg-green-500/30 hover:shadow-lg">
              <div className="text-xl mb-1.5 opacity-90">💎</div>
              <div className="text-2xl font-bold text-white mb-0.5">{selfDevelopedCount}</div>
              <div className="text-xs text-white/80 font-medium">自开发工具</div>
            </div>
            
            <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 text-center border border-white/20 transition-all hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-lg">
              <div className="text-xl mb-1.5 opacity-90">🚀</div>
              <div className="text-2xl font-bold text-white mb-0.5">{upcomingTools.length}</div>
              <div className="text-xs text-white/80 font-medium">待开发工具</div>
            </div>
          </div>
        </div>

        {/* 页脚 */}
        <div className="text-center text-white/80 text-xs mt-5">
          <p>已发布{availableTools.length}个工具 | 开发中{developingTools.length}个工具 | 待开发{upcomingTools.length}个工具 | 持续更新中...</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
      `}</style>
    </div>
  )
}
