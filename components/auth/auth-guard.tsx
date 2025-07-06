"use client"

import { useAuth } from "@/components/auth/auth-context"
import { LoginForm } from "@/components/auth/login-form"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  showLoginForm?: boolean
}

export function AuthGuard({ 
  children, 
  fallback,
  showLoginForm = true 
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const t = useTranslations()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-gray-600">{t("common.loading")}</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>
    }

    if (showLoginForm) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
          <LoginForm 
            onSubmit={async (username, password) => {
              // This will be handled by the login form component
              throw new Error("Please use the login page")
            }}
            showTestAccounts={true}
          />
        </div>
      )
    }

    return null
  }

  return <>{children}</>
} 