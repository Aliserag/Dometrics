import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
})

export const metadata: Metadata = {
  title: "Dometrics - Domain Intelligence Dashboard",
  description: "AI-driven domain scoring and analytics for Doma Protocol. Do metrics, Dometrics.",
  keywords: "domains, analytics, scoring, Doma Protocol, blockchain, NFT, risk assessment",
  authors: [{ name: "Dometrics Team" }],
  openGraph: {
    title: "Dometrics - Domain Intelligence Dashboard",
    description: "AI-driven domain scoring and analytics for Doma Protocol",
    type: "website",
    locale: "en_US",
    siteName: "Dometrics"
  },
  twitter: {
    card: "summary_large_image",
    title: "Dometrics - Domain Intelligence Dashboard",
    description: "AI-driven domain scoring and analytics for Doma Protocol",
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 min-h-screen">
        <Providers>
          <div className="relative">
            {/* Background decoration */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
              <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
            </div>
            
            {/* Main content */}
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
