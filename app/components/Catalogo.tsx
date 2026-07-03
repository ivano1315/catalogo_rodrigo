'use client'

import { useState, useEffect, useCallback, useLayoutEffect } from 'react'
import Link from 'next/link'
import CartaoProduto from './CartaoProduto'
import ListaProduto from './ListaProduto'
import ProdutoModal from './ProdutoModal'
import { useOrcamento } from '@/app/context/OrcamentoContext'

interface Produto {
  _id: string
  cod: number
  descricao: string
  unidade: string
  cxMaster: number
  master: number
  cxInner: number
  inner: number
  pacUnid: number
  unitario: number
  estoque?: number
}

interface Resposta {
  produtos: Produto[]
  total: number
  paginas: number
  paginaAtual: number
}

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  )
}

function IconList() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2" width="14" height="2.5" rx="1" />
      <rect x="1" y="6.75" width="14" height="2.5" rx="1" />
      <rect x="1" y="11.5" width="14" height="2.5" rx="1" />
    </svg>
  )
}

export default function Catalogo() {
  const { orcamentoEditando, totalItens } = useOrcamento()
  const [input, setInput] = useState('')
  const [busca, setBusca] = useState('')
  const [pagina, setPagina] = useState(1)
  const [dados, setDados] = useState<Resposta | null>(null)
  const [carregando, setCarregando] = useState(true)
  // Mobile-first: começa em card e muda para lista só em telas largas
  const [vista, setVista] = useState<'card' | 'lista'>('card')
  useLayoutEffect(() => {
    if (window.innerWidth >= 1024) setVista('lista')
  }, [])
  const [produtoModal, setProdutoModal] = useState<Produto | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusca(input)
      setPagina(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [input])

  const buscarProdutos = useCallback(async () => {
    setCarregando(true)
    const params = new URLSearchParams({ busca, pagina: String(pagina) })
    const res = await fetch(`/api/produtos?${params}`)
    const json = await res.json()
    setDados(json)
    setCarregando(false)
  }, [busca, pagina])

  useEffect(() => {
    buscarProdutos()
  }, [buscarProdutos])

  const skeletonCard = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-48 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-16 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-full mb-2" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map(j => <div key={j} className="h-16 bg-gray-100 rounded-lg" />)}
          </div>
        </div>
      ))}
    </div>
  )

  const skeletonLista = (
    <div className="rounded-xl overflow-hidden border border-gray-100 divide-y divide-gray-100">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="bg-white px-4 py-3 flex items-center gap-4 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-12 shrink-0" />
          <div className="h-4 bg-gray-200 rounded flex-1" />
          <div className="flex gap-2 shrink-0">
            {[1, 2, 3].map(j => <div key={j} className="h-12 w-[90px] bg-gray-100 rounded-lg" />)}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="lg:hidden">
            <p className="text-base font-bold text-gray-900 leading-none">Waves Plus</p>
            <p className="text-xs text-gray-400">Tabela Ceará · Abril 2025</p>
          </div>
          <div className="flex gap-2 ml-auto items-center">
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Buscar produto..."
                value={input}
                onChange={e => setInput(e.target.value)}
                className="border border-gray-300 rounded-lg pl-4 pr-8 py-2 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {input && (
                <button
                  type="button"
                  onClick={() => { setInput(''); setBusca(''); setPagina(1) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex border border-gray-200 rounded-lg overflow-hidden shrink-0">
              <button
                onClick={() => setVista('card')}
                title="Visualização em cards"
                className={`px-3 py-2 transition-colors ${vista === 'card' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <IconGrid />
              </button>
              <button
                onClick={() => setVista('lista')}
                title="Visualização em lista"
                className={`px-3 py-2 border-l border-gray-200 transition-colors ${vista === 'lista' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <IconList />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Banner de modo edição */}
      {orcamentoEditando && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-3">
          <span className="text-amber-600 text-sm">✏️ Editando orçamento <strong>#{orcamentoEditando.numero}</strong> — selecione produtos para adicionar</span>
          <Link href="/orcamento" className="ml-auto text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors shrink-0">
            ← Voltar ao orçamento
          </Link>
        </div>
      )}

      {/* Banner de itens no orçamento (modo normal) */}
      {!orcamentoEditando && totalItens > 0 && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2.5 flex items-center gap-3">
          <span className="text-blue-600 text-sm">{totalItens} {totalItens === 1 ? 'produto adicionado' : 'produtos adicionados'} ao orçamento</span>
          <Link href="/orcamento" className="ml-auto text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors shrink-0">
            Ver orçamento →
          </Link>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {dados && (
          <p className="text-sm text-gray-500 mb-4">
            {dados.total} produto{dados.total !== 1 ? 's' : ''} encontrado{dados.total !== 1 ? 's' : ''}
            {busca && <span className="font-medium text-gray-700"> para "{busca}"</span>}
          </p>
        )}

        {carregando ? (
          vista === 'card' ? skeletonCard : skeletonLista
        ) : dados?.produtos.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">📦</p>
            <p className="text-lg">Nenhum produto encontrado</p>
          </div>
        ) : vista === 'card' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dados?.produtos.map(p => (
              <CartaoProduto key={p._id} produto={p} onVerDetalhes={p => setProdutoModal(p)} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-gray-100">
            <div className="hidden sm:flex items-center gap-3 bg-gray-100 px-4 py-2 border-b border-gray-200">
              {/* espaçador para a miniatura */}
              <div className="w-12 shrink-0" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-16 shrink-0">Código</span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1">Descrição</span>
              <div className="flex gap-2 shrink-0">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide text-center w-[90px]">Master</span>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide text-center w-[90px]">Inner</span>
                <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide text-center w-[90px]">Unitário</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center w-[90px]">Qtd. livre</span>
              </div>
              {/* espaçador para o botão de remover */}
              <div className="w-8 shrink-0" />
            </div>
            <div className="divide-y divide-gray-100">
              {dados?.produtos.map(p => (
                <ListaProduto key={p._id} produto={p} onVerDetalhes={p => setProdutoModal(p)} />
              ))}
            </div>
          </div>
        )}

        {dados && dados.paginas > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
            >
              ← Anterior
            </button>
            <span className="text-sm text-gray-600 px-2">
              Página {pagina} de {dados.paginas}
            </span>
            <button
              onClick={() => setPagina(p => Math.min(dados.paginas, p + 1))}
              disabled={pagina === dados.paginas}
              className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
            >
              Próxima →
            </button>
          </div>
        )}
      </main>

      {produtoModal && (
        <ProdutoModal produto={produtoModal} onClose={() => setProdutoModal(null)} />
      )}
    </div>
  )
}
