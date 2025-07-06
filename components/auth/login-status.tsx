"use client"

import { useAuth } from "@/components/auth/auth-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LogIn, LogOut, User } from "lucide-react"
import Link from "next/link"

interface LoginStatusProps {
  showUserInfo?: boolean
  className?: string
}

export function LoginStatus({ showUserInfo = true, className = "" }: LoginStatusProps) {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-pulse bg-gray-200 h-4 w-4 rounded"></div>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    )
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showUserInfo && (
          <>
            <User className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">
              {user.displayName}
            </span>
            <Badge variant="secondary" className="text-xs">
              {user.role}
            </Badge>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            // Handle logout
            await fetch("/api/auth/env-logout", { method: "POST" })
            window.location.reload()
          }}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4 mr-1" />
          <span className="text-xs">Logout</span>
        </Button>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Link href="/auth/login">
        <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700">
          <LogIn className="h-4 w-4 mr-1" />
          <span className="text-xs">Login</span>
        </Button>
      </Link>
    </div>
  )
} 