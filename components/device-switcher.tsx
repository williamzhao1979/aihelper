"use client"

import { useState } from "react"
import { useRouter, usePathname } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Monitor, Smartphone, Settings } from "lucide-react"

interface DeviceSwitcherProps {
  currentDevice: "mobile" | "desktop"
}

export default function DeviceSwitcher({ currentDevice }: DeviceSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const switchToDevice = (device: "mobile" | "desktop") => {
    const basePath = pathname.replace(/\/(mobile|desktop)$/, "")
    const newPath = `${basePath}/${device}`
    router.push(newPath)
    setIsOpen(false)
  }

  const getCurrentIcon = () => {
    return currentDevice === "mobile" ? <Smartphone className="h-4 w-4" /> : <Monitor className="h-4 w-4" />
  }

  const getCurrentLabel = () => {
    return currentDevice === "mobile" ? "Mobile" : "Desktop"
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white/90"
        >
          {getCurrentIcon()}
          <span className="hidden sm:inline">{getCurrentLabel()}</span>
          <Settings className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => switchToDevice("desktop")}
          className="flex items-center gap-2"
          disabled={currentDevice === "desktop"}
        >
          <Monitor className="h-4 w-4" />
          <span>Desktop Version</span>
          {currentDevice === "desktop" && <span className="ml-auto text-xs text-green-600">Current</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => switchToDevice("mobile")}
          className="flex items-center gap-2"
          disabled={currentDevice === "mobile"}
        >
          <Smartphone className="h-4 w-4" />
          <span>Mobile Version</span>
          {currentDevice === "mobile" && <span className="ml-auto text-xs text-green-600">Current</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
