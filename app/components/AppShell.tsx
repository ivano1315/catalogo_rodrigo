'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useOrcamento } from '@/app/context/OrcamentoContext'

function IconCatalog({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function IconClients({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconCart({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function IconBox({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  )
}

const NAV = [
  { href: '/',         label: 'Catálogo',  Icon: IconCatalog  },
  { href: '/clientes', label: 'Clientes',  Icon: IconClients  },
  { href: '/orcamento',label: 'Orçamento', Icon: IconCart     },
  { href: '/estoque',  label: 'Estoque',   Icon: IconBox      },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const { totalItens } = useOrcamento()

  return (
    <div className="flex min-h-screen bg-gray-50">

      {/* ── SIDEBAR desktop ── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-white border-r border-gray-200 sticky top-0 h-screen">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-gray-100">
          <p className="text-base font-bold text-gray-900 leading-none">Waves Plus</p>
          <p className="text-xs text-gray-400 mt-0.5">Catálogo · Tabela Ceará</p>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon active={active} />
                <span>{label}</span>
                {href === '/orcamento' && totalItens > 0 && (
                  <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    active ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'
                  }`}>
                    {totalItens}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">Abril 2025</p>
        </div>
      </aside>

      {/* ── CONTEÚDO ── */}
      <div className="flex flex-col flex-1 min-w-0 pb-20 lg:pb-0">
        {children}
      </div>

      {/* ── BOTTOM TABS mobile ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 relative transition-colors ${
                active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                <Icon active={active} />
                {href === '/orcamento' && totalItens > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-blue-600 text-white text-[10px] font-bold px-1 py-px rounded-full leading-none min-w-[16px] text-center">
                    {totalItens}
                  </span>
                )}
              </div>
              <span className={`text-[11px] font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}>
                {label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-600 rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

    </div>
  )
}
