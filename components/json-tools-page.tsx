"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"
import { Copy, Download, Upload, FileText, Code, Shuffle, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function JsonToolsPage() {
  const t = useTranslations('jsonTools')
  const { toast } = useToast()
  const [inputJson, setInputJson] = useState("")
  const [outputResult, setOutputResult] = useState("")
  const [activeTab, setActiveTab] = useState("prettify")

  // JSON validation
  const validateJson = (jsonString: string): { isValid: boolean; error?: string } => {
    try {
      JSON.parse(jsonString)
      return { isValid: true }
    } catch (error) {
      return { isValid: false, error: (error as Error).message }
    }
  }

  // Prettify JSON
  const prettifyJson = () => {
    try {
      const parsed = JSON.parse(inputJson)
      const prettified = JSON.stringify(parsed, null, 2)
      setOutputResult(prettified)
      toast({ title: t('messages.success'), description: t('messages.prettifySuccess') })
    } catch (error) {
      toast({ title: t('messages.error'), description: t('messages.invalidJson'), variant: "destructive" })
    }
  }

  // Minify JSON
  const minifyJson = () => {
    try {
      const parsed = JSON.parse(inputJson)
      const minified = JSON.stringify(parsed)
      setOutputResult(minified)
      toast({ title: t('messages.success'), description: t('messages.minifySuccess') })
    } catch (error) {
      toast({ title: t('messages.error'), description: t('messages.invalidJson'), variant: "destructive" })
    }
  }

  // Validate JSON
  const validateJsonInput = () => {
    const validation = validateJson(inputJson)
    if (validation.isValid) {
      setOutputResult(`✅ ${t('messages.validJson')}`)
      toast({ title: t('messages.validJson'), description: t('messages.validJson') })
    } else {
      setOutputResult(`❌ ${t('messages.invalidJson')}: ${validation.error}`)
      toast({ title: t('messages.invalidJson'), description: validation.error, variant: "destructive" })
    }
  }

  // Convert JSON to CSV
  const jsonToCsv = () => {
    try {
      const parsed = JSON.parse(inputJson)
      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array for CSV conversion")
      }
      
      if (parsed.length === 0) {
        setOutputResult("")
        return
      }

      const headers = Object.keys(parsed[0])
      const csvRows = [
        headers.join(","),
        ...parsed.map(row => 
          headers.map(header => {
            const value = row[header]
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
          }).join(",")
        )
      ]
      
      setOutputResult(csvRows.join("\n"))
      toast({ title: t('messages.success'), description: t('messages.csvSuccess') })
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" })
    }
  }

  // Convert JSON to XML
  const jsonToXml = () => {
    try {
      const parsed = JSON.parse(inputJson)
      const convertToXml = (obj: any, indent = 0): string => {
        const spaces = "  ".repeat(indent)
        if (typeof obj !== "object" || obj === null) {
          return String(obj)
        }
        
        if (Array.isArray(obj)) {
          return obj.map(item => `${spaces}<item>\n${convertToXml(item, indent + 1)}\n${spaces}</item>`).join("\n")
        }
        
        return Object.entries(obj).map(([key, value]) => {
          if (typeof value === "object" && value !== null) {
            return `${spaces}<${key}>\n${convertToXml(value, indent + 1)}\n${spaces}</${key}>`
          }
          return `${spaces}<${key}>${value}</${key}>`
        }).join("\n")
      }
      
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<root>\n${convertToXml(parsed, 1)}\n</root>`
      setOutputResult(xml)
      toast({ title: t('messages.success'), description: t('messages.xmlSuccess') })
    } catch (error) {
      toast({ title: t('messages.error'), description: t('messages.invalidJson'), variant: "destructive" })
    }
  }

  // Extract keys
  const extractKeys = () => {
    try {
      const parsed = JSON.parse(inputJson)
      const extractKeysRecursive = (obj: any, prefix = ""): string[] => {
        const keys: string[] = []
        if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
          Object.keys(obj).forEach(key => {
            const fullKey = prefix ? `${prefix}.${key}` : key
            keys.push(fullKey)
            if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
              keys.push(...extractKeysRecursive(obj[key], fullKey))
            }
          })
        }
        return keys
      }
      
      const keys = extractKeysRecursive(parsed)
      setOutputResult(keys.join("\n"))
      toast({ title: t('messages.success'), description: t('messages.keysSuccess') })
    } catch (error) {
      toast({ title: t('messages.error'), description: t('messages.invalidJson'), variant: "destructive" })
    }
  }

  // Escape JSON
  const escapeJson = () => {
    const escaped = inputJson.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")
    setOutputResult(escaped)
    toast({ title: t('messages.success'), description: t('messages.escapeSuccess') })
  }

  // Unescape JSON
  const unescapeJson = () => {
    try {
      const unescaped = inputJson.replace(/\\"/g, '"').replace(/\\\\/g, "\\").replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
      setOutputResult(unescaped)
      toast({ title: t('messages.success'), description: t('messages.unescapeSuccess') })
    } catch (error) {
      toast({ title: t('messages.error'), description: t('messages.error'), variant: "destructive" })
    }
  }

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: t('interface.copied'), description: t('messages.copySuccess') })
    } catch (error) {
      toast({ title: t('messages.error'), description: t('messages.error'), variant: "destructive" })
    }
  }

  // Download as file
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast({ title: t('interface.downloaded'), description: t('messages.downloadSuccess') })
  }

  // Load file
  const loadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setInputJson(e.target?.result as string)
        toast({ title: t('messages.fileLoaded'), description: t('messages.fileLoaded') })
      }
      reader.readAsText(file)
    }
  }

  const toolCategories = [
    {
      id: "format",
      title: t('categories.format'),
      tools: [
        { id: "prettify", title: t('tools.prettify.title'), action: prettifyJson, description: t('tools.prettify.description') },
        { id: "minify", title: t('tools.minify.title'), action: minifyJson, description: t('tools.minify.description') },
        { id: "validate", title: t('tools.validate.title'), action: validateJsonInput, description: t('tools.validate.description') },
      ]
    },
    {
      id: "convert",
      title: t('categories.convert'),
      tools: [
        { id: "csv", title: t('tools.csv.title'), action: jsonToCsv, description: t('tools.csv.description') },
        { id: "xml", title: t('tools.xml.title'), action: jsonToXml, description: t('tools.xml.description') },
      ]
    },
    {
      id: "manipulate",
      title: t('categories.manipulate'),
      tools: [
        { id: "keys", title: t('tools.keys.title'), action: extractKeys, description: t('tools.keys.description') },
        { id: "escape", title: t('tools.escape.title'), action: escapeJson, description: t('tools.escape.description') },
        { id: "unescape", title: t('tools.unescape.title'), action: unescapeJson, description: t('tools.unescape.description') },
      ]
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
        <p className="text-lg text-muted-foreground mb-6">
          {t('description')}
        </p>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          <Badge variant="secondary">Free to use</Badge>
          <Badge variant="secondary">No installation required</Badge>
          <Badge variant="secondary">Works in browser</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tool Categories */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                {t('title')}
              </CardTitle>
              <CardDescription>
                Select a tool to process your JSON data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {toolCategories.map(category => (
                <div key={category.id}>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
                    {category.title}
                  </h3>
                  <div className="space-y-1">
                    {category.tools.map(tool => (
                      <Button
                        key={tool.id}
                        variant={activeTab === tool.id ? "default" : "ghost"}
                        className="w-full justify-start h-auto p-3"
                        onClick={() => {
                          setActiveTab(tool.id)
                          setOutputResult("")
                        }}
                      >
                        <div className="text-left">
                          <div className="font-medium">{tool.title}</div>
                          <div className="text-xs text-muted-foreground">{tool.description}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main Tool Interface */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {toolCategories.find(cat => cat.tools.some(tool => tool.id === activeTab))?.tools.find(tool => tool.id === activeTab)?.title || "JSON Tool"}
              </CardTitle>
              <CardDescription>
                {toolCategories.find(cat => cat.tools.some(tool => tool.id === activeTab))?.tools.find(tool => tool.id === activeTab)?.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload */}
              <div className="flex gap-2">
                <div className="relative">
                  <input
                    type="file"
                    accept=".json,.txt"
                    onChange={loadFile}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    {t('interface.loadFile')}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentTool = toolCategories.find(cat => 
                      cat.tools.some(tool => tool.id === activeTab)
                    )?.tools.find(tool => tool.id === activeTab)
                    currentTool?.action()
                  }}
                >
                  <Shuffle className="h-4 w-4 mr-2" />
                  {t('interface.process')}
                </Button>
              </div>

              {/* Input */}
              <div>
                <label className="text-sm font-medium mb-2 block">{t('interface.inputJson')}</label>
                <Textarea
                  placeholder={t('interface.inputPlaceholder')}
                  value={inputJson}
                  onChange={(e) => setInputJson(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              {/* Output */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">{t('interface.output')}</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(outputResult)}
                      disabled={!outputResult}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {t('interface.copy')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(outputResult, `output.${activeTab === 'csv' ? 'csv' : activeTab === 'xml' ? 'xml' : 'json'}`)}
                      disabled={!outputResult}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {t('interface.download')}
                    </Button>
                  </div>
                </div>
                <Textarea
                  placeholder={t('interface.outputPlaceholder')}
                  value={outputResult}
                  readOnly
                  className="min-h-[200px] font-mono text-sm bg-muted"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('info.howToUse')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              {t.raw('info.steps').map((step: string, index: number) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('info.features')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[Eye, FileText, Download, Copy].map((Icon, index) => (
              <div key={index} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{t.raw('info.featureList')[index]}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('info.privacy')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {t.raw('info.privacyInfo').map((info: string, index: number) => (
              <p key={index}>{info}</p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}