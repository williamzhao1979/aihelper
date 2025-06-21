"use client"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Monitor, Smartphone, Settings } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

export default function DeviceSwitcher() {
  const router = useRouter()
  const pathname = usePathname()

  const currentDevice = pathname.includes("/desktop") ? "desktop" : "mobile"

  const switchDevice = (device: "desktop" | "mobile") => {
    const basePath = pathname.replace(/\/(desktop|mobile)$/, "")
    router.push(`${basePath}/${device}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {currentDevice === "desktop" ? (
            <>
              <Monitor className="h-4 w-4" />
              Desktop
            </>
          ) : (
            <>
              <Smartphone className="h-4 w-4" />
              Mobile
            </>
          )}
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => switchDevice("desktop")} className="gap-2">
          <Monitor className="h-4 w-4" />
          Desktop Version
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => switchDevice("mobile")} className="gap-2">
          <Smartphone className="h-4 w-4" />
          Mobile Version
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
