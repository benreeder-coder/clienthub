import type { Metadata, Viewport } from 'next'
import { Providers } from '@/providers'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'ClientHub',
    template: '%s | ClientHub',
  },
  description: 'Multi-tenant client portal for automation and outreach agencies',
  keywords: ['client portal', 'automation', 'outreach', 'agency', 'dashboard'],
  authors: [{ name: 'BTB AI' }],
  creator: 'BTB AI',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0f1c' },
    { media: '(prefers-color-scheme: light)', color: '#0a0f1c' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <Providers>
          {/* Cyber grid background */}
          <div className="fixed inset-0 -z-10 cyber-grid opacity-50" />
          {/* Mesh gradient overlay */}
          <div className="fixed inset-0 -z-10 bg-mesh-gradient" />
          {children}
        </Providers>
      </body>
    </html>
  )
}
