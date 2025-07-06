"use client"

import { useAuth } from "@/components/auth/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"

export default function AuthDebugPage() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [testResult, setTestResult] = useState<string>("")
  const [clientInfo, setClientInfo] = useState<any>(null)

  useEffect(() => {
    // 只在客户端执行，避免 hydration 错误
    setClientInfo({
      currentUrl: window.location.href,
      userAgent: window.navigator.userAgent
    })
  }, [])

  const checkCookies = () => {
    const cookies = document.cookie
    console.log("All cookies:", cookies)
    setDebugInfo({ cookies })
  }

  const testLogin = async () => {
    try {
      setTestResult("Testing login...")
      await login("admin", "admin123456")
      setTestResult("Login successful!")
    } catch (error) {
      setTestResult(`Login failed: ${error}`)
    }
  }

  const testLogout = async () => {
    try {
      setTestResult("Testing logout...")
      await logout()
      setTestResult("Logout successful!")
    } catch (error) {
      setTestResult(`Logout failed: ${error}`)
    }
  }

  const testAuthAPI = async () => {
    try {
      setTestResult("Testing auth API...")
      const response = await fetch("/api/auth/env-validate")
      const data = await response.json()
      setTestResult(`API response: ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      setTestResult(`API test failed: ${error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Authentication Debug Page
          </h1>
          <p className="text-gray-600">
            Debug authentication issues and test functionality
          </p>
        </div>

        {/* Status */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Loading:</span>
                {isLoading ? (
                  <Badge variant="secondary">Yes</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800">No</Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Authenticated:</span>
                {isAuthenticated ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Yes
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    No
                  </Badge>
                )}
              </div>

              {user && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">User Info:</div>
                  <div className="text-sm text-gray-600">
                    <div>ID: {user.id}</div>
                    <div>Username: {user.username}</div>
                    <div>Email: {user.email}</div>
                    <div>Display Name: {user.displayName}</div>
                    <div>Role: {user.role}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Debug Tools */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button onClick={checkCookies} variant="outline">
                  Check Cookies
                </Button>
                <Button onClick={testLogin} variant="outline">
                  Test Login
                </Button>
                <Button onClick={testLogout} variant="outline">
                  Test Logout
                </Button>
                <Button onClick={testAuthAPI} variant="outline">
                  Test Auth API
                </Button>
              </div>

              {debugInfo && (
                <div className="mt-4 p-4 bg-gray-100 rounded">
                  <h4 className="font-medium mb-2">Debug Info:</h4>
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              )}

              {testResult && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                  <h4 className="font-medium mb-2">Test Result:</h4>
                  <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Environment Info */}
        <Card>
          <CardHeader>
            <CardTitle>Environment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>NODE_ENV: {process.env.NODE_ENV}</div>
              <div>AUTH_ENABLED: {process.env.NEXT_PUBLIC_AUTH_ENABLED || 'Not set'}</div>
              {clientInfo && (
                <>
                  <div>Current URL: {clientInfo.currentUrl}</div>
                  <div>User Agent: {clientInfo.userAgent}</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardHeader>
            <CardTitle>Navigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => window.location.href = '/zh/healthcalendar'}
                variant="outline"
              >
                Go to Health Calendar
              </Button>
              <Button 
                onClick={() => window.location.href = '/zh/auth/login'}
                variant="outline"
              >
                Go to Login
              </Button>
              <Button 
                onClick={() => window.location.href = '/zh/auth/test-fix'}
                variant="outline"
              >
                Go to Test Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 