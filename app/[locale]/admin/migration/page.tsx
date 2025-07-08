"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle, AlertCircle, Database } from 'lucide-react'
import { migrateUserPaths, migrateAllUsers, getUsersNeedingMigration } from '@/scripts/migrate-user-paths'

interface MigrationResult {
  success: boolean;
  migratedFiles: string[];
  errors: string[];
  summary: {
    totalFiles: number;
    migratedCount: number;
    errorCount: number;
  };
}

export default function MigrationToolPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState('1751693499371')
  const [result, setResult] = useState<MigrationResult | null>(null)
  const [usersNeedingMigration, setUsersNeedingMigration] = useState<string[]>([])
  const [progress, setProgress] = useState(0)

  const handleCheckUsers = async () => {
    setIsLoading(true)
    try {
      const users = await getUsersNeedingMigration()
      setUsersNeedingMigration(users)
    } catch (error) {
      console.error('检查用户失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMigrateUser = async () => {
    if (!userId.trim()) return
    
    setIsLoading(true)
    setProgress(0)
    setResult(null)
    
    try {
      setProgress(25)
      const migrationResult = await migrateUserPaths(userId.trim())
      setProgress(100)
      setResult(migrationResult)
    } catch (error) {
      console.error('迁移失败:', error)
      setResult({
        success: false,
        migratedFiles: [],
        errors: [`迁移失败: ${error}`],
        summary: { totalFiles: 0, migratedCount: 0, errorCount: 1 }
      })
      setProgress(100)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMigrateAll = async () => {
    setIsLoading(true)
    setProgress(0)
    setResult(null)
    
    try {
      setProgress(10)
      const migrationResult = await migrateAllUsers()
      setProgress(100)
      setResult(migrationResult)
    } catch (error) {
      console.error('批量迁移失败:', error)
      setResult({
        success: false,
        migratedFiles: [],
        errors: [`批量迁移失败: ${error}`],
        summary: { totalFiles: 0, migratedCount: 0, errorCount: 1 }
      })
      setProgress(100)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">数据迁移工具</h1>
              <p className="text-sm text-gray-600">统一用户ID格式，修复重复的user_前缀问题</p>
            </div>
          </div>
        </div>

        {/* 检查需要迁移的用户 */}
        <Card>
          <CardHeader>
            <CardTitle>检查需要迁移的用户</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleCheckUsers} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? '检查中...' : '检查需要迁移的用户'}
            </Button>
            
            {usersNeedingMigration.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  发现需要迁移的用户: {usersNeedingMigration.join(', ')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 单用户迁移 */}
        <Card>
          <CardHeader>
            <CardTitle>单用户迁移</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">用户ID</Label>
              <Input
                id="userId"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="输入用户ID (例如: 1751693499371)"
                className="w-full"
              />
              <p className="text-sm text-gray-500">
                将迁移 users/user_user_{userId} 到 users/user_{userId}
              </p>
            </div>
            
            <Button 
              onClick={handleMigrateUser} 
              disabled={isLoading || !userId.trim()}
              className="w-full"
            >
              {isLoading ? '迁移中...' : '开始迁移'}
            </Button>
          </CardContent>
        </Card>

        {/* 批量迁移 */}
        <Card>
          <CardHeader>
            <CardTitle>批量迁移所有用户</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                这将迁移所有发现的重复前缀用户数据。请确保您有充足的时间完成此操作。
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={handleMigrateAll} 
              disabled={isLoading}
              className="w-full"
              variant="destructive"
            >
              {isLoading ? '批量迁移中...' : '开始批量迁移'}
            </Button>
          </CardContent>
        </Card>

        {/* 进度条 */}
        {isLoading && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>迁移进度</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* 迁移结果 */}
        {result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span>迁移结果</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 统计信息 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.summary.totalFiles}
                  </div>
                  <div className="text-sm text-gray-600">总文件数</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {result.summary.migratedCount}
                  </div>
                  <div className="text-sm text-gray-600">迁移成功</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {result.summary.errorCount}
                  </div>
                  <div className="text-sm text-gray-600">迁移失败</div>
                </div>
              </div>

              {/* 成功的文件列表 */}
              {result.migratedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600">成功迁移的文件:</h4>
                  <div className="max-h-40 overflow-y-auto bg-green-50 p-3 rounded-lg">
                    {result.migratedFiles.map((file, index) => (
                      <div key={index} className="text-sm text-green-700 font-mono">
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 错误列表 */}
              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">错误信息:</h4>
                  <div className="max-h-40 overflow-y-auto bg-red-50 p-3 rounded-lg">
                    {result.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-700">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 总体状态 */}
              <Alert>
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  {result.success 
                    ? '✅ 迁移完全成功！所有文件都已正确迁移到新的路径格式。'
                    : '⚠️ 迁移过程中出现了一些问题。请检查错误信息并手动处理失败的文件。'
                  }
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
