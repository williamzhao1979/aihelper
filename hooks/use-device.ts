"use client"

import { useState, useEffect } from "react"
import { getDeviceInfo } from "@/lib/device-detection"

export function useDevice() {
  const [deviceInfo, setDeviceInfo] = useState(() => getDeviceInfo())
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setDeviceInfo(getDeviceInfo())

    const handleResize = () => {
      setDeviceInfo(getDeviceInfo())
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return {
    ...deviceInfo,
    isClient,
    isMobile: deviceInfo.device === "mobile",
    isDesktop: deviceInfo.device === "desktop",
  }
}
