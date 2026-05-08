'use client'

import { useState, useEffect } from 'react'
import { useOrcamento, calcularPreco, precoEfetivo } from '@/app/context/OrcamentoContext'
import Image from 'next/image'
import ClienteSelectorModal from './ClienteSelectorModal'

function fmt(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function descPct(original: number, promo: number) {
  if (!original) return 0
  return Math.round(((original - promo) / original) * 100)
}

const BADGE_FAIXA = {
  master:   'bg-blue-100 text-blue-700',
  inner:    'bg-emerald-100 text-emerald-700',
  unitario: 'bg-orange-100 text-orange-700',
}
const LABEL_FAIXA = { master: 'Master', inner: 'Inner', unitario: 'Unitário' }

const CONDICOES = [
  'ANTECIPADO', '30/60/90', '30/45/60/75/90',
  '30/45/60/75/90/105', '30/45/60/75/90/105/120',
]

const TIPO_DESCONTO = [
  { value: 'campanha', label: '📅 Campanha do Mês' },
  { value: 'gerente',  label: '✅ Autorizado pelo Gerente' },
  { value: 'outro',    label: '📝 Outro' },
]

interface Cliente {
  razaoSocial: string; nomeFantasia: string; cnpj: string
  cidade: string; telefone: string; condicao: string
}

interface Obs {
  tipo: string   // 'campanha' | 'gerente' | 'outro' | ''
  texto: string
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white'

export default function OrcamentoTela() {
  const { itens, remover, atualizarQtd, atualizarPreco, limpar, total, orcamentoEditando, clienteEditando, obsEditando } = useOrcamento()

  const [cliente, setCliente] = useState<Cliente>({
    razaoSocial: '', nomeFantasia: '', cnpj: '', cidade: '', telefone: '', condicao: '',
  })

  const [precoInput, setPrecoInput] = useState<Record<number, string>>({})
  const [obs, setObs] = useState<Obs>({ tipo: '', texto: '' })

  // Sincroniza cliente, precoInput e obs ao carregar um orçamento para edição
  useEffect(() => {
    if (!clienteEditando) return
    setCliente({
      razaoSocial:  clienteEditando.razaoSocial  || '',
      nomeFantasia: clienteEditando.nomeFantasia || '',
      cnpj:         clienteEditando.cnpj         || '',
      cidade:       clienteEditando.cidade       || '',
      telefone:     clienteEditando.telefone     || '',
      condicao:     clienteEditando.condicao     || '',
    })
  }, [clienteEditando])

  // Inicializa precoInput e obs ao carregar edição
  useEffect(() => {
    if (!orcamentoEditando || itens.length === 0) return
    const init: Record<number, string> = {}
    itens.forEach(item => {
      if (item.precoCustom !== null) {
        init[item.produto.cod] = String(item.precoCustom).replace('.', ',')
      }
    })
    setPrecoInput(init)
    if (obsEditando) setObs({ tipo: obsEditando.tipo || '', texto: obsEditando.texto || '' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orcamentoEditando])
  const [showSelectorCliente, setShowSelectorCliente] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvoNum, setSalvoNum] = useState<number | null>(null)

  const temPromo = itens.some(i => i.precoCustom !== null)
  const qtdItensPromo = itens.filter(i => i.precoCustom !== null).length
  const totalUnidades = itens.reduce((a, i) => a + i.quantidade, 0)

  // Breakdown de preços
  const subtotalSemDesconto = itens.reduce((a, item) =>
    a + item.produto.unitario * item.quantidade, 0)
  const descontoFaixa = itens.reduce((a, item) => {
    const { preco: precoFaixa } = calcularPreco(item.produto, item.quantidade)
    return a + Math.max(0, item.produto.unitario - precoFaixa) * item.quantidade
  }, 0)
  const descontoPromo = itens.reduce((a, item) => {
    if (item.precoCustom === null) return a
    const { preco: precoFaixa } = calcularPreco(item.produto, item.quantidade)
    return a + Math.max(0, precoFaixa - item.precoCustom) * item.quantidade
  }, 0)
  const totalEconomia = descontoFaixa + descontoPromo
  const pctEconomia = subtotalSemDesconto > 0
    ? Math.round((totalEconomia / subtotalSemDesconto) * 100) : 0

  // Ruptura de estoque
  const itensRuptura = itens
    .filter(item => item.produto.estoque != null && item.quantidade > (item.produto.estoque ?? 0))
    .map(item => ({
      item,
      ruptura: item.quantidade - (item.produto.estoque ?? 0),
      valorRuptura: precoEfetivo(item) * (item.quantidade - (item.produto.estoque ?? 0)),
    }))
  const valorTotalRuptura = itensRuptura.reduce((a, r) => a + r.valorRuptura, 0)
  const totalUnidadesRuptura = itensRuptura.reduce((a, r) => a + r.ruptura, 0)

  function set(campo: keyof Cliente, valor: string) {
    setCliente(prev => ({ ...prev, [campo]: valor }))
  }

  function ativarPromo(cod: number, precoAtual: number) {
    setPrecoInput(prev => ({ ...prev, [cod]: String(precoAtual).replace('.', ',') }))
    atualizarPreco(cod, precoAtual)
  }

  function desativarPromo(cod: number) {
    setPrecoInput(prev => { const n = { ...prev }; delete n[cod]; return n })
    atualizarPreco(cod, null)
  }

  function commitPreco(cod: number) {
    const raw = (precoInput[cod] ?? '').replace(',', '.')
    const valor = parseFloat(raw)
    if (!isNaN(valor) && valor >= 0) atualizarPreco(cod, valor)
  }

  function labelObs() {
    const t = TIPO_DESCONTO.find(t => t.value === obs.tipo)
    if (!t) return ''
    return obs.texto ? `${t.label} — ${obs.texto}` : t.label
  }

  async function salvarOrcamento() {
    setSalvando(true)
    setSalvoNum(null)
    try {
      const itensSalvos = itens.map(item => {
        const { faixa } = calcularPreco(item.produto, item.quantidade)
        const preco = precoEfetivo(item)
        const estoqueDisponivel = item.produto.estoque ?? null
        const ruptura = estoqueDisponivel != null
          ? Math.max(0, item.quantidade - estoqueDisponivel) : 0
        return {
          cod:        item.produto.cod,
          descricao:  item.produto.descricao,
          unidade:    item.produto.unidade,
          quantidade: item.quantidade,
          faixa:      item.precoCustom !== null ? 'promocao' : faixa,
          preco,
          precoCustom: item.precoCustom,
          subtotal:   preco * item.quantidade,
          cxMaster:   item.produto.cxMaster,
          master:     item.produto.master,
          cxInner:    item.produto.cxInner,
          inner:      item.produto.inner,
          pacUnid:    item.produto.pacUnid,
          unitario:   item.produto.unitario,
          estoqueDisponivel,
          ruptura,
          valorRuptura: preco * ruptura,
        }
      })

      const totalRuptura      = itensSalvos.reduce((a, i) => a + i.ruptura, 0)
      const valorTotalRupturaSalvo = itensSalvos.reduce((a, i) => a + i.valorRuptura, 0)

      const payload = {
        cliente:    { ...cliente },
        itens:      itensSalvos,
        totalGeral: total,
        totalRuptura,
        valorTotalRuptura: valorTotalRupturaSalvo,
        observacao: { tipo: obs.tipo, texto: obs.texto },
        status:     'rascunho',
      }

      let json
      if (orcamentoEditando) {
        // Atualiza orçamento existente
        const res = await fetch(`/api/orcamentos/${orcamentoEditando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        json = await res.json()
        if (json.ok) setSalvoNum(orcamentoEditando.numero)
      } else {
        // Cria novo orçamento
        const res = await fetch('/api/orcamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        json = await res.json()
        if (json.ok) setSalvoNum(json.numero)
      }
    } finally {
      setSalvando(false)
    }
  }

  async function exportarPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape' })
    const dataHoje = new Date().toLocaleDateString('pt-BR')

    doc.setFontSize(18); doc.setTextColor(30, 30, 30)
    doc.text('Orçamento — Waves Plus', 14, 18)
    doc.setFontSize(9); doc.setTextColor(120, 120, 120)
    doc.text(`Gerado em ${dataHoje}`, 14, 24)

    let y = 32
    doc.setFontSize(10); doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'bold'); doc.text('Dados do Cliente', 14, y)
    doc.setFont('helvetica', 'normal'); y += 6
    doc.setFontSize(9); doc.setTextColor(80, 80, 80)
    const c1 = 14, c2 = 110
    if (cliente.razaoSocial || cliente.nomeFantasia) {
      if (cliente.razaoSocial)  doc.text(`Razão Social: ${cliente.razaoSocial}`, c1, y)
      if (cliente.nomeFantasia) doc.text(`Nome Fantasia: ${cliente.nomeFantasia}`, c2, y)
      y += 5
    }
    if (cliente.cnpj || cliente.cidade) {
      if (cliente.cnpj)    doc.text(`CNPJ: ${cliente.cnpj}`, c1, y)
      if (cliente.cidade)  doc.text(`Cidade: ${cliente.cidade}`, c2, y)
      y += 5
    }
    if (cliente.telefone || cliente.condicao) {
      if (cliente.telefone)  doc.text(`Telefone: ${cliente.telefone}`, c1, y)
      if (cliente.condicao)  doc.text(`Cond. Pagamento: ${cliente.condicao}`, c2, y)
      y += 5
    }
    y += 2

    const linhas = itens.map((item, idx) => {
      const { faixa } = calcularPreco(item.produto, item.quantidade)
      const precoOriginal = calcularPreco(item.produto, item.quantidade).preco
      const preco = precoEfetivo(item)
      const subtotal = preco * item.quantidade
      const faixaLabel = item.precoCustom !== null ? 'Promoção' : LABEL_FAIXA[faixa]
      const desc = item.precoCustom !== null ? `-${descPct(precoOriginal, preco)}%` : ''
      return [idx + 1, item.produto.cod, item.produto.descricao, item.produto.unidade,
              item.quantidade, faixaLabel, fmt(preco) + (desc ? ` (${desc})` : ''), fmt(subtotal)]
    })

    autoTable(doc, {
      startY: y,
      head: [['#', 'Código', 'Descrição', 'Un.', 'Qtd.', 'Faixa', 'Preço unit.', 'Subtotal']],
      body: linhas,
      foot: [['', '', '', '', '', '', 'TOTAL', fmt(total)]],
      headStyles: { fillColor: [37, 99, 235], fontSize: 9, fontStyle: 'bold' },
      footStyles: { fillColor: [243, 244, 246], textColor: [30, 30, 30], fontStyle: 'bold', fontSize: 10 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' }, 1: { cellWidth: 18 }, 2: { cellWidth: 'auto' },
        3: { cellWidth: 12, halign: 'center' }, 4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 22, halign: 'center' }, 6: { cellWidth: 30, halign: 'right' }, 7: { cellWidth: 28, halign: 'right' },
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 14, right: 14 },
    })

    // Observação no final
    if (obs.tipo) {
      const finalY = (doc as any).lastAutoTable.finalY + 8
      doc.setFontSize(9); doc.setTextColor(80, 80, 80)
      doc.setFont('helvetica', 'bold'); doc.text('Observação sobre desconto:', 14, finalY)
      doc.setFont('helvetica', 'normal')
      doc.text(labelObs(), 14, finalY + 5)
    }

    const nomeArq = cliente.nomeFantasia || cliente.razaoSocial
      ? `orcamento-${(cliente.nomeFantasia || cliente.razaoSocial).replace(/\s+/g, '-').toLowerCase()}-${dataHoje.replace(/\//g, '-')}.pdf`
      : `orcamento-${new Date().toISOString().slice(0, 10)}.pdf`

    doc.save(nomeArq)
  }

  async function exportarExcel() {
    const { utils, writeFile } = await import('xlsx')
    const dataHoje = new Date().toLocaleDateString('pt-BR')

    const infoCliente = [
      ['Orçamento — Waves Plus'],
      [`Gerado em: ${dataHoje}`],
      [],
      ['DADOS DO CLIENTE'],
      ['Razão Social',    cliente.razaoSocial  || '-'],
      ['Nome Fantasia',   cliente.nomeFantasia || '-'],
      ['CNPJ',            cliente.cnpj         || '-'],
      ['Cidade',          cliente.cidade       || '-'],
      ['Telefone',        cliente.telefone     || '-'],
      ['Cond. Pagamento', cliente.condicao     || '-'],
      [],
    ]

    const cabecalho = ['#', 'Código', 'Descrição', 'Unidade', 'Quantidade', 'Faixa', 'Preço Unit. (R$)', 'Subtotal (R$)', 'Desconto']

    const linhas = itens.map((item, idx) => {
      const { faixa } = calcularPreco(item.produto, item.quantidade)
      const precoOriginal = calcularPreco(item.produto, item.quantidade).preco
      const preco    = precoEfetivo(item)
      const subtotal = preco * item.quantidade
      const pct      = item.precoCustom !== null ? `${descPct(precoOriginal, preco)}%` : ''
      return [idx + 1, item.produto.cod, item.produto.descricao, item.produto.unidade,
              item.quantidade, item.precoCustom !== null ? 'Promoção' : LABEL_FAIXA[faixa],
              preco, subtotal, pct]
    })

    const totalUnidades = itens.reduce((a, i) => a + i.quantidade, 0)
    const rodape: (string | number)[][] = [
      [],
      ['', '', '', '', totalUnidades, '', 'TOTAL', total, ''],
    ]

    const obsLinhas: (string)[][] = obs.tipo
      ? [[], ['Observação sobre desconto:', labelObs()]]
      : []

    const wsData = [...infoCliente, cabecalho, ...linhas, ...rodape, ...obsLinhas]
    const ws = utils.aoa_to_sheet(wsData)
    ws['!cols'] = [
      { wch: 4 }, { wch: 10 }, { wch: 55 }, { wch: 8 },
      { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 10 },
    ]

    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Orçamento')

    const nomeArq = cliente.nomeFantasia || cliente.razaoSocial
      ? `orcamento-${(cliente.nomeFantasia || cliente.razaoSocial).replace(/\s+/g, '-').toLowerCase()}-${dataHoje.replace(/\//g, '-')}.xlsx`
      : `orcamento-${new Date().toISOString().slice(0, 10)}.xlsx`

    writeFile(wb, nomeArq)
  }

  if (itens.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
        <span className="text-6xl">🛒</span>
        <p className="text-xl font-medium text-gray-600">Nenhum produto no orçamento</p>
        <p className="text-sm text-gray-400">Acesse o Catálogo e adicione produtos</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900">Orçamento</h1>
          {orcamentoEditando ? (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
              ✏️ Editando #{orcamentoEditando.numero}
            </span>
          ) : (
            <span className="text-sm text-gray-400">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</span>
          )}
          <div className="ml-auto flex gap-2">
            {orcamentoEditando ? (
              <button onClick={limpar} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors hidden sm:block">+ Novo orçamento</button>
            ) : (
              <button onClick={limpar} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors hidden sm:block">Limpar tudo</button>
            )}
            <button onClick={salvarOrcamento} disabled={salvando} className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
              {salvando ? '…' : '💾 Salvar'}
            </button>
            <button onClick={exportarExcel} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors">↓ Excel</button>
            <button onClick={exportarPDF}   className="px-3 py-2 rounded-lg bg-blue-600   text-white text-sm font-medium hover:bg-blue-700   transition-colors">↓ PDF</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">

        {/* Dados do cliente */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-700">Dados do Cliente</h2>
            <button
              onClick={() => setShowSelectorCliente(true)}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              🏢 Buscar cliente cadastrado
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Campo label="Razão Social">
              <input className={inputCls} value={cliente.razaoSocial} onChange={e => set('razaoSocial', e.target.value)} placeholder="Empresa Ltda." />
            </Campo>
            <Campo label="Nome Fantasia">
              <input className={inputCls} value={cliente.nomeFantasia} onChange={e => set('nomeFantasia', e.target.value)} placeholder="Nome Fantasia" />
            </Campo>
            <Campo label="CNPJ">
              <input className={inputCls} value={cliente.cnpj} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
            </Campo>
            <Campo label="Cidade">
              <input className={inputCls} value={cliente.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Fortaleza - CE" />
            </Campo>
            <Campo label="Telefone">
              <input className={inputCls} value={cliente.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(85) 99999-9999" />
            </Campo>
            <Campo label="Condição de Pagamento">
              <select className={inputCls} value={cliente.condicao} onChange={e => set('condicao', e.target.value)}>
                <option value="">Selecione...</option>
                {CONDICOES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Campo>
          </div>
        </div>

        {/* Cabeçalho da tabela */}
        <div className="hidden md:grid grid-cols-[48px_64px_1fr_64px_130px_180px_110px_40px] gap-3 px-4 py-2 bg-gray-100 rounded-lg text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span></span><span>Código</span><span>Descrição</span>
          <span className="text-center">Unid.</span>
          <span className="text-center">Quantidade</span>
          <span className="text-center">Preço unit.</span>
          <span className="text-right">Subtotal</span>
          <span></span>
        </div>

        {itens.map(item => {
          const { faixa } = calcularPreco(item.produto, item.quantidade)
          const precoOriginal = calcularPreco(item.produto, item.quantidade).preco
          const preco    = precoEfetivo(item)
          const subtotal = preco * item.quantidade
          const emPromo  = item.precoCustom !== null
          const pct      = emPromo ? descPct(precoOriginal, preco) : 0
          const rupturaItem = item.produto.estoque != null && item.quantidade > (item.produto.estoque ?? 0)
            ? item.quantidade - (item.produto.estoque ?? 0) : 0

          return (
            <div key={item.produto.cod} className={`bg-white rounded-xl border px-4 py-3 grid grid-cols-1 md:grid-cols-[48px_64px_1fr_64px_130px_180px_110px_40px] gap-3 items-center hover:shadow-sm transition-shadow ${rupturaItem > 0 ? 'border-orange-200 bg-orange-50/10' : emPromo ? 'border-purple-200 bg-purple-50/20' : 'border-gray-100'}`}>

              {/* Imagem */}
              <div className="relative w-12 h-12 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                {item.produto.imagem
                  ? <Image src={item.produto.imagem} alt={item.produto.descricao} fill className="object-contain p-1" sizes="48px" />
                  : <span className="text-xl text-gray-200">📦</span>}
              </div>

              <span className="text-xs font-mono text-gray-400">{item.produto.cod}</span>
              <div>
                <p className="text-sm font-medium text-gray-800 leading-snug">{item.produto.descricao}</p>
                {rupturaItem > 0 && (
                  <p className="text-xs text-orange-500 font-medium mt-0.5">
                    ⚠️ {rupturaItem} un em falta · estoque: {item.produto.estoque ?? 0}
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-500 text-center">{item.produto.unidade}</span>

              {/* Quantidade */}
              <div className="flex items-center justify-center gap-1">
                <button onClick={() => atualizarQtd(item.produto.cod, item.quantidade - 1)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-sm">−</button>
                <input type="number" min={1} value={item.quantidade}
                  onChange={e => atualizarQtd(item.produto.cod, parseInt(e.target.value) || 1)}
                  className="w-16 text-center border border-gray-200 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <button onClick={() => atualizarQtd(item.produto.cod, item.quantidade + 1)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-sm">+</button>
              </div>

              {/* Preço */}
              <div className="flex flex-col items-center gap-1">
                {emPromo ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700">Promoção</span>
                      {pct > 0 && <span className="text-xs font-bold text-red-500">−{pct}%</span>}
                    </div>
                    <span className="text-xs text-gray-400 line-through">{fmt(precoOriginal)}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">R$</span>
                      <input type="text"
                        value={precoInput[item.produto.cod] ?? ''}
                        onChange={e => setPrecoInput(prev => ({ ...prev, [item.produto.cod]: e.target.value }))}
                        onBlur={() => commitPreco(item.produto.cod)}
                        onKeyDown={e => e.key === 'Enter' && commitPreco(item.produto.cod)}
                        className="w-20 text-center border border-purple-300 rounded-lg py-1 text-sm font-bold text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      />
                    </div>
                    <button onClick={() => desativarPromo(item.produto.cod)} className="text-xs text-purple-400 hover:text-purple-600 underline">Usar faixa</button>
                  </>
                ) : (
                  <>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${BADGE_FAIXA[faixa]}`}>{LABEL_FAIXA[faixa]}</span>
                    <span className="text-sm font-bold text-gray-700">{fmt(preco)}</span>
                    <button onClick={() => ativarPromo(item.produto.cod, preco)} className="text-xs text-gray-400 hover:text-purple-600 underline transition-colors">
                      + Promoção
                    </button>
                  </>
                )}
              </div>

              <p className={`text-sm font-bold text-right ${emPromo ? 'text-purple-700' : 'text-gray-900'}`}>{fmt(subtotal)}</p>
              <button onClick={() => remover(item.produto.cod)} className="w-8 h-8 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center text-lg">✕</button>
            </div>
          )
        })}

        {/* Observação sobre desconto */}
        {temPromo && (
          <div className="bg-white rounded-xl border border-purple-100 p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-1">Observação sobre o desconto</h2>
            <p className="text-xs text-gray-400 mb-4">{qtdItensPromo} {qtdItensPromo === 1 ? 'item com preço' : 'itens com preços'} promocional — selecione a justificativa</p>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              {TIPO_DESCONTO.map(t => (
                <label key={t.value} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all flex-1 ${obs.tipo === t.value ? 'border-purple-400 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="tipoDesconto" value={t.value}
                    checked={obs.tipo === t.value}
                    onChange={() => setObs(prev => ({ ...prev, tipo: t.value }))}
                    className="accent-purple-600" />
                  <span className={`text-sm font-medium ${obs.tipo === t.value ? 'text-purple-700' : 'text-gray-600'}`}>{t.label}</span>
                </label>
              ))}
            </div>
            {obs.tipo && (
              <textarea
                value={obs.texto}
                onChange={e => setObs(prev => ({ ...prev, texto: e.target.value }))}
                placeholder={obs.tipo === 'gerente' ? 'Nome do gerente responsável...' : obs.tipo === 'campanha' ? 'Nome ou descrição da campanha...' : 'Descreva a observação...'}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              />
            )}
          </div>
        )}

        {/* Ruptura de Estoque */}
        {itensRuptura.length > 0 && (
          <div className="bg-white rounded-xl border border-orange-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🔴</span>
              <h2 className="text-sm font-bold text-orange-700">Ruptura de Estoque</h2>
              <span className="text-xs bg-orange-100 text-orange-600 font-semibold px-2 py-0.5 rounded-full">
                {itensRuptura.length} {itensRuptura.length === 1 ? 'item' : 'itens'} · {totalUnidadesRuptura} un sem cobertura
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="text-left pb-2 font-semibold">Produto</th>
                    <th className="text-center pb-2 font-semibold">Pedido</th>
                    <th className="text-center pb-2 font-semibold">Estoque</th>
                    <th className="text-center pb-2 font-semibold text-orange-500">Em falta</th>
                    <th className="text-right pb-2 font-semibold">Val. em falta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {itensRuptura.map(({ item, ruptura, valorRuptura }) => (
                    <tr key={item.produto.cod}>
                      <td className="py-2 text-gray-700 font-medium pr-4">
                        <span className="font-mono text-gray-400 mr-1">{item.produto.cod}</span>
                        {item.produto.descricao}
                      </td>
                      <td className="py-2 text-center text-gray-600">{item.quantidade}</td>
                      <td className="py-2 text-center text-gray-500">{item.produto.estoque ?? '—'}</td>
                      <td className="py-2 text-center font-bold text-orange-600">{ruptura}</td>
                      <td className="py-2 text-right text-orange-700 font-medium">{fmt(valorRuptura)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-orange-200">
                    <td colSpan={4} className="pt-2 text-orange-700 font-bold text-xs">Total em falta</td>
                    <td className="pt-2 text-right font-bold text-orange-700">{fmt(valorTotalRuptura)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Rodapé com breakdown de valores */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4">

            {/* Resumo do pedido */}
            <div className="space-y-1">
              <p className="text-sm text-gray-500">
                {itens.length} {itens.length === 1 ? 'produto' : 'produtos'} · {totalUnidades} unidades
              </p>
              {temPromo && (
                <p className="text-xs text-purple-500">
                  ● {qtdItensPromo} {qtdItensPromo === 1 ? 'item com preço' : 'itens com preços'} promocional
                  {obs.tipo && <span className="ml-1 text-purple-400">· {TIPO_DESCONTO.find(t => t.value === obs.tipo)?.label}</span>}
                </p>
              )}
              {itensRuptura.length > 0 && (
                <p className="text-xs text-orange-500">
                  ⚠️ {itensRuptura.length} {itensRuptura.length === 1 ? 'item' : 'itens'} com ruptura · {fmt(valorTotalRuptura)} a repor
                </p>
              )}
              {cliente.condicao && (
                <p className="text-xs text-gray-400">Cond. pagamento: <span className="font-medium text-gray-600">{cliente.condicao}</span></p>
              )}
            </div>

            {/* Breakdown de preços */}
            <div className="sm:min-w-[240px]">
              <div className="flex justify-between text-sm text-gray-500 mb-1.5">
                <span>Subtotal s/ desconto</span>
                <span>{fmt(subtotalSemDesconto)}</span>
              </div>
              {descontoFaixa > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 mb-1.5">
                  <span>Desconto de faixa</span>
                  <span>− {fmt(descontoFaixa)}</span>
                </div>
              )}
              {descontoPromo > 0 && (
                <div className="flex justify-between text-sm text-purple-600 mb-1.5">
                  <span>Desconto de promoção</span>
                  <span>− {fmt(descontoPromo)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between items-baseline">
                <span className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Total</span>
                <span className="text-2xl font-bold text-gray-900">{fmt(total)}</span>
              </div>
              {totalEconomia > 0 && (
                <p className="text-right text-xs text-emerald-600 font-medium mt-1">
                  💚 Economia de {fmt(totalEconomia)} ({pctEconomia}%)
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Toast de confirmação de salvamento */}
      {salvoNum !== null && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in">
          <span className="text-green-400">✓</span>
          <span>Orçamento <strong>#{salvoNum}</strong> {orcamentoEditando ? 'atualizado' : 'salvo'} com sucesso!</span>
          <a href="/historico" className="underline text-blue-300 hover:text-blue-200 ml-1">Ver histórico</a>
          <button onClick={() => setSalvoNum(null)} className="ml-2 text-gray-400 hover:text-white">✕</button>
        </div>
      )}

      {showSelectorCliente && (
        <ClienteSelectorModal
          onSelecionar={c => {
            setCliente({
              razaoSocial:  c.razaoSocial       || '',
              nomeFantasia: c.nomeFantasia       || '',
              cnpj:         c.cnpj              || '',
              cidade:       c.cidade && c.estado ? `${c.cidade} — ${c.estado}` : c.cidade || '',
              telefone:     c.telefone          || '',
              condicao:     c.condicaoPagamento || '',
            })
            setShowSelectorCliente(false)
          }}
          onClose={() => setShowSelectorCliente(false)}
        />
      )}
    </div>
  )
}
