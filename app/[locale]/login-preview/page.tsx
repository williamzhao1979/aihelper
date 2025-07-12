"use client"

import React, { useState } from "react"
import LoginMinimal from "@/components/auth/login-minimal"
import LoginWellness from "@/components/auth/login-wellness"
import LoginModern from "@/components/auth/login-modern"

export default function LoginPreview() {
  const [design, setDesign] = useState("minimal")

  return (
    <div>
      <div className="flex justify-center gap-4 p-4">
        <button onClick={() => setDesign("minimal")} className="p-2 bg-gray-200 rounded">Minimal</button>
        <button onClick={() => setDesign("wellness")} className="p-2 bg-gray-200 rounded">Wellness</button>
        <button onClick={() => setDesign("modern")} className="p-2 bg-gray-200 rounded">Modern</button>
      </div>
      <div className="mt-4">
        {design === "minimal" && <LoginMinimal />}
        {design === "wellness" && <LoginWellness />}
        {design === "modern" && <LoginModern />}
      </div>
    </div>
  )
}