'use client'

import { QueryProvider } from './query-provider'
import { ThemeProvider } from './theme-provider'
import { Toaster } from 'sonner'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="clienthub-theme">
      <QueryProvider>
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: 'hsl(222 47% 8%)',
              border: '1px solid hsl(217 33% 17%)',
              color: 'hsl(210 40% 98%)',
            },
          }}
        />
      </QueryProvider>
    </ThemeProvider>
  )
}

export { QueryProvider } from './query-provider'
export { ThemeProvider, useTheme } from './theme-provider'
