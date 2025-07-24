"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { 
  X, 
  Search, 
  FileText, 
  Link, 
  Image, 
  BarChart3, 
  Bot,
  ChevronDown,
  ChevronRight,
  Scissors,
  FileSpreadsheet,
  QrCode,
  Palette,
  Languages,
  FileCheck,
  Code,
  Mail,
  ScanLine,
  FileImage,
  Download,
  Settings,
  Zap
} from "lucide-react"
import { useTranslations } from "next-intl"

interface MoreToolsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onToolSelect: (tool: ToolItem) => void
}

interface ToolItem {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  category: string
  isNew?: boolean
  isComingSoon?: boolean
  onClick?: () => void
}

const toolCategories = [
  {
    id: 'document',
    name: '文档处理',
    icon: <FileText className="w-5 h-5" />,
    color: 'green',
    tools: [
      {
        id: 'text-edit',
        name: '文章修改',
        description: '智能修改和优化文本内容',
        icon: <FileText className="w-4 h-4" />,
        category: 'document'
      },
      {
        id: 'url-extract',
        name: 'URL提取',
        description: '从图片中提取网址和邮箱',
        icon: <Link className="w-4 h-4" />,
        category: 'document'
      },
      {
        id: 'url-extract-multi',
        name: '新URL提取器',
        description: '打开新的URL提取器实例',
        icon: <Link className="w-4 h-4" />,
        category: 'document',
        isNew: true
      },
      {
        id: 'pdf-process',
        name: 'PDF处理',
        description: 'PDF文档转换和处理',
        icon: <FileText className="w-4 h-4" />,
        category: 'document',
        isComingSoon: true
      },
      {
        id: 'doc-convert',
        name: '文档转换',
        description: '多格式文档转换工具',
        icon: <Scissors className="w-4 h-4" />,
        category: 'document',
        isComingSoon: true
      },
      {
        id: 'batch-ocr',
        name: '批量OCR',
        description: '批量图片文字识别',
        icon: <ScanLine className="w-4 h-4" />,
        category: 'document',
        isNew: true,
        isComingSoon: true
      }
    ]
  },
  {
    id: 'image',
    name: '图像工具',
    icon: <Image className="w-5 h-5" />,
    color: 'purple',
    tools: [
      {
        id: 'ocr',
        name: 'OCR识别',
        description: '图片文字识别和提取',
        icon: <ScanLine className="w-4 h-4" />,
        category: 'image'
      },
      {
        id: 'art-critique',
        name: '绘画点评',
        description: '专业艺术作品评价和建议',
        icon: <Palette className="w-4 h-4" />,
        category: 'image',
        isNew: true
      },
      {
        id: 'image-edit',
        name: '图片编辑',
        description: '在线图片编辑和处理',
        icon: <Palette className="w-4 h-4" />,
        category: 'image',
        isComingSoon: true
      },
      {
        id: 'format-convert',
        name: '格式转换',
        description: '图片格式转换工具',
        icon: <FileImage className="w-4 h-4" />,
        category: 'image',
        isComingSoon: true
      },
      {
        id: 'image-compress',
        name: '图片压缩',
        description: '智能图片压缩优化',
        icon: <Download className="w-4 h-4" />,
        category: 'image',
        isNew: true,
        isComingSoon: true
      },
      {
        id: 'qr-code',
        name: '二维码生成',
        description: '快速生成各种二维码',
        icon: <QrCode className="w-4 h-4" />,
        category: 'image',
        isNew: true,
        isComingSoon: true
      }
    ]
  },
  {
    id: 'data',
    name: '数据分析',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'orange',
    tools: [
      {
        id: 'excel-analysis',
        name: 'Excel分析',
        description: '数据表格分析和处理',
        icon: <FileSpreadsheet className="w-4 h-4" />,
        category: 'data',
        isComingSoon: true
      },
      {
        id: 'chart-generate',
        name: '图表生成',
        description: '数据可视化图表制作',
        icon: <BarChart3 className="w-4 h-4" />,
        category: 'data',
        isComingSoon: true
      },
      {
        id: 'data-clean',
        name: '数据清洗',
        description: '数据预处理和清理',
        icon: <Settings className="w-4 h-4" />,
        category: 'data',
        isComingSoon: true
      },
      {
        id: 'csv-process',
        name: 'CSV处理',
        description: 'CSV文件处理和转换',
        icon: <FileSpreadsheet className="w-4 h-4" />,
        category: 'data',
        isComingSoon: true
      }
    ]
  },
  {
    id: 'ai',
    name: 'AI助手',
    icon: <Bot className="w-5 h-5" />,
    color: 'blue',
    tools: [
      {
        id: 'translate',
        name: '智能翻译',
        description: '多语言智能翻译服务',
        icon: <Languages className="w-4 h-4" />,
        category: 'ai',
        isNew: true,
        isComingSoon: true
      },
      {
        id: 'summarize',
        name: '内容摘要',
        description: '智能文本摘要提取',
        icon: <FileCheck className="w-4 h-4" />,
        category: 'ai',
        isComingSoon: true
      },
      {
        id: 'code-generate',
        name: '代码生成',
        description: 'AI辅助代码生成',
        icon: <Code className="w-4 h-4" />,
        category: 'ai',
        isComingSoon: true
      },
      {
        id: 'email-polish',
        name: '邮件润色',
        description: '专业邮件内容优化',
        icon: <Mail className="w-4 h-4" />,
        category: 'ai',
        isNew: true,
        isComingSoon: true
      },
      {
        id: 'creative-writing',
        name: '创意写作',
        description: 'AI创意内容生成',
        icon: <Zap className="w-4 h-4" />,
        category: 'ai',
        isComingSoon: true
      }
    ]
  }
]

export default function MoreToolsPanel({ open, onOpenChange, onToolSelect }: MoreToolsPanelProps) {
  const t = useTranslations()
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['document', 'image'])
  const [filteredTools, setFilteredTools] = useState<ToolItem[]>([])

  // 获取所有工具的扁平列表
  const allTools = toolCategories.flatMap(category => 
    category.tools.map(tool => ({ ...tool, categoryName: category.name }))
  )

  // 搜索过滤
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredTools([])
    } else {
      const filtered = allTools.filter(tool =>
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredTools(filtered)
    }
  }, [searchQuery])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleToolClick = (tool: ToolItem) => {
    if (tool.isComingSoon) {
      // 显示即将推出的提示
      return
    }
    
    onToolSelect(tool)
    onOpenChange(false)
  }

  const getCategoryColor = (color: string) => {
    const colors = {
      green: 'text-green-800 bg-green-50 border-green-200',
      purple: 'text-purple-800 bg-purple-50 border-purple-200',
      orange: 'text-orange-800 bg-orange-50 border-orange-200',
      blue: 'text-blue-800 bg-blue-50 border-blue-200'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const getToolButtonStyle = (tool: ToolItem) => {
    if (tool.isComingSoon) {
      return "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed hover:bg-gray-50"
    }
    return "bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-purple-300"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="h-full w-full sm:h-full sm:w-[450px] p-0 fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto border-0 rounded-none sm:border-l shadow-2xl bg-white z-50 data-[state=open]:slide-in-from-right-0 data-[state=closed]:slide-out-to-right-0"
        style={{
          margin: 0,
          transform: 'none',
          maxHeight: '100vh',
          maxWidth: '100vw',
        }}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <style jsx global>{`
          /* 确保Dialog正确定位 */
          [data-radix-dialog-content] {
            position: fixed !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: 100vw !important;
            max-height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            transform: translateX(0) !important;
            background: white;
            z-index: 50;
          }
          
          /* 隐藏Dialog默认的关闭按钮 */
          [data-radix-dialog-content] button[data-radix-dialog-close] {
            display: none !important;
          }
          
          @media (min-width: 640px) {
            [data-radix-dialog-content] {
              width: 450px !important;
              max-width: 450px !important;
              border-left: 1px solid #e5e7eb !important;
            }
          }
          
          /* 滑动动画 */
          @keyframes slideInFromRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          
          @keyframes slideOutToRight {
            from { transform: translateX(0); }
            to { transform: translateX(100%); }
          }
          
          [data-state=open] {
            animation: slideInFromRight 300ms cubic-bezier(0.16, 1, 0.3, 1);
          }
          
          [data-state=closed] {
            animation: slideOutToRight 300ms cubic-bezier(0.16, 1, 0.3, 1);
          }
          
          /* 强制移动端全屏 */
          @media (max-width: 639px) {
            [data-radix-dialog-content] {
              left: 0 !important;
              width: 100vw !important;
              max-width: 100vw !important;
            }
          }
        `}</style>
        
        <DialogHeader className="px-6 py-4 border-b bg-white">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-purple-600" />
            </div>
            {/* <span className="text-lg font-semibold text-gray-800">功能工具箱</span> */}

            <a
                href="/"
                className="ml-auto text-lg font-semibold text-purple-600 hover:underline"
            >
                其他工具
            </a>
            </div>
            {/* <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 p-0 text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button> */}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 搜索栏 */}
          <div className="px-6 py-4 border-b bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="搜索功能..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="p-6 space-y-6">
              {/* 搜索结果 */}
              {searchQuery.trim() && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    搜索结果 ({filteredTools.length})
                  </h3>
                  {filteredTools.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {filteredTools.map((tool) => (
                        <Button
                          key={tool.id}
                          variant="outline"
                          className={`h-auto p-4 justify-start text-left ${getToolButtonStyle(tool)}`}
                          onClick={() => handleToolClick(tool)}
                          disabled={tool.isComingSoon}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              {tool.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{tool.name}</span>
                                {tool.isNew && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5">
                                    新功能
                                  </Badge>
                                )}
                                {tool.isComingSoon && (
                                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5">
                                    即将推出
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 line-clamp-2">{tool.description}</p>
                              <p className="text-xs text-purple-600 mt-1">{(tool as any).categoryName}</p>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">未找到相关功能</p>
                    </div>
                  )}
                </div>
              )}

              {/* 分类展示 */}
              {!searchQuery.trim() && (
                <div className="space-y-4">
                  {toolCategories.map((category) => (
                    <Card key={category.id} className="border border-gray-200 shadow-sm">
                      <CardHeader 
                        className={`p-4 cursor-pointer hover:bg-gray-50 ${getCategoryColor(category.color)}`}
                        onClick={() => toggleCategory(category.id)}
                      >
                        <CardTitle className="flex items-center justify-between text-base">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                              {category.icon}
                            </div>
                            <span>{category.name}</span>
                            <Badge variant="secondary" className="bg-white/50 text-current text-xs">
                              {category.tools.length}
                            </Badge>
                          </div>
                          {expandedCategories.includes(category.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </CardTitle>
                      </CardHeader>

                      {expandedCategories.includes(category.id) && (
                        <CardContent className="p-4 pt-0 space-y-2">
                          {category.tools.map((tool) => (
                            <Button
                              key={tool.id}
                              variant="outline"
                              className={`w-full h-auto p-3 justify-start text-left ${getToolButtonStyle(tool)}`}
                              onClick={() => handleToolClick(tool)}
                              disabled={tool.isComingSoon}
                            >
                              <div className="flex items-start gap-3 w-full">
                                <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
                                  {tool.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">{tool.name}</span>
                                    {tool.isNew && (
                                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs px-1.5 py-0.5">
                                        新
                                      </Badge>
                                    )}
                                    {tool.isComingSoon && (
                                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs px-1.5 py-0.5">
                                        即将推出
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 line-clamp-2">{tool.description}</p>
                                </div>
                              </div>
                            </Button>
                          ))}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              {/* 底部说明 */}
              <div className="text-center text-xs text-gray-400 py-4">
                更多功能正在开发中，敬请期待...
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export type { ToolItem }
