'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface ProdutoOrcamento {
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

export interface ItemOrcamento {
  produto: ProdutoOrcamento
  quantidade: number
  precoCustom: number | null  // null = usa faixa automática; number = preço editado manualmente
}

export function calcularPreco(produto: ProdutoOrcamento, quantidade: number): { preco: number; faixa: 'master' | 'inner' | 'unitario' } {
  if (quantidade >= produto.cxMaster) return { preco: produto.master, faixa: 'master' }
  if (quantidade >= produto.cxInner) return { preco: produto.inner, faixa: 'inner' }
  return { preco: produto.unitario, faixa: 'unitario' }
}

export function precoEfetivo(item: ItemOrcamento): number {
  if (item.precoCustom !== null) return item.precoCustom
  return calcularPreco(item.produto, item.quantidade).preco
}

interface OrcamentoContextType {
  itens: ItemOrcamento[]
  adicionar: (produto: ProdutoOrcamento, quantidade?: number) => void
  remover: (cod: number) => void
  atualizarQtd: (cod: number, quantidade: number) => void
  atualizarPreco: (cod: number, preco: number | null) => void
  limpar: () => void
  total: number
  totalItens: number
}

const OrcamentoContext = createContext<OrcamentoContextType | null>(null)

export function OrcamentoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemOrcamento[]>([])

  const adicionar = useCallback((produto: ProdutoOrcamento, quantidade?: number) => {
    setItens(prev => {
      if (prev.find(i => i.produto.cod === produto.cod)) return prev
      const qtdInicial = quantidade ?? produto.pacUnid ?? 1
      return [...prev, { produto, quantidade: qtdInicial, precoCustom: null }]
    })
  }, [])

  const remover = useCallback((cod: number) => {
    setItens(prev => prev.filter(i => i.produto.cod !== cod))
  }, [])

  const atualizarQtd = useCallback((cod: number, quantidade: number) => {
    setItens(prev => prev.map(i => i.produto.cod === cod ? { ...i, quantidade: Math.max(1, quantidade) } : i))
  }, [])

  const atualizarPreco = useCallback((cod: number, preco: number | null) => {
    setItens(prev => prev.map(i => i.produto.cod === cod ? { ...i, precoCustom: preco } : i))
  }, [])

  const limpar = useCallback(() => setItens([]), [])

  const total = itens.reduce((acc, item) => acc + precoEfetivo(item) * item.quantidade, 0)

  const totalItens = itens.length

  return (
    <OrcamentoContext.Provider value={{ itens, adicionar, remover, atualizarQtd, atualizarPreco, limpar, total, totalItens }}>
      {children}
    </OrcamentoContext.Provider>
  )
}

export function useOrcamento() {
  const ctx = useContext(OrcamentoContext)
  if (!ctx) throw new Error('useOrcamento deve ser usado dentro de OrcamentoProvider')
  return ctx
}
