"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useHealthDatabase } from "@/hooks/use-health-database"
import { useToast } from "@/hooks/use-toast"
import { getLocalDateString, getLocalDateTimeString } from "@/lib/utils"

export default function DebugPage() {
  const { toast } = useToast()
  const { 
    isInitialized, 
    isLoading, 
    error, 
    saveRecord, 
    getAllRecords, 
    getStatistics,
    clearAllData 
  } = useHealthDatabase()
  
  const [records, setRecords] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)

  const loadRecords = async () => {
    try {
      const allRecords = await getAllRecords()
      setRecords(allRecords)
      toast({
        title: "数据加载成功",
        description: `加载了 ${allRecords.length} 条记录`,
      })
    } catch (error) {
      console.error("加载记录失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载记录",
        variant: "destructive",
      })
    }
  }

  const loadStats = async () => {
    try {
      const statistics = await getStatistics()
      setStats(statistics)
    } catch (error) {
      console.error("加载统计失败:", error)
    }
  }

  const addTestRecord = async () => {
    try {
      // 获取本地时间
      const now = new Date()
      const localDate = getLocalDateString(now)
      const localDateTime = getLocalDateTimeString(now)
      
      const testRecord = {
        date: localDate,
        datetime: localDateTime,
        type: "poop" as const,
        poopType: "type4",
        poopColor: "brown",
        poopSmell: "normal",
        notes: "测试记录"
      }
      
      const recordId = await saveRecord(testRecord)
      toast({
        title: "测试记录添加成功",
        description: `记录ID: ${recordId}`,
      })
      
      // 重新加载记录
      await loadRecords()
    } catch (error) {
      console.error("添加测试记录失败:", error)
      toast({
        title: "添加失败",
        description: "无法添加测试记录",
        variant: "destructive",
      })
    }
  }

  const clearData = async () => {
    try {
      await clearAllData()
      setRecords([])
      setStats(null)
      toast({
        title: "数据清除成功",
        description: "所有数据已清除",
      })
    } catch (error) {
      console.error("清除数据失败:", error)
      toast({
        title: "清除失败",
        description: "无法清除数据",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (isInitialized) {
      loadRecords()
      loadStats()
    }
  }, [isInitialized])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>数据库状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>初始化状态:</strong> {isInitialized ? "✅ 已初始化" : "❌ 未初始化"}</p>
              <p><strong>加载状态:</strong> {isLoading ? "⏳ 加载中" : "✅ 已完成"}</p>
              {error && <p><strong>错误:</strong> <span className="text-red-600">{error}</span></p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button onClick={loadRecords} disabled={!isInitialized}>
                重新加载记录
              </Button>
              <Button onClick={addTestRecord} disabled={!isInitialized}>
                添加测试记录
              </Button>
              <Button onClick={loadStats} disabled={!isInitialized}>
                加载统计
              </Button>
              <Button onClick={clearData} disabled={!isInitialized} variant="destructive">
                清除所有数据
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>统计信息</CardTitle>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="space-y-2">
                <p><strong>总记录数:</strong> {stats.totalRecords}</p>
                <p><strong>按类型统计:</strong></p>
                <ul className="list-disc list-inside ml-4">
                  {Object.entries(stats.recordsByType).map(([type, count]) => (
                    <li key={type}>{type}: {count as number}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>暂无统计信息</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>所有记录 ({records.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {records.length > 0 ? (
              <div className="space-y-4">
                {records.map((record) => (
                  <div key={record.id} className="border p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>ID:</strong> {record.id}
                      </div>
                      <div>
                        <strong>日期:</strong> {record.date}
                      </div>
                      <div>
                        <strong>类型:</strong> {record.type}
                      </div>
                      <div>
                        <strong>创建时间:</strong> {new Date(record.createdAt).toLocaleString()}
                      </div>
                      {record.poopType && (
                        <div>
                          <strong>便便类型:</strong> {record.poopType}
                        </div>
                      )}
                      {record.poopColor && (
                        <div>
                          <strong>便便颜色:</strong> {record.poopColor}
                        </div>
                      )}
                      {record.notes && (
                        <div className="col-span-2">
                          <strong>备注:</strong> {record.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>暂无记录</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 