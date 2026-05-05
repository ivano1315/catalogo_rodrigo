'use client'

import { useState, useEffect, useCallback } from 'react'

interface Cliente {
  _id: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  cidade: string
  estado: string
  telefone: string
  email: string
  condicaoPagamento: string
  observacoes: string
}

interface Props {
  onSelecionar: (c: Cliente) => void
  onClose: () => void
}

function formatCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export default function ClienteSelectorModal({ onSelecionar, onClose }: Props) {
  const [busca, setBusca] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(false)

  const buscarClientes = useCallback(async () => {
    setCarregando(true)
    const res = await fetch(`/api/clientes?busca=${encodeURIComponent(busca)}&pagina=1`)
    const json = await res.json()
    setClientes(json.clientes || [])
    setTotal(json.total || 0)
    setCarregando(false)
  }, [busca])

  useEffect(() => {
    const t = setTimeout(buscarClientes, 300)
    return () => clearTimeout(t)
  }, [buscarClientes])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-800">Selecionar Cliente</h2>
            {total > 0 && <p className="text-xs text-gray-400 mt-0.5">{total} cliente{total !== 1 ? 's' : ''} cadastrado{total !== 1 ? 's' : ''}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">✕</button>
        </div>

        {/* Busca */}
        <div className="px-5 py-3 border-b border-gray-100">
          <input
            autoFocus
            type="text"
            placeholder="Buscar por nome, fantasia ou CNPJ..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
          {carregando ? (
            <div className="p-8 text-center text-gray-400 text-sm">Buscando...</div>
          ) : clientes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-3xl mb-2">🏢</p>
              <p className="text-gray-400 text-sm">{busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</p>
            </div>
          ) : (
            clientes.map(c => (
              <button
                key={c._id}
                onClick={() => onSelecionar(c)}
                className="w-full text-left px-5 py-4 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors truncate">
                      {c.razaoSocial}
                    </p>
                    {c.nomeFantasia && (
                      <p className="text-xs text-gray-500 truncate">{c.nomeFantasia}</p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {c.cnpj && (
                        <span className="text-xs text-gray-400 font-mono">{formatCNPJ(c.cnpj)}</span>
                      )}
                      {c.cidade && (
                        <span className="text-xs text-gray-400">{c.cidade}{c.estado ? ` — ${c.estado}` : ''}</span>
                      )}
                      {c.telefone && (
                        <span className="text-xs text-gray-400">{c.telefone}</span>
                      )}
                    </div>
                  </div>
                  {c.condicaoPagamento && (
                    <span className="shrink-0 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-medium">
                      {c.condicaoPagamento}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <a
            href="/clientes"
            target="_blank"
            className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
          >
            + Cadastrar novo cliente →
          </a>
        </div>
      </div>
    </div>
  )
}
