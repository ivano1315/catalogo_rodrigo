'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useOrcamento } from '@/app/context/OrcamentoContext'
import type { ProdutoOrcamento, ItemOrcamento, ClienteOrcamento } from '@/app/context/OrcamentoContext'
import imagensMapa from '@/lib/imagens_mapa.json'

interface ItemSalvo {
  cod: number; descricao: string; unidade: string
  quantidade: number; faixa: string; preco: number
  precoCustom: number | null; subtotal: number
  cxMaster: number; master: number; cxInner: number
  inner: number; pacUnid: number; unitario: number
  estoqueDisponivel: number | null
  ruptura: number
  valorRuptura: number
}
interface ClienteSnap {
  razaoSocial: string; nomeFantasia: string; cnpj: string
  cidade: string; telefone: string; condicao: string
}
interface Orcamento {
  _id: string; numero: number; criadoEm: string
  cliente: ClienteSnap; itens: ItemSalvo[]
  totalGeral: number
  totalRuptura?: number
  valorTotalRuptura?: number
  observacao: { tipo: string; texto: string } | string
  status: 'rascunho' | 'em_edicao' | 'enviado' | 'aprovado' | 'cancelado'
}

function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_CONFIG = {
  rascunho:  { label: 'Rascunho',   cls: 'bg-gray-100 text-gray-600' },
  em_edicao: { label: 'Em edição',  cls: 'bg-amber-100 text-amber-700' },
  enviado:   { label: 'Enviado',    cls: 'bg-blue-100 text-blue-700' },
  aprovado:  { label: 'Aprovado',   cls: 'bg-emerald-100 text-emerald-700' },
  cancelado: { label: 'Cancelado',  cls: 'bg-red-100 text-red-600' },
}
const STATUS_LIST = Object.keys(STATUS_CONFIG) as (keyof typeof STATUS_CONFIG)[]

export default function HistoricoPage() {
  const router = useRouter()
  const { carregarEdicao, carregarRascunho } = useOrcamento()

  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [confirmarDel, setConfirmarDel] = useState<string | null>(null)
  const [somenteRuptura, setSomenteRuptura] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const params = new URLSearchParams()
    if (filtroStatus) params.set('status', filtroStatus)
    if (busca) params.set('busca', busca)
    const res = await fetch(`/api/orcamentos?${params}`)
    const json = await res.json()
    setOrcamentos(json.orcamentos || [])
    setCarregando(false)
  }, [busca, filtroStatus])

  useEffect(() => { carregar() }, [carregar])

  async function atualizarStatus(id: string, status: string, recarregar = true) {
    await fetch(`/api/orcamentos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (recarregar) carregar()
  }

  async function handleEditar(o: Orcamento) {
    const mapa = imagensMapa as Record<string, string>

    // Reconstrói ItemOrcamento[] a partir do snapshot salvo
    const itensReconstruidos: ItemOrcamento[] = o.itens.map(item => {
      const tiersZerados = !item.master && !item.inner && !item.unitario

      const produto: ProdutoOrcamento = {
        _id:      String(item.cod),
        cod:      item.cod,
        descricao:item.descricao,
        unidade:  item.unidade,
        cxMaster: item.cxMaster ?? 0,
        master:   item.master   ?? 0,
        cxInner:  item.cxInner  ?? 0,
        inner:    item.inner    ?? 0,
        pacUnid:  item.pacUnid  ?? 0,
        unitario: item.unitario ?? 0,
        imagem:   mapa[String(item.cod)] || null,
      }

      // Backward compat: orçamentos salvos antes dos campos de tier
      // → usa o preço salvo como precoCustom para não perder o valor
      const precoCustom = tiersZerados
        ? item.preco
        : (item.precoCustom ?? null)

      return { produto, quantidade: item.quantidade, precoCustom }
    })

    const clienteSnap: ClienteOrcamento = {
      razaoSocial:  o.cliente.razaoSocial  || '',
      nomeFantasia: o.cliente.nomeFantasia || '',
      cnpj:         o.cliente.cnpj         || '',
      cidade:       o.cliente.cidade       || '',
      telefone:     o.cliente.telefone     || '',
      condicao:     o.cliente.condicao     || '',
    }

    // Restaura obs (suporta formato antigo string e novo objeto)
    const obsSnap = typeof o.observacao === 'string'
      ? { tipo: '', texto: o.observacao as unknown as string }
      : { tipo: o.observacao?.tipo || '', texto: o.observacao?.texto || '' }

    // Marca como em edição no banco (sem recarregar a lista — já estamos navegando)
    await atualizarStatus(o._id, 'em_edicao', false)

    carregarEdicao({ id: o._id, numero: o.numero }, itensReconstruidos, clienteSnap, obsSnap)
    router.push('/orcamento')
  }

  function handleReposicao(o: Orcamento) {
    const mapa = imagensMapa as Record<string, string>
    // Carrega apenas os itens em ruptura, com as quantidades faltantes
    const itensReposicao: ItemOrcamento[] = o.itens
      .filter(item => (item.ruptura ?? 0) > 0)
      .map(item => {
        const produto: ProdutoOrcamento = {
          _id:      String(item.cod),
          cod:      item.cod,
          descricao:item.descricao,
          unidade:  item.unidade,
          cxMaster: item.cxMaster ?? 0,
          master:   item.master   ?? 0,
          cxInner:  item.cxInner  ?? 0,
          inner:    item.inner    ?? 0,
          pacUnid:  item.pacUnid  ?? 0,
          unitario: item.unitario ?? 0,
          imagem:   mapa[String(item.cod)] || null,
        }
        return { produto, quantidade: item.ruptura, precoCustom: item.precoCustom ?? null }
      })

    const clienteSnap: ClienteOrcamento = {
      razaoSocial:  o.cliente.razaoSocial  || '',
      nomeFantasia: o.cliente.nomeFantasia || '',
      cnpj:         o.cliente.cnpj         || '',
      cidade:       o.cliente.cidade       || '',
      telefone:     o.cliente.telefone     || '',
      condicao:     o.cliente.condicao     || '',
    }

    // Cria novo orçamento pré-preenchido (não edita o original)
    carregarRascunho(
      itensReposicao,
      clienteSnap,
      { tipo: '', texto: `Reposição do pedido #${o.numero}` }
    )
    router.push('/orcamento')
  }

  async function excluir(id: string) {
    await fetch(`/api/orcamentos/${id}`, { method: 'DELETE' })
    setConfirmarDel(null)
    carregar()
  }

  const totalMes = orcamentos.filter(o => {
    const d = new Date(o.criadoEm)
    const agora = new Date()
    return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear()
  }).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-bold text-gray-900">Histórico de Orçamentos</h1>
          <div className="ml-auto flex gap-2 flex-wrap items-center">
            {/* Busca */}
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="border border-gray-300 rounded-lg pl-3 pr-3 py-2 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {/* Filtro status */}
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os status</option>
              {STATUS_LIST.map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
            {/* Filtro ruptura */}
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={somenteRuptura}
                onChange={e => setSomenteRuptura(e.target.checked)}
                className="accent-orange-500 w-4 h-4"
              />
              ⚠️ Com ruptura
            </label>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total salvo',    valor: orcamentos.length,                                                                   cor: 'text-gray-900',     border: '' },
            { label: 'Este mês',       valor: totalMes,                                                                            cor: 'text-blue-600',     border: '' },
            { label: 'Aprovados',      valor: orcamentos.filter(o => o.status === 'aprovado').length,                              cor: 'text-emerald-600',  border: '' },
            { label: 'Com ruptura',    valor: orcamentos.filter(o => (o.totalRuptura ?? 0) > 0).length,                            cor: 'text-orange-600',   border: 'border-orange-100' },
          ].map(s => (
            <div key={s.label} className={`bg-white rounded-xl border p-4 ${s.border || 'border-gray-100'}`}>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.cor}`}>{s.valor}</p>
            </div>
          ))}
        </div>

        {/* Lista */}
        {carregando ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : orcamentos.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg">Nenhum orçamento encontrado</p>
            <p className="text-sm mt-2">Salve um orçamento na tela de Orçamento para começar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orcamentos.filter(o => !somenteRuptura || (o.totalRuptura ?? 0) > 0).map(o => {
              const cfg = STATUS_CONFIG[o.status]
              const aberto = expandido === o._id
              const nomeCliente = o.cliente.nomeFantasia || o.cliente.razaoSocial || 'Cliente não informado'
              const temRuptura = (o.totalRuptura ?? 0) > 0

              return (
                <div key={o._id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
                  {/* Linha principal */}
                  <div
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${temRuptura ? 'border-l-4 border-l-orange-400' : ''}`}
                    onClick={() => setExpandido(aberto ? null : o._id)}
                  >
                    {/* Número */}
                    <span className="text-sm font-mono font-bold text-gray-500 w-10 shrink-0">#{o.numero}</span>

                    {/* Cliente + data */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{nomeCliente}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtData(o.criadoEm)} · {o.itens.length} {o.itens.length === 1 ? 'item' : 'itens'}</p>
                    </div>

                    {/* Total + ruptura */}
                    <div className="hidden sm:flex flex-col items-end shrink-0">
                      <span className="text-sm font-bold text-gray-900">{fmt(o.totalGeral)}</span>
                      {(o.valorTotalRuptura ?? 0) > 0 && (
                        <span className="text-xs text-orange-500 font-medium">⚠️ {fmt(o.valorTotalRuptura ?? 0)} ruptura</span>
                      )}
                    </div>

                    {/* Status badge */}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${cfg.cls}`}>{cfg.label}</span>

                    {/* Chevron */}
                    <span className={`text-gray-400 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}>▾</span>
                  </div>

                  {/* Detalhes expandidos */}
                  {aberto && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                      {/* Dados do cliente */}
                      {(o.cliente.razaoSocial || o.cliente.cnpj || o.cliente.cidade) && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs">
                          {o.cliente.razaoSocial  && <span className="text-gray-500">Razão Social: <strong className="text-gray-700">{o.cliente.razaoSocial}</strong></span>}
                          {o.cliente.cnpj         && <span className="text-gray-500">CNPJ: <strong className="text-gray-700">{o.cliente.cnpj}</strong></span>}
                          {o.cliente.cidade       && <span className="text-gray-500">Cidade: <strong className="text-gray-700">{o.cliente.cidade}</strong></span>}
                          {o.cliente.telefone     && <span className="text-gray-500">Telefone: <strong className="text-gray-700">{o.cliente.telefone}</strong></span>}
                          {o.cliente.condicao     && <span className="text-gray-500">Pagamento: <strong className="text-gray-700">{o.cliente.condicao}</strong></span>}
                        </div>
                      )}

                      {/* Itens do pedido */}
                      <div className="rounded-lg border border-gray-100 overflow-hidden">
                        <div className="hidden sm:grid grid-cols-[1fr_60px_80px_90px] gap-3 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          <span>Produto</span><span className="text-center">Qtd.</span><span className="text-right">Preço</span><span className="text-right">Subtotal</span>
                        </div>
                        {o.itens.map((item, idx) => (
                          <div key={idx} className={`grid grid-cols-1 sm:grid-cols-[1fr_60px_80px_90px] gap-1 sm:gap-3 px-3 py-2 border-t border-gray-50 first:border-t-0 text-sm ${(item.ruptura ?? 0) > 0 ? 'bg-orange-50/30' : ''}`}>
                            <div>
                              <span className="font-medium text-gray-800">{item.descricao}</span>
                              <span className="ml-2 text-xs text-gray-400">{item.cod}</span>
                              {(item.ruptura ?? 0) > 0 && (
                                <span className="ml-2 text-xs font-semibold text-orange-500">⚠️ {item.ruptura} un em falta</span>
                              )}
                            </div>
                            <span className="text-gray-500 text-center">{item.quantidade} {item.unidade}</span>
                            <span className="text-gray-700 text-right">{fmt(item.preco)}</span>
                            <span className="font-semibold text-gray-900 text-right">{fmt(item.subtotal)}</span>
                          </div>
                        ))}
                        <div className="flex justify-end px-3 py-2 border-t border-gray-200 bg-gray-50">
                          <span className="text-sm font-bold text-gray-900">Total: {fmt(o.totalGeral)}</span>
                        </div>
                      </div>

                      {/* Seção dedicada de Ruptura */}
                      {temRuptura && (
                        <div className="rounded-lg border border-orange-200 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2.5 bg-orange-50 border-b border-orange-200">
                            <div className="flex items-center gap-2">
                              <span className="text-base">🔴</span>
                              <span className="text-sm font-bold text-orange-700">Atendimento Parcial — Ruptura de Estoque</span>
                            </div>
                            <span className="text-xs font-semibold text-orange-600 bg-orange-100 px-2.5 py-1 rounded-full">
                              {o.totalRuptura} un · {fmt(o.valorTotalRuptura ?? 0)}
                            </span>
                          </div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-4 py-2 font-semibold">Produto</th>
                                <th className="text-center px-2 py-2 font-semibold">Pedido</th>
                                <th className="text-center px-2 py-2 font-semibold">Estoque</th>
                                <th className="text-center px-2 py-2 font-semibold text-orange-500">Em falta</th>
                                <th className="text-right px-4 py-2 font-semibold">Val. em falta</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {o.itens.filter(i => (i.ruptura ?? 0) > 0).map((item, idx) => (
                                <tr key={idx} className="hover:bg-orange-50/20">
                                  <td className="px-4 py-2 text-gray-700 font-medium">
                                    <span className="font-mono text-gray-400 mr-1.5">{item.cod}</span>{item.descricao}
                                  </td>
                                  <td className="px-2 py-2 text-center text-gray-600">{item.quantidade} {item.unidade}</td>
                                  <td className="px-2 py-2 text-center text-gray-500">{item.estoqueDisponivel ?? '—'}</td>
                                  <td className="px-2 py-2 text-center font-bold text-orange-600">{item.ruptura}</td>
                                  <td className="px-4 py-2 text-right font-semibold text-orange-700">{fmt(item.valorRuptura ?? 0)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-orange-200 bg-orange-50/40">
                                <td colSpan={4} className="px-4 py-2 text-orange-700 font-bold">Total a repor ao cliente</td>
                                <td className="px-4 py-2 text-right font-bold text-orange-700">{fmt(o.valorTotalRuptura ?? 0)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}

                      {(() => {
                        const obsTexto = !o.observacao ? '' :
                          typeof o.observacao === 'string' ? o.observacao :
                          [o.observacao.tipo, o.observacao.texto].filter(Boolean).join(' — ')
                        return obsTexto
                          ? <p className="text-xs text-gray-500 italic">Obs: {obsTexto}</p>
                          : null
                      })()}

                      {/* Ações */}
                      <div className="flex flex-wrap gap-2 items-center pt-1">
                        <button
                          onClick={() => handleEditar(o)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors"
                        >
                          ✏️ Editar orçamento
                        </button>

                        {temRuptura && (
                          <button
                            onClick={() => handleReposicao(o)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold hover:bg-orange-100 transition-colors"
                          >
                            📦 Criar reposição
                          </button>
                        )}

                        <div className="flex flex-wrap gap-1.5 items-center ml-2">
                          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Status:</span>
                          {STATUS_LIST.filter(s => s !== 'em_edicao').map(s => (
                            <button
                              key={s}
                              onClick={() => atualizarStatus(o._id, s)}
                              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all border ${
                                o.status === s
                                  ? `${STATUS_CONFIG[s].cls} border-transparent`
                                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              {STATUS_CONFIG[s].label}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setConfirmarDel(o._id)}
                          className="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1.5"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal confirmação de exclusão */}
      {confirmarDel && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-base font-semibold text-gray-900 mb-2">Excluir orçamento?</p>
            <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmarDel(null)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => excluir(confirmarDel)} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
