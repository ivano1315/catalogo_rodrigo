'use client'

import Image from 'next/image'
import { useState } from 'react'
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
  imagem?: string | null
}

function fmt(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function CartaoProduto({ produto }: { produto: Produto }) {
  const { adicionar, remover, itens } = useOrcamento()
  const noOrcamento = itens.some(i => i.produto.cod === produto.cod)
  const [qtdLivre, setQtdLivre] = useState<string>('1')

  const faixas = [
    { label: 'Master',   qty: produto.cxMaster, preco: produto.master,   bg: 'bg-blue-50 hover:bg-blue-100',     title: 'text-blue-500',   qty_color: 'text-blue-400',   preco_color: 'text-blue-700',   ring: 'hover:ring-2 hover:ring-blue-300' },
    { label: 'Inner',    qty: produto.cxInner,  preco: produto.inner,    bg: 'bg-emerald-50 hover:bg-emerald-100', title: 'text-emerald-500', qty_color: 'text-emerald-400', preco_color: 'text-emerald-700', ring: 'hover:ring-2 hover:ring-emerald-300' },
    { label: 'Unitário', qty: produto.pacUnid,  preco: produto.unitario, bg: 'bg-orange-50 hover:bg-orange-100',  title: 'text-orange-500', qty_color: 'text-orange-400', preco_color: 'text-orange-700', ring: 'hover:ring-2 hover:ring-orange-300' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow overflow-hidden">
      <div className="relative w-full h-40 bg-gray-50 flex items-center justify-center">
        {produto.imagem ? (
          <Image src={produto.imagem} alt={produto.descricao} fill className="object-contain p-2" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
        ) : (
          <span className="text-4xl text-gray-200">📦</span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">#{produto.cod}</span>
          <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">{produto.unidade}</span>
        </div>

        <p className="text-sm font-medium text-gray-800 leading-snug min-h-[40px]">{produto.descricao}</p>

        {noOrcamento ? (
          <button onClick={() => remover(produto.cod)} className="mt-auto w-full py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
            ✕ Remover do orçamento
          </button>
        ) : (
          <>
            <p className="text-xs text-gray-400 text-center">Clique na faixa para adicionar ao orçamento</p>
            <div className="grid grid-cols-3 gap-2">
              {faixas.map(f => (
                <button key={f.label} onClick={() => adicionar(produto, f.qty)} title={`Adicionar ${f.qty} unidades`} className={`${f.bg} ${f.ring} rounded-lg p-2 text-center transition-all`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide ${f.title}`}>{f.label}</p>
                  <p className={`text-xs mt-0.5 ${f.qty_color}`}>Mín. {f.qty} un</p>
                  <p className={`text-base font-bold mt-1 ${f.preco_color}`}>{fmt(f.preco)}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={1}
                value={qtdLivre}
                onChange={e => setQtdLivre(e.target.value)}
                onBlur={e => { if (!e.target.value || parseInt(e.target.value) < 1) setQtdLivre('1') }}
                className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Qtd."
              />
              <button
                onClick={() => adicionar(produto, Math.max(1, parseInt(qtdLivre) || 1))}
                className="flex-1 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                + Adicionar {qtdLivre || '?'} un
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
