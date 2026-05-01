import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { OrcamentoProvider } from '@/app/context/OrcamentoContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Catálogo de Produtos',
  description: 'Tabela de preços — Ceará',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <OrcamentoProvider>
          {children}
        </OrcamentoProvider>
      </body>
    </html>
  )
}
