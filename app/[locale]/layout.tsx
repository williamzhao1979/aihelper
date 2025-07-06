import type React from "react"
import type { Metadata } from "next"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { notFound } from "next/navigation"
import { routing } from "@/i18n/routing"
import AuthProvider from "@/components/auth-provider"
import { AuthProvider as CustomAuthProvider } from "@/components/auth/auth-context"
import "../globals.css"

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const messages = await getMessages()

  // Get header messages from the current locale
  const headerMessages = messages.header as {
    title: string
    title_desktop: string
    subtitle: string
    description: string
  }

  return {
    title: headerMessages.title,
    description: headerMessages.subtitle,
    keywords: ["AI", "ChatGPT", "DeepSeek", "GitHub Copilot", "Microsoft Copilot", "多平台AI"],
    authors: [{ name: "Multi-Platform AI" }],
    openGraph: {
      title: headerMessages.title,
      description: headerMessages.subtitle,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: headerMessages.title,
      description: headerMessages.subtitle,
    },
  }
}

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages()

  return (
    <AuthProvider>
      <NextIntlClientProvider messages={messages}>
        <CustomAuthProvider>
          {children}
        </CustomAuthProvider>
      </NextIntlClientProvider>
    </AuthProvider>
  )
}
