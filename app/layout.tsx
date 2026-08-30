import type { Metadata } from "next"
import { Bricolage_Grotesque, Public_Sans } from "next/font/google"

import "./globals.css"
import { cn } from "@/lib/utils"

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-heading",
})

export const metadata: Metadata = {
  title: "Result Register · P08",
  description:
    "An auditable school result processing and GPA engine for LofiStack Hackathon 2026.",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-svh bg-background font-sans text-foreground antialiased",
          publicSans.variable,
          bricolage.variable,
        )}
      >
        {children}
      </body>
    </html>
  )
}
