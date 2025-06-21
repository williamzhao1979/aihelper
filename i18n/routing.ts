import { defineRouting } from "next-intl/routing"
import { createNavigation } from "next-intl/navigation"

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ["en", "zh", "ja"],

  // Used when no locale matches
  defaultLocale: "zh",

  // The `pathnames` object maps internal pathnames to localized ones
  pathnames: {
    "/": "/",
    "/chat": "/chat",
    "/chat/desktop": "/chat/desktop",
    "/chat/mobile": "/chat/mobile",
    "/textreview": "/textreview",
    "/artreview": "/artreview",
    "/daddygo": "/daddygo",
    "/dashang": "/dashang",
    "/subscription": "/subscription",
    "/subscription/success": "/subscription/success",
    "/subscription/canceled": "/subscription/canceled",
    "/api/chat": "/api/chat",
  },
})

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
