'use client'

import { useState } from 'react'
import { useOrcamento, calcularPreco } from '@/app/context/OrcamentoContext'
import Image from 'next/image'
import Link from 'next/link'

function fmt(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const BADGE_FAIXA = {
  master: 'bg-blue-100 text-blue-700',
  inner: 'bg-emerald-100 text-emerald-700',
  unitario: 'bg-orange-100 text-orange-700',
}

const LABEL_FAIXA = {
  master: 'Master',
  inner: 'Inner',
  unitario: 'Unitário',
}

const CONDICOES = [
  'ANTECIPADO',
  '30/60/90',
  '30/45/60/75/90',
  '30/45/60/75/90/105',
  '30/45/60/75/90/105/120',
]

interface Cliente {
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  cidade: string
  telefone: string
  condicao: string
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
  const { itens, remover, atualizarQtd, limpar, total } = useOrcamento()

  const [cliente, setCliente] = useState<Cliente>({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    cidade: '',
    telefone: '',
    condicao: '',
  })

  function set(campo: keyof Cliente, valor: string) {
    setCliente(prev => ({ ...prev, [campo]: valor }))
  }

  async function exportarPDF() {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ orientation: 'landscape' })
    const dataHoje = new Date().toLocaleDateString('pt-BR')

    // Cabeçalho
    doc.setFontSize(18)
    doc.setTextColor(30, 30, 30)
    doc.text('Orçamento — Waves Plus', 14, 18)

    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    doc.text(`Gerado em ${dataHoje}`, 14, 24)

    // Dados do cliente
    let y = 32
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'bold')
    doc.text('Dados do Cliente', 14, y)
    doc.setFont('helvetica', 'normal')
    y += 6

    const col1 = 14
    const col2 = 110
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)

    if (cliente.razaoSocial) { doc.text(`Razão Social: ${cliente.razaoSocial}`, col1, y); }
    if (cliente.nomeFantasia) { doc.text(`Nome Fantasia: ${cliente.nomeFantasia}`, col2, y); }
    if (cliente.razaoSocial || cliente.nomeFantasia) y += 5

    if (cliente.cnpj) { doc.text(`CNPJ: ${cliente.cnpj}`, col1, y); }
    if (cliente.cidade) { doc.text(`Cidade: ${cliente.cidade}`, col2, y); }
    if (cliente.cnpj || cliente.cidade) y += 5

    if (cliente.telefone) { doc.text(`Telefone: ${cliente.telefone}`, col1, y); }
    if (cliente.condicao) { doc.text(`Cond. Pagamento: ${cliente.condicao}`, col2, y); }
    if (cliente.telefone || cliente.condicao) y += 5

    y += 2

    // Tabela de produtos
    const linhas = itens.map((item, idx) => {
      const { preco, faixa } = calcularPreco(item.produto, item.quantidade)
      const subtotal = preco * item.quantidade
      return [
        idx + 1,
        item.produto.cod,
        item.produto.descricao,
        item.produto.unidade,
        item.quantidade,
        LABEL_FAIXA[faixa],
        fmt(preco),
        fmt(subtotal),
      ]
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
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 18 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 26, halign: 'right' },
        7: { cellWidth: 28, halign: 'right' },
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 14, right: 14 },
    })

    const nomeArq = cliente.nomeFantasia || cliente.razaoSocial
      ? `orcamento-${(cliente.nomeFantasia || cliente.razaoSocial).replace(/\s+/g, '-').toLowerCase()}-${dataHoje.replace(/\//g, '-')}.pdf`
      : `orcamento-${new Date().toISOString().slice(0, 10)}.pdf`

    doc.save(nomeArq)
  }

  if (itens.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <span className="text-6xl">🛒</span>
        <p className="text-xl font-medium text-gray-600">Nenhum produto no orçamento</p>
        <Link href="/" className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          ← Voltar ao catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
            ← Catálogo
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Orçamento</h1>
          <span className="text-sm text-gray-400">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</span>
          <div className="ml-auto flex gap-2">
            <button onClick={limpar} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Limpar tudo
            </button>
            <button onClick={exportarPDF} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
              ↓ Exportar PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">

        {/* Dados do cliente */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Dados do Cliente</h2>
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
        <div className="hidden md:grid grid-cols-[48px_64px_1fr_80px_130px_100px_110px_40px] gap-3 px-4 py-2 bg-gray-100 rounded-lg text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <span></span>
          <span>Código</span>
          <span>Descrição</span>
          <span className="text-center">Unid.</span>
          <span className="text-center">Quantidade</span>
          <span className="text-center">Faixa / Preço</span>
          <span className="text-right">Subtotal</span>
          <span></span>
        </div>

        {itens.map(item => {
          const { preco, faixa } = calcularPreco(item.produto, item.quantidade)
          const subtotal = preco * item.quantidade

          return (
            <div key={item.produto.cod} className="bg-white rounded-xl border border-gray-100 px-4 py-3 grid grid-cols-1 md:grid-cols-[48px_64px_1fr_80px_130px_100px_110px_40px] gap-3 items-center hover:shadow-sm transition-shadow">
              <div className="relative w-12 h-12 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                {item.produto.imagem ? (
                  <Image src={item.produto.imagem} alt={item.produto.descricao} fill className="object-contain p-1" sizes="48px" />
                ) : (
                  <span className="text-xl text-gray-200">📦</span>
                )}
              </div>
              <span className="text-xs font-mono text-gray-400">{item.produto.cod}</span>
              <p className="text-sm font-medium text-gray-800 leading-snug">{item.produto.descricao}</p>
              <span className="text-xs text-gray-500 text-center">{item.produto.unidade}</span>
              <div className="flex items-center justify-center gap-1">
                <button onClick={() => atualizarQtd(item.produto.cod, item.quantidade - 1)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-bold text-sm">−</button>
                <input
                  type="number"
                  min={1}
                  value={item.quantidade}
                  onChange={e => atualizarQtd(item.produto.cod, parseInt(e.target.value) || 1)}
                  className="w-16 text-center border border-gray-200 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button onClick={() => atualizarQtd(item.produto.cod, item.quantidade + 1)} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-bold text-sm">+</button>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${BADGE_FAIXA[faixa]}`}>{LABEL_FAIXA[faixa]}</span>
                <span className="text-sm font-bold text-gray-700">{fmt(preco)}</span>
              </div>
              <p className="text-sm font-bold text-gray-900 text-right">{fmt(subtotal)}</p>
              <button onClick={() => remover(item.produto.cod)} className="w-8 h-8 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center text-lg" title="Remover">✕</button>
            </div>
          )
        })}

        {/* Rodapé com total */}
        <div className="bg-white rounded-xl border border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{itens.length} {itens.length === 1 ? 'produto' : 'produtos'} · {itens.reduce((a, i) => a + i.quantidade, 0)} unidades no total</p>
            {cliente.condicao && <p className="text-xs text-gray-400 mt-0.5">Cond. pagamento: <span className="font-medium text-gray-600">{cliente.condicao}</span></p>}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Total</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(total)}</p>
          </div>
        </div>
      </main>
    </div>
  )
}
