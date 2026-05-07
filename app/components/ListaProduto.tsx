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
  estoque?: number
  imagem?: string | null
}

function fmt(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ListaProduto({ produto, onVerDetalhes }: { produto: Produto; onVerDetalhes: (p: Produto) => void }) {
  const { adicionar, remover, itens } = useOrcamento()
  const noOrcamento = itens.some(i => i.produto.cod === produto.cod)
  const [qtdLivre, setQtdLivre] = useState<string>('1')

  return (
    <div className="bg-white px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
      <button onClick={() => onVerDetalhes(produto)} title="Ver detalhes" className="relative w-12 h-12 shrink-0 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center group hover:ring-2 hover:ring-blue-300 transition-all">
        {produto.imagem ? (
          <Image src={produto.imagem} alt={produto.descricao} fill className="object-contain p-1 group-hover:scale-110 transition-transform duration-200" sizes="48px" />
        ) : (
          <span className="text-xl text-gray-200">📦</span>
        )}
      </button>

      <div className="w-16 shrink-0">
        <span className="text-xs font-mono text-gray-400">{produto.cod}</span>
      </div>

      <button onClick={() => onVerDetalhes(produto)} className="flex flex-col items-start flex-1 min-w-0 text-left hover:text-blue-600 transition-colors">
        <span className="text-sm font-medium text-gray-800 truncate w-full">
          {produto.descricao}
          <span className="ml-2 text-xs text-gray-400 font-normal">{produto.unidade}</span>
        </span>
        {produto.estoque != null && (
          <span className={`text-xs mt-0.5 font-medium ${produto.estoque > 0 ? 'text-emerald-500' : 'text-gray-300'}`}>
            {produto.estoque > 0 ? `${produto.estoque.toLocaleString('pt-BR')} em estoque` : 'Sem estoque'}
          </span>
        )}
      </button>

      <div className="flex gap-2 shrink-0">
        {noOrcamento ? (
          <>
            <div className="bg-blue-50 rounded-lg px-3 py-1.5 text-center w-[90px]">
              <p className="text-xs text-blue-400 leading-none">Master</p>
              <p className="text-xs text-blue-300 leading-none mt-0.5">≥{produto.cxMaster} un</p>
              <p className="text-sm font-bold text-blue-700 mt-1 leading-none">{fmt(produto.master)}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg px-3 py-1.5 text-center w-[90px]">
              <p className="text-xs text-emerald-400 leading-none">Inner</p>
              <p className="text-xs text-emerald-300 leading-none mt-0.5">≥{produto.cxInner} un</p>
              <p className="text-sm font-bold text-emerald-700 mt-1 leading-none">{fmt(produto.inner)}</p>
            </div>
            <div className="bg-orange-50 rounded-lg px-3 py-1.5 text-center w-[90px]">
              <p className="text-xs text-orange-400 leading-none">Unitário</p>
              <p className="text-xs text-orange-300 leading-none mt-0.5">Mín.{produto.pacUnid}</p>
              <p className="text-sm font-bold text-orange-700 mt-1 leading-none">{fmt(produto.unitario)}</p>
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => adicionar(produto, produto.cxMaster)}
              title={`Adicionar ${produto.cxMaster} un (Master)`}
              className="bg-blue-50 hover:bg-blue-100 hover:ring-2 hover:ring-blue-300 rounded-lg px-3 py-1.5 text-center w-[90px] transition-all cursor-pointer"
            >
              <p className="text-xs text-blue-500 font-semibold leading-none">Master</p>
              <p className="text-xs text-blue-400 leading-none mt-0.5">{produto.cxMaster} un</p>
              <p className="text-sm font-bold text-blue-700 mt-1 leading-none">{fmt(produto.master)}</p>
            </button>
            <button
              onClick={() => adicionar(produto, produto.cxInner)}
              title={`Adicionar ${produto.cxInner} un (Inner)`}
              className="bg-emerald-50 hover:bg-emerald-100 hover:ring-2 hover:ring-emerald-300 rounded-lg px-3 py-1.5 text-center w-[90px] transition-all cursor-pointer"
            >
              <p className="text-xs text-emerald-500 font-semibold leading-none">Inner</p>
              <p className="text-xs text-emerald-400 leading-none mt-0.5">{produto.cxInner} un</p>
              <p className="text-sm font-bold text-emerald-700 mt-1 leading-none">{fmt(produto.inner)}</p>
            </button>
            <button
              onClick={() => adicionar(produto, produto.pacUnid)}
              title={`Adicionar ${produto.pacUnid} un (Unitário)`}
              className="bg-orange-50 hover:bg-orange-100 hover:ring-2 hover:ring-orange-300 rounded-lg px-3 py-1.5 text-center w-[90px] transition-all cursor-pointer"
            >
              <p className="text-xs text-orange-500 font-semibold leading-none">Unitário</p>
              <p className="text-xs text-orange-400 leading-none mt-0.5">Mín.{produto.pacUnid}</p>
              <p className="text-sm font-bold text-orange-700 mt-1 leading-none">{fmt(produto.unitario)}</p>
            </button>

            <div className="flex flex-col gap-1 w-[90px]">
              <input
                type="number"
                min={1}
                value={qtdLivre}
                onChange={e => setQtdLivre(e.target.value)}
                onBlur={e => { if (!e.target.value || parseInt(e.target.value) < 1) setQtdLivre('1') }}
                className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-gray-300"
                placeholder="Qtd."
              />
              <button
                onClick={() => adicionar(produto, Math.max(1, parseInt(qtdLivre) || 1))}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded-lg py-1 text-xs font-medium transition-colors"
              >
                + {qtdLivre || '?'} un
              </button>
            </div>
          </>
        )}
      </div>

      <button
        onClick={() => noOrcamento ? remover(produto.cod) : undefined}
        title={noOrcamento ? 'Remover do orçamento' : ''}
        className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
          noOrcamento
            ? 'bg-red-50 text-red-500 hover:bg-red-100 cursor-pointer'
            : 'bg-gray-50 text-gray-300 cursor-default'
        }`}
      >
        {noOrcamento ? '✕' : '·'}
      </button>
    </div>
  )
}
