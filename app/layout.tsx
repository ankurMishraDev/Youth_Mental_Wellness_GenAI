import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"
import { UserProvider } from "@/lib/contexts/UserContext"
import CustomCursor from "@/components/CustomCursor"

export const metadata: Metadata = {
  title: "CureZ - Your AI Mentor",
  description: "A supportive AI mentor for young people seeking mental wellness guidance",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Ribeye&display=swap" rel="stylesheet" />
        {/* Prefetch critical routes for faster navigation */}
        <link rel="prefetch" href="/dashboard" />
        <link rel="prefetch" href="/journal" />
        <link rel="prefetch" href="/auth" />
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased doodle-background`}>
        <CustomCursor />
        <UserProvider>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 dark:from-gray-900 dark:via-orange-900/20 dark:to-rose-900/20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <p className="text-orange-600 dark:text-orange-400">Loading...</p>
              </div>
            </div>
          }>
            {children}
          </Suspense>
        </UserProvider>
        <Analytics />
      </body>
    </html>
  )
}
