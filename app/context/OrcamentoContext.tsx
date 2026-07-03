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
  estoque?: number | null
  imagem?: string | null
}

export interface ItemOrcamento {
  produto: ProdutoOrcamento
  quantidade: number
  precoCustom: number | null  // null = usa faixa automática; number = preço editado manualmente
}

export interface ClienteOrcamento {
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  cidade: string
  telefone: string
  condicao: string
}

export interface OrcamentoEditando {
  id: string
  numero: number
}

export function calcularPreco(produto: ProdutoOrcamento, quantidade: number): { preco: number; faixa: 'master' | 'inner' | 'unitario' } {
  if (quantidade >= produto.cxMaster) return { preco: produto.master, faixa: 'master' }
  if (quantidade >= produto.cxInner)  return { preco: produto.inner,  faixa: 'inner' }
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
  // edição de orçamento salvo
  orcamentoEditando: OrcamentoEditando | null
  clienteEditando: ClienteOrcamento | null
  obsEditando: { tipo: string; texto: string } | null
  carregarEdicao: (meta: OrcamentoEditando, itens: ItemOrcamento[], cliente: ClienteOrcamento, obs: { tipo: string; texto: string }) => void
  carregarRascunho: (itens: ItemOrcamento[], cliente: ClienteOrcamento, obs: { tipo: string; texto: string }) => void
}

const OrcamentoContext = createContext<OrcamentoContextType | null>(null)

export function OrcamentoProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemOrcamento[]>([])
  const [orcamentoEditando, setOrcamentoEditando] = useState<OrcamentoEditando | null>(null)
  const [clienteEditando, setClienteEditando]     = useState<ClienteOrcamento | null>(null)
  const [obsEditando, setObsEditando]             = useState<{ tipo: string; texto: string } | null>(null)

  const adicionar = useCallback((produto: ProdutoOrcamento, quantidade?: number) => {
    setItens(prev => {
      if (prev.find(i => i.produto.cod === produto.cod)) return prev
      const qtdInicial = Math.max(1, quantidade ?? produto.pacUnid ?? 1)
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

  const limpar = useCallback(() => {
    setItens([])
    setOrcamentoEditando(null)
    setClienteEditando(null)
    setObsEditando(null)
  }, [])

  const carregarRascunho = useCallback((
    novosItens: ItemOrcamento[],
    cliente: ClienteOrcamento,
    obs: { tipo: string; texto: string },
  ) => {
    setItens(novosItens)
    setOrcamentoEditando(null)   // null → salvar fará POST (novo orçamento)
    setClienteEditando(cliente)
    setObsEditando(obs)
  }, [])

  const carregarEdicao = useCallback((
    meta: OrcamentoEditando,
    novosItens: ItemOrcamento[],
    cliente: ClienteOrcamento,
    obs: { tipo: string; texto: string },
  ) => {
    setItens(novosItens)
    setOrcamentoEditando(meta)
    setClienteEditando(cliente)
    setObsEditando(obs)
  }, [])

  const total = itens.reduce((acc, item) => acc + precoEfetivo(item) * item.quantidade, 0)
  const totalItens = itens.length

  return (
    <OrcamentoContext.Provider value={{
      itens, adicionar, remover, atualizarQtd, atualizarPreco, limpar,
      total, totalItens,
      orcamentoEditando, clienteEditando, obsEditando, carregarEdicao, carregarRascunho,
    }}>
      {children}
    </OrcamentoContext.Provider>
  )
}

export function useOrcamento() {
  const ctx = useContext(OrcamentoContext)
  if (!ctx) throw new Error('useOrcamento deve ser usado dentro de OrcamentoProvider')
  return ctx
}
