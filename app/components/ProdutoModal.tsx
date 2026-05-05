'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
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

interface Props {
  produto: Produto
  onClose: () => void
}

function fmt(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function gerarTexto(produto: Produto): string {
  const linhas = [
    `*WAVES PLUS — Catálogo de Produtos*`,
    ``,
    `📦 *${produto.descricao}*`,
    `Código: #${produto.cod} | Unidade: ${produto.unidade}`,
    ``,
    `💰 *Tabela de Preços:*`,
    `🔵 Master — a partir de ${produto.cxMaster} un: *${fmt(produto.master)}/un*`,
    `🟢 Inner — a partir de ${produto.cxInner} un: *${fmt(produto.inner)}/un*`,
    `🟠 Unitário — mín. ${produto.pacUnid} un: *${fmt(produto.unitario)}/un*`,
    ``,
    `Para mais informações entre em contato! 😊`,
  ]
  return linhas.join('\n')
}

export default function ProdutoModal({ produto, onClose }: Props) {
  const { adicionar, remover, itens } = useOrcamento()
  const noOrcamento = itens.some(i => i.produto.cod === produto.cod)
  const [compartilhando, setCompartilhando] = useState(false)

  // Fechar com ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Travar scroll do body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function compartilharWhatsApp() {
    const texto = gerarTexto(produto)

    // Tenta Web Share API com imagem (funciona no mobile e alguns desktops)
    if (produto.imagem && typeof navigator !== 'undefined' && navigator.share) {
      try {
        setCompartilhando(true)
        const resp = await fetch(produto.imagem)
        const blob = await resp.blob()
        const ext = blob.type.includes('png') ? 'png' : 'jpg'
        const file = new File([blob], `produto-${produto.cod}.${ext}`, { type: blob.type })

        const podeFoto = navigator.canShare && navigator.canShare({ files: [file] })

        if (podeFoto) {
          await navigator.share({ files: [file], text: texto })
          setCompartilhando(false)
          return
        }

        // Suporta share mas não arquivos — compartilha só texto
        await navigator.share({ text: texto })
        setCompartilhando(false)
        return
      } catch (err: unknown) {
        // Usuário cancelou ou erro de permissão — não é erro real
        if (err instanceof Error && err.name !== 'AbortError') {
          console.warn('Web Share falhou, usando fallback wa.me', err)
        }
        setCompartilhando(false)
      }
    }

    // Fallback: abre wa.me com texto (+ URL da imagem se disponível)
    const linhasExtra = produto.imagem
      ? [texto, ``, `🖼️ Imagem: ${window.location.origin}${produto.imagem}`]
      : [texto]
    const url = `https://wa.me/?text=${encodeURIComponent(linhasExtra.join('\n'))}`
    window.open(url, '_blank')
  }

  const faixas = [
    { label: 'Master',   qty: produto.cxMaster, preco: produto.master,   bg: 'bg-blue-50',    border: 'border-blue-100',    title: 'text-blue-500',    val: 'text-blue-700',    qty_c: 'text-blue-400'    },
    { label: 'Inner',    qty: produto.cxInner,  preco: produto.inner,    bg: 'bg-emerald-50', border: 'border-emerald-100', title: 'text-emerald-500', val: 'text-emerald-700', qty_c: 'text-emerald-400' },
    { label: 'Unitário', qty: produto.pacUnid,  preco: produto.unitario, bg: 'bg-orange-50',  border: 'border-orange-100',  title: 'text-orange-500',  val: 'text-orange-700',  qty_c: 'text-orange-400'  },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">#{produto.cod}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-lg"
          >✕</button>
        </div>

        {/* Foto grande */}
        <div className="relative w-full h-72 bg-gray-50 flex items-center justify-center">
          {produto.imagem ? (
            <Image
              src={produto.imagem}
              alt={produto.descricao}
              fill
              className="object-contain p-6"
              sizes="672px"
            />
          ) : (
            <span className="text-8xl text-gray-200">📦</span>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-5 space-y-5">
          {/* Descrição e unidade */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-snug">{produto.descricao}</h2>
            <p className="text-sm text-gray-400 mt-1">Unidade de venda: <span className="font-medium text-gray-600">{produto.unidade}</span></p>
          </div>

          {/* Tabela de preços */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tabela de Preços</p>
            <div className="grid grid-cols-3 gap-3">
              {faixas.map(f => (
                <div key={f.label} className={`${f.bg} border ${f.border} rounded-xl p-3 text-center`}>
                  <p className={`text-xs font-bold uppercase tracking-wide ${f.title}`}>{f.label}</p>
                  <p className={`text-xs mt-1 ${f.qty_c}`}>
                    {f.label === 'Unitário' ? `Mín. ${f.qty} un` : `A partir de ${f.qty} un`}
                  </p>
                  <p className={`text-xl font-bold mt-2 ${f.val}`}>{fmt(f.preco)}</p>
                  <p className={`text-xs ${f.qty_c}`}>por unidade</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            {/* WhatsApp */}
            <button
              onClick={compartilharWhatsApp}
              disabled={compartilhando}
              className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-70 text-white rounded-xl py-3 font-medium text-sm transition-colors"
            >
              {compartilhando ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              )}
              {compartilhando ? 'Preparando...' : 'Enviar por WhatsApp'}
            </button>

            {/* Orçamento */}
            <button
              onClick={() => noOrcamento ? remover(produto.cod) : adicionar(produto)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 font-medium text-sm transition-colors ${
                noOrcamento
                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {noOrcamento ? '✕ Remover do orçamento' : '+ Adicionar ao orçamento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
