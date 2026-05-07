'use client'

import { useState, useRef, useCallback } from 'react'

interface ItemPreview {
  cod: number
  descricao: string
  estoqueAtual: number
  estoqueNovo: number
  cadastrado: boolean
}

interface Resumo {
  total: number
  cadastrados: number
  naoEncontrados: number
  preview: ItemPreview[]
}

type Etapa = 'upload' | 'preview' | 'aplicando' | 'concluido'

function fmt(n: number) {
  return n.toLocaleString('pt-BR')
}

function BadgeDiff({ atual, novo }: { atual: number; novo: number }) {
  const diff = novo - atual
  if (diff === 0) return <span className="text-xs text-gray-400">sem alteração</span>
  const cor = diff > 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${cor}`}>
      {diff > 0 ? '+' : ''}{fmt(diff)}
    </span>
  )
}

export default function EstoquePage() {
  const [etapa, setEtapa] = useState<Etapa>('upload')
  const [arrastando, setArrastando] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [resultado, setResultado] = useState<{ atualizados: number; naoEncontrados: number } | null>(null)
  const [busca, setBusca] = useState('')
  const [soAlterados, setSoAlterados] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processarArquivo = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErro('Somente arquivos PDF são aceitos')
      return
    }
    setCarregando(true)
    setErro('')
    try {
      const fd = new FormData()
      fd.append('arquivo', file)
      const res = await fetch('/api/estoque', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) { setErro(json.error || 'Erro ao processar'); return }
      setResumo(json)
      setEtapa('preview')
    } catch {
      setErro('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setArrastando(false)
    const file = e.dataTransfer.files[0]
    if (file) processarArquivo(file)
  }, [processarArquivo])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processarArquivo(file)
  }

  const aplicar = async () => {
    if (!resumo) return
    setEtapa('aplicando')
    try {
      const itens = resumo.preview
        .filter(p => p.cadastrado)
        .map(p => ({ cod: p.cod, estoque: p.estoqueNovo }))

      const res = await fetch('/api/estoque', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens }),
      })
      const json = await res.json()
      if (!res.ok) { setErro(json.error); setEtapa('preview'); return }
      setResultado(json)
      setEtapa('concluido')
    } catch {
      setErro('Erro ao aplicar')
      setEtapa('preview')
    }
  }

  const reiniciar = () => {
    setEtapa('upload')
    setResumo(null)
    setResultado(null)
    setErro('')
    setBusca('')
    setSoAlterados(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  // Filtragem do preview
  const itensFiltrados = resumo?.preview.filter(p => {
    if (soAlterados && p.estoqueNovo === p.estoqueAtual) return false
    if (busca) {
      const q = busca.toLowerCase()
      return String(p.cod).includes(q) || p.descricao.toLowerCase().includes(q)
    }
    return true
  }) ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-900">Importar Estoque</h1>
          {etapa !== 'upload' && (
            <button onClick={reiniciar} className="ml-auto text-sm text-gray-400 hover:text-gray-600 transition-colors">
              ← Novo arquivo
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ── ETAPA 1: UPLOAD ── */}
        {etapa === 'upload' && (
          <div className="space-y-4">
            {/* Dropzone */}
            <div
              onDragOver={e => { e.preventDefault(); setArrastando(true) }}
              onDragLeave={() => setArrastando(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                arrastando
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
              }`}
            >
              <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={onFileChange} />
              {carregando ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">Processando PDF...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-3xl">📄</div>
                  <div>
                    <p className="text-base font-semibold text-gray-700">
                      {arrastando ? 'Solte o arquivo aqui' : 'Arraste o PDF ou clique para selecionar'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">Arquivo de tabela de preços com coluna de estoque</p>
                  </div>
                </div>
              )}
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                ⚠️ {erro}
              </div>
            )}

            {/* Instruções */}
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Como funciona</p>
              <ol className="space-y-2 text-sm text-gray-500">
                <li className="flex gap-2"><span className="shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center font-bold">1</span>Faça upload do PDF de tabela de preços com estoque</li>
                <li className="flex gap-2"><span className="shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center font-bold">2</span>Revise os valores que serão importados</li>
                <li className="flex gap-2"><span className="shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center font-bold">3</span>Confirme para atualizar o banco de dados</li>
              </ol>
            </div>
          </div>
        )}

        {/* ── ETAPA 2: PREVIEW ── */}
        {(etapa === 'preview' || etapa === 'aplicando') && resumo && (
          <div className="space-y-4">
            {/* Cards de resumo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{fmt(resumo.total)}</p>
                <p className="text-xs text-gray-400 mt-1">Produtos no PDF</p>
              </div>
              <div className="bg-white rounded-xl border border-emerald-100 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{fmt(resumo.cadastrados)}</p>
                <p className="text-xs text-gray-400 mt-1">Serão atualizados</p>
              </div>
              <div className="bg-white rounded-xl border border-orange-100 p-4 text-center">
                <p className="text-2xl font-bold text-orange-500">{fmt(resumo.naoEncontrados)}</p>
                <p className="text-xs text-gray-400 mt-1">Não cadastrados</p>
              </div>
            </div>

            {/* Barra de ferramentas */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Filtrar por código ou descrição..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-4 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {busca && (
                  <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">✕</button>
                )}
              </div>
              <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors shrink-0">
                <input
                  type="checkbox"
                  checked={soAlterados}
                  onChange={e => setSoAlterados(e.target.checked)}
                  className="accent-blue-600"
                />
                <span className="text-gray-600">Só com alteração</span>
              </label>
            </div>

            <p className="text-xs text-gray-400">
              Exibindo {fmt(itensFiltrados.length)} de {fmt(resumo.preview.length)} itens
            </p>

            {/* Tabela */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Cabeçalho — desktop */}
              <div className="hidden sm:grid grid-cols-[80px_1fr_110px_110px_100px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <span>Código</span>
                <span>Descrição</span>
                <span className="text-right">Estoque Atual</span>
                <span className="text-right">Estoque Novo</span>
                <span className="text-center">Diferença</span>
              </div>

              <div className="divide-y divide-gray-50 max-h-[50vh] overflow-y-auto">
                {itensFiltrados.length === 0 ? (
                  <div className="py-10 text-center text-gray-400 text-sm">Nenhum item encontrado</div>
                ) : (
                  itensFiltrados.map(p => (
                    <div
                      key={p.cod}
                      className={`px-4 py-3 ${!p.cadastrado ? 'bg-orange-50/50' : ''}`}
                    >
                      {/* Mobile */}
                      <div className="sm:hidden">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-mono text-gray-400">#{p.cod}</span>
                            {!p.cadastrado && <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">Não cadastrado</span>}
                            <p className="text-sm font-medium text-gray-800 mt-0.5">{p.descricao}</p>
                          </div>
                          <BadgeDiff atual={p.estoqueAtual} novo={p.estoqueNovo} />
                        </div>
                        <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
                          <span>Atual: <strong>{fmt(p.estoqueAtual)}</strong></span>
                          <span>Novo: <strong className="text-gray-800">{fmt(p.estoqueNovo)}</strong></span>
                        </div>
                      </div>
                      {/* Desktop */}
                      <div className="hidden sm:grid grid-cols-[80px_1fr_110px_110px_100px] gap-3 items-center">
                        <span className="text-xs font-mono text-gray-400">
                          #{p.cod}
                          {!p.cadastrado && <span className="block text-orange-500 font-sans font-semibold">⚠ N/C</span>}
                        </span>
                        <span className="text-sm text-gray-700 truncate">{p.descricao}</span>
                        <span className="text-sm text-gray-500 text-right">{fmt(p.estoqueAtual)}</span>
                        <span className="text-sm font-semibold text-gray-800 text-right">{fmt(p.estoqueNovo)}</span>
                        <div className="flex justify-center">
                          <BadgeDiff atual={p.estoqueAtual} novo={p.estoqueNovo} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">⚠️ {erro}</div>
            )}

            {/* Botão confirmar */}
            <div className="flex gap-3">
              <button onClick={reiniciar} className="flex-1 sm:flex-none px-5 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={aplicar}
                disabled={etapa === 'aplicando'}
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {etapa === 'aplicando' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  `✓ Confirmar importação de ${fmt(resumo.cadastrados)} produtos`
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── ETAPA 3: CONCLUÍDO ── */}
        {etapa === 'concluido' && resultado && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-3xl mx-auto">✅</div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Estoque atualizado!</h2>
              <p className="text-gray-500 mt-1 text-sm">
                <strong className="text-emerald-600">{fmt(resultado.atualizados)}</strong> produtos atualizados com sucesso
                {resultado.naoEncontrados > 0 && (
                  <span className="text-orange-500"> · {fmt(resultado.naoEncontrados)} não encontrados</span>
                )}
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button onClick={reiniciar} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Importar outro arquivo
              </button>
              <a href="/" className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
                Ver catálogo
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
