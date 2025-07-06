/**
 * Authentication utility functions
 */

export interface AuthUser {
  id: string
  username: string
  email: string
  displayName: string
  role: "admin" | "user"
  permissions: string[]
}

/**
 * Check if user has specific permission
 */
export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false
  return user.permissions.includes(permission) || user.role === "admin"
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === "admin"
}

/**
 * Check if user has user role
 */
export function isUser(user: AuthUser | null): boolean {
  return user?.role === "user"
}

/**
 * Get user display name or fallback
 */
export function getUserDisplayName(user: AuthUser | null, fallback = "Unknown User"): string {
  return user?.displayName || user?.username || fallback
}

/**
 * Get user initials for avatar
 */
export function getUserInitials(user: AuthUser | null): string {
  if (!user) return "U"
  
  const name = user.displayName || user.username
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 6) {
    errors.push("Password must be at least 6 characters long")
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }
  
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number")
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Sanitize username (remove special characters, convert to lowercase)
 */
export function sanitizeUsername(username: string): string {
  return username
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^[_-]+|[_-]+$/g, "")
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Check if token is expired
 */
export function isTokenExpired(exp: number): boolean {
  return Date.now() >= exp * 1000
}

/**
 * Get token expiration time in seconds
 */
export function getTokenExpirationTime(exp: number): number {
  return Math.max(0, exp - Math.floor(Date.now() / 1000))
} 