"use client"
import { useState } from 'react'
import LanguageSwitcher from '@/components/language-switcher'
import ExtractURLV1 from '@/components/ExtractURLV1'
import ExtractURLV2 from '@/components/ExtractURLV2'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function ExtractURLPage() {
  const [version, setVersion] = useState<'v1' | 'v2'>('v2')
  return (
    <>
      <div className="flex justify-end items-center gap-4 top-4 right-4 z-50">
        <LanguageSwitcher />
        <Select value={version} onValueChange={v => setVersion(v as 'v1' | 'v2')}>
          <SelectTrigger className="w-[120px] border-gray-200 bg-white/80 backdrop-blur-sm">
            <SelectValue>
              <span className="text-sm font-medium">
                {version === 'v1' ? 'v1' : 'v2'}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="v1">v1</SelectItem>
            <SelectItem value="v2">v2</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {version === 'v1' && <ExtractURLV1 />}
      {version === 'v2' && <ExtractURLV2 />}
    </>
  )
} 