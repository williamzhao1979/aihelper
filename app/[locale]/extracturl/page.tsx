"use client"
import { useState } from 'react'
import LanguageSwitcher from '@/components/language-switcher'
import ExtractURLV1 from '@/components/ExtractURLV1'
import ExtractURLV2 from '@/components/ExtractURLV2'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'

const AI_OPTIONS = [
  { value: 'local', label: '本地(无AI)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
];

export default function ExtractURLPage() {
  const [version, setVersion] = useState<'v1' | 'v2'>('v2')
  const [aiProviders, setAiProviders] = useState<string[]>(['local', 'openai'])
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
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-[120px] border border-gray-200 bg-white/80 backdrop-blur-sm rounded-md px-3 py-2 text-left text-sm font-medium">
              {'AI选项'}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[180px] p-2">
            {AI_OPTIONS.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 py-1 cursor-pointer">
                <Checkbox
                  checked={aiProviders.includes(opt.value)}
                  onCheckedChange={checked => {
                    setAiProviders(prev =>
                      checked
                        ? [...prev, opt.value]
                        : prev.filter(v => v !== opt.value)
                    )
                  }}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </PopoverContent>
        </Popover>
      </div>
      {version === 'v1' && <ExtractURLV1 />}
      {version === 'v2' && <ExtractURLV2 aiProviders={aiProviders} />}
    </>
  )
} 