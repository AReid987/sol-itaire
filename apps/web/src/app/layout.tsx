import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { WalletAdapterProvider } from '@/components/providers/WalletAdapterProvider'
import { QueryClientProvider } from '@/components/providers/QueryClientProvider'
// import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sol-itaire | Play Solitaire on Solana',
  description: 'Play classic Solitaire game with crypto rewards on the Solana blockchain',
  keywords: ['solitaire', 'solana', 'crypto', 'gaming', 'blockchain', 'play-to-earn'],
  authors: [{ name: 'Sol-itaire Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#1e40af',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryClientProvider>
          <WalletAdapterProvider>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
              {children}
            </div>
            {/* <Toaster /> */}
          </WalletAdapterProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}