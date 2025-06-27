"use client"

import { useState, useRef, useCallback, useEffect } from "react"

interface VoskResult {
  text?: string
  partial?: string
  result?: Array<{ word: string; start: number; end: number; conf: number }>
}

export function useVoskRecognition(language: "en" | "zh" = "en") {
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [recognizedText, setRecognizedText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [similarity, setSimilarity] = useState(0)

  const recognizerRef = useRef<any>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const voskRef = useRef<any>(null)

  // Initialize Vosk
  const initializeVosk = useCallback(async () => {
    if (voskRef.current) return voskRef.current

    setIsLoading(true)
    setError(null)

    try {
      // Load Vosk from CDN
      if (typeof window !== "undefined" && !(window as any).Vosk) {
        const script = document.createElement("script")
        script.src = "https://unpkg.com/vosk-browser@0.0.8/dist/vosk.js"
        document.head.appendChild(script)

        await new Promise((resolve, reject) => {
          script.onload = resolve
          script.onerror = reject
        })
      }

      const Vosk = (window as any).Vosk
      if (!Vosk) {
        throw new Error("Failed to load Vosk library")
      }

      // Load model based on language
      const modelUrl =
        language === "en"
          ? "https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.tar.gz"
          : "https://alphacephei.com/vosk/models/vosk-model-small-cn-0.22.tar.gz"

      const model = await Vosk.createModel(modelUrl)
      voskRef.current = { Vosk, model }

      return voskRef.current
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initialize Vosk"
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [language])

  // Start recognition
  const startRecognition = useCallback(async () => {
    try {
      setError(null)

      // Initialize Vosk if not already done
      const vosk = await initializeVosk()

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      streamRef.current = stream

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      })
      audioContextRef.current = audioContext

      // Create recognizer
      const recognizer = new vosk.Vosk.KaldiRecognizer(vosk.model, 16000)
      recognizerRef.current = recognizer

      // Create audio processing node
      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (event) => {
        if (!recognizerRef.current) return

        const inputData = event.inputBuffer.getChannelData(0)

        // Convert float32 to int16
        const int16Data = new Int16Array(inputData.length)
        for (let i = 0; i < inputData.length; i++) {
          int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
        }

        // Send to recognizer
        if (recognizerRef.current.AcceptWaveform) {
          recognizerRef.current.AcceptWaveform(int16Data)

          try {
            const result = JSON.parse(recognizerRef.current.Result()) as VoskResult
            if (result.text) {
              setRecognizedText(result.text)
            }
          } catch (e) {
            // Handle JSON parse errors silently
          }
        }

        // Get partial results
        try {
          const partialResult = JSON.parse(recognizerRef.current.PartialResult()) as VoskResult
          if (partialResult.partial) {
            setRecognizedText(partialResult.partial)
          }
        } catch (e) {
          // Handle JSON parse errors silently
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      setIsRecognizing(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to start recognition"
      setError(errorMessage)
      throw err
    }
  }, [initializeVosk])

  // Stop recognition
  const stopRecognition = useCallback(() => {
    setIsRecognizing(false)

    // Clean up audio resources
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Get final result
    if (recognizerRef.current) {
      try {
        const finalResult = JSON.parse(recognizerRef.current.FinalResult()) as VoskResult
        if (finalResult.text) {
          setRecognizedText(finalResult.text)
        }
      } catch (e) {
        // Handle JSON parse errors silently
      }
      recognizerRef.current = null
    }
  }, [])

  // Calculate similarity when recognized text changes
  useEffect(() => {
    if (recognizedText) {
      // This will be updated by the parent component with the target text
      setSimilarity(0)
    }
  }, [recognizedText])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecognition()
    }
  }, [stopRecognition])

  return {
    isRecognizing,
    recognizedText,
    isLoading,
    error,
    similarity,
    startRecognition,
    stopRecognition,
    setSimilarity: (value: number) => setSimilarity(value),
  }
}
