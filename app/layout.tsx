import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"
import { UserProvider } from "@/lib/contexts/UserContext"

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
      </head>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} antialiased doodle-background`}>
        <UserProvider>
          <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
        </UserProvider>
        <Analytics />
      </body>
    </html>
  )
}
