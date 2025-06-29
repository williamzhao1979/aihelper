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
    clearAllData,
    migrateToMultiUser,
    updateRecordsOwner,
    getMigrationStatus,
    updateRecord
  } = useHealthDatabase()
  
  const [records, setRecords] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [migrationStatus, setMigrationStatus] = useState<any>(null)
  const [isMigrating, setIsMigrating] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

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

  const loadMigrationStatus = async () => {
    try {
      const status = await getMigrationStatus()
      setMigrationStatus(status)
    } catch (error) {
      console.error("加载迁移状态失败:", error)
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
        notes: "测试记录",
        uniqueOwnerId: "user_001",
        ownerId: "device_001",
        ownerName: "本人"
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
      setMigrationStatus(null)
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

  const migrateData = async () => {
    try {
      setIsMigrating(true)
      const result = await migrateToMultiUser()
      toast({
        title: "数据迁移完成",
        description: `成功迁移 ${result.migrated} 条记录，失败 ${result.errors} 条`,
      })
      await loadRecords()
      await loadMigrationStatus()
    } catch (error) {
      console.error("数据迁移失败:", error)
      toast({
        title: "迁移失败",
        description: "无法迁移数据",
        variant: "destructive",
      })
    } finally {
      setIsMigrating(false)
    }
  }

  const updateOwner = async () => {
    try {
      const result = await updateRecordsOwner("user_001", "user_002", "孩子妈妈", "user_002")
      toast({
        title: "拥有者更新完成",
        description: `成功更新 ${result.updated} 条记录，失败 ${result.errors} 条`,
      })
      await loadRecords()
    } catch (error) {
      console.error("更新拥有者失败:", error)
      toast({
        title: "更新失败",
        description: "无法更新拥有者",
        variant: "destructive",
      })
    }
  }

  const checkJune29Records = async () => {
    try {
      const allRecords = await getAllRecords()
      const june29Records = allRecords.filter(record => record.date === "2024-06-29")
      
      console.log("6月29日的所有记录:", june29Records)
      
      // 检查记录的拥有者信息
      june29Records.forEach((record, index) => {
        console.log(`记录 ${index + 1}:`, {
          id: record.id,
          date: record.date,
          type: record.type,
          ownerId: record.ownerId,
          uniqueOwnerId: record.uniqueOwnerId,
          ownerName: record.ownerName
        })
      })
      
      toast({
        title: "6月29日记录检查",
        description: `找到 ${june29Records.length} 条记录`,
      })
      
      // 更新记录显示
      setRecords(june29Records)
    } catch (error) {
      console.error("检查6月29日记录失败:", error)
      toast({
        title: "检查失败",
        description: "无法检查6月29日记录",
        variant: "destructive",
      })
    }
  }

  const debugCalendarIssue = async () => {
    try {
      const allRecords = await getAllRecords()
      
      // 检查所有6月的记录
      const juneRecords = allRecords.filter(record => record.date.startsWith('2024-06'))
      console.log("6月所有记录:", juneRecords)
      
      // 检查日期格式
      const dateFormats = [...new Set(juneRecords.map(r => r.date))]
      console.log("6月记录的日期格式:", dateFormats)
      
      // 检查用户字段
      const userFields = juneRecords.map(r => ({
        date: r.date,
        ownerId: r.ownerId,
        uniqueOwnerId: r.uniqueOwnerId,
        ownerName: r.ownerName
      }))
      console.log("6月记录的用户字段:", userFields)
      
      toast({
        title: "日历问题调试",
        description: `检查了 ${juneRecords.length} 条6月记录`,
      })
      
    } catch (error) {
      console.error("调试日历问题失败:", error)
      toast({
        title: "调试失败",
        description: "无法调试日历问题",
        variant: "destructive",
      })
    }
  }

  const showAllRecords = async () => {
    try {
      const allRecords = await getAllRecords()
      console.log("所有记录:", allRecords)
      
      // 更新记录显示为所有记录
      setRecords(allRecords)
      
      toast({
        title: "显示所有记录",
        description: `显示了 ${allRecords.length} 条记录（无用户过滤）`,
      })
      
    } catch (error) {
      console.error("显示所有记录失败:", error)
      toast({
        title: "显示失败",
        description: "无法显示所有记录",
        variant: "destructive",
      })
    }
  }

  const toggleDebugMode = () => {
    const currentMode = localStorage.getItem('healthCalendarDebugMode') === 'true'
    const newMode = !currentMode
    localStorage.setItem('healthCalendarDebugMode', newMode.toString())
    
    toast({
      title: "调试模式切换",
      description: newMode ? "已启用调试模式（显示所有记录）" : "已禁用调试模式",
    })
    
    // 刷新页面以应用更改
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  const fixJune29Records = async () => {
    try {
      const allRecords = await getAllRecords()
      const june29Records = allRecords.filter(record => record.date === "2024-06-29")
      
      console.log("找到6月29日记录:", june29Records)
      
      if (june29Records.length === 0) {
        toast({
          title: "没有找到记录",
          description: "6月29日没有找到任何记录",
        })
        return
      }
      
      // 检查并修复用户字段
      let fixedCount = 0
      for (const record of june29Records) {
        if (!record.uniqueOwnerId || !record.ownerId || !record.ownerName) {
          // 更新记录的用户字段
          const updatedRecord = {
            ...record,
            uniqueOwnerId: record.uniqueOwnerId || "user_001",
            ownerId: record.ownerId || "device_001", 
            ownerName: record.ownerName || "本人",
            recordId: record.recordId || `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            updatedAt: new Date()
          }
          
          await updateRecord(record.id, updatedRecord)
          fixedCount++
          console.log(`修复记录 ${record.id}:`, updatedRecord)
        }
      }
      
      toast({
        title: "修复完成",
        description: `修复了 ${fixedCount} 条6月29日记录的用户字段`,
      })
      
      // 重新加载记录
      await loadRecords()
      
    } catch (error) {
      console.error("修复6月29日记录失败:", error)
      toast({
        title: "修复失败",
        description: "无法修复6月29日记录",
        variant: "destructive",
      })
    }
  }

  const checkLatestRecords = async () => {
    try {
      const allRecords = await getAllRecords()
      
      // 按创建时间排序，获取最新的5条记录
      const sortedRecords = allRecords.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const latestRecords = sortedRecords.slice(0, 5)
      
      console.log("最新的5条记录:", latestRecords)
      
      // 检查每条记录的详细信息
      latestRecords.forEach((record, index) => {
        console.log(`记录 ${index + 1}:`, {
          id: record.id,
          date: record.date,
          type: record.type,
          uniqueOwnerId: record.uniqueOwnerId,
          ownerId: record.ownerId,
          ownerName: record.ownerName,
          createdAt: new Date(record.createdAt).toLocaleString(),
          poopType: record.poopType,
          poopColor: record.poopColor
        })
      })
      
      // 检查今天的记录
      const today = getLocalDateString(new Date())
      const todayRecords = allRecords.filter(record => record.date === today)
      console.log(`今天的记录 (${today}):`, todayRecords)
      
      toast({
        title: "最新记录检查",
        description: `检查了 ${latestRecords.length} 条最新记录，今天有 ${todayRecords.length} 条记录`,
      })
      
      // 更新记录显示为最新记录
      setRecords(latestRecords)
      
    } catch (error) {
      console.error("检查最新记录失败:", error)
      toast({
        title: "检查失败",
        description: "无法检查最新记录",
        variant: "destructive",
      })
    }
  }

  const checkUserAndRecords = async () => {
    try {
      // 获取所有用户
      const storedUsers = localStorage.getItem('healthcalendar_users')
      const users = storedUsers ? JSON.parse(storedUsers) : []
      console.log("所有用户:", users)
      
      // 获取主用户
      const primaryUser = users.find((user: any) => user.role === 'primary') || users[0]
      console.log("主用户:", primaryUser)
      
      // 获取所有记录
      const allRecords = await getAllRecords()
      console.log("所有记录:", allRecords)
      
      // 检查记录的拥有者分布
      const ownerDistribution = allRecords.reduce((acc: any, record) => {
        const ownerId = record.uniqueOwnerId || record.ownerId || 'unknown'
        acc[ownerId] = (acc[ownerId] || 0) + 1
        return acc
      }, {})
      console.log("记录拥有者分布:", ownerDistribution)
      
      // 检查今天的记录
      const today = getLocalDateString(new Date())
      const todayRecords = allRecords.filter(record => record.date === today)
      console.log(`今天的记录 (${today}):`, todayRecords)
      
      // 检查主用户的记录
      if (primaryUser) {
        const primaryUserRecords = allRecords.filter(record => 
          record.uniqueOwnerId === primaryUser.uniqueOwnerId || 
          record.ownerId === primaryUser.ownerId
        )
        console.log("主用户的记录:", primaryUserRecords)
      }
      
      toast({
        title: "用户和记录检查",
        description: `检查了 ${users.length} 个用户和 ${allRecords.length} 条记录`,
      })
      
    } catch (error) {
      console.error("检查用户和记录失败:", error)
      toast({
        title: "检查失败",
        description: "无法检查用户和记录",
        variant: "destructive",
      })
    }
  }

  const fixAllRecordsUserFields = async () => {
    try {
      // 获取主用户
      const storedUsers = localStorage.getItem('healthcalendar_users')
      const users = storedUsers ? JSON.parse(storedUsers) : []
      const primaryUser = users.find((user: any) => user.role === 'primary') || users[0]
      
      if (!primaryUser) {
        toast({
          title: "没有找到主用户",
          description: "请先设置主用户",
          variant: "destructive",
        })
        return
      }
      
      const allRecords = await getAllRecords()
      let fixedCount = 0
      
      console.log("开始修复所有记录的用户字段...")
      console.log("主用户信息:", primaryUser)
      
      for (const record of allRecords) {
        // 检查记录是否缺少用户字段
        if (!record.uniqueOwnerId || !record.ownerId || !record.ownerName) {
          const updatedRecord = {
            ...record,
            uniqueOwnerId: record.uniqueOwnerId || primaryUser.uniqueOwnerId,
            ownerId: record.ownerId || primaryUser.ownerId,
            ownerName: record.ownerName || primaryUser.ownerName,
            recordId: record.recordId || `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            updatedAt: new Date()
          }
          
          await updateRecord(record.id, updatedRecord)
          fixedCount++
          console.log(`修复记录 ${record.id}:`, {
            old: { uniqueOwnerId: record.uniqueOwnerId, ownerId: record.ownerId, ownerName: record.ownerName },
            new: { uniqueOwnerId: updatedRecord.uniqueOwnerId, ownerId: updatedRecord.ownerId, ownerName: updatedRecord.ownerName }
          })
        }
      }
      
      console.log(`修复完成: 成功修复 ${fixedCount} 条记录`)
      
      toast({
        title: "修复完成",
        description: `成功修复 ${fixedCount} 条记录的用户字段`,
      })
      
      // 重新加载记录
      await loadRecords()
      
    } catch (error) {
      console.error("修复所有记录失败:", error)
      toast({
        title: "修复失败",
        description: "无法修复记录",
        variant: "destructive",
      })
    }
  }

  // 检查调试模式状态
  useEffect(() => {
    const mode = localStorage.getItem('healthCalendarDebugMode') === 'true'
    setDebugMode(mode)
  }, [])

  useEffect(() => {
    if (isInitialized) {
      loadRecords()
      loadStats()
      loadMigrationStatus()
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
              <p><strong>调试模式:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  debugMode ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {debugMode ? '已启用' : '已禁用'}
                </span>
              </p>
              {error && <p><strong>错误:</strong> <span className="text-red-600">{error}</span></p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>数据迁移状态</CardTitle>
          </CardHeader>
          <CardContent>
            {migrationStatus ? (
              <div className="space-y-2">
                <p><strong>总记录数:</strong> {migrationStatus.totalRecords}</p>
                <p><strong>已迁移记录:</strong> {migrationStatus.migratedRecords}</p>
                <p><strong>需要迁移:</strong> {migrationStatus.needsMigration}</p>
                <p><strong>迁移状态:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    migrationStatus.migrationStatus === 'completed' ? 'bg-green-100 text-green-800' :
                    migrationStatus.migrationStatus === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {migrationStatus.migrationStatus === 'completed' ? '已完成' :
                     migrationStatus.migrationStatus === 'in_progress' ? '进行中' : '未开始'}
                  </span>
                </p>
              </div>
            ) : (
              <p>加载迁移状态中...</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button onClick={loadRecords} disabled={!isInitialized}>
                重新加载记录
              </Button>
              <Button onClick={addTestRecord} disabled={!isInitialized}>
                添加测试记录
              </Button>
              <Button onClick={loadStats} disabled={!isInitialized}>
                加载统计
              </Button>
              <Button onClick={loadMigrationStatus} disabled={!isInitialized}>
                检查迁移状态
              </Button>
              <Button 
                onClick={migrateData} 
                disabled={!isInitialized || isMigrating}
                variant="outline"
              >
                {isMigrating ? "迁移中..." : "迁移到多用户版本"}
              </Button>
              <Button 
                onClick={updateOwner} 
                disabled={!isInitialized}
                variant="outline"
              >
                更新拥有者
              </Button>
              <Button onClick={clearData} disabled={!isInitialized} variant="destructive">
                清除所有数据
              </Button>
              <Button onClick={checkJune29Records} disabled={!isInitialized}>
                检查6月29日记录
              </Button>
              <Button onClick={debugCalendarIssue} disabled={!isInitialized}>
                调试日历问题
              </Button>
              <Button onClick={showAllRecords} disabled={!isInitialized}>
                显示所有记录
              </Button>
              <Button onClick={toggleDebugMode} disabled={!isInitialized}>
                切换调试模式
              </Button>
              <Button onClick={fixJune29Records} disabled={!isInitialized}>
                修复6月29日记录
              </Button>
              <Button onClick={checkLatestRecords} disabled={!isInitialized}>
                检查最新记录
              </Button>
              <Button onClick={checkUserAndRecords} disabled={!isInitialized}>
                检查用户和记录
              </Button>
              <Button onClick={fixAllRecordsUserFields} disabled={!isInitialized}>
                修复所有记录的用户字段
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
                      <div>
                        <strong>拥有者:</strong> {record.ownerName || '未知'}
                      </div>
                      <div>
                        <strong>拥有者ID:</strong> {record.ownerId || '未知'}
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