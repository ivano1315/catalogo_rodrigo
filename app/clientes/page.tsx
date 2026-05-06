'use client'

import { useState, useEffect, useCallback } from 'react'

interface Cliente {
  _id?: string
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  cidade: string
  estado: string
  telefone: string
  email: string
  condicaoPagamento: string
  observacoes: string
}

const CONDICOES = [
  'ANTECIPADO', '30/60/90', '30/45/60/75/90',
  '30/45/60/75/90/105', '30/45/60/75/90/105/120',
]

const VAZIO: Cliente = {
  razaoSocial: '', nomeFantasia: '', cnpj: '', cidade: '',
  estado: '', telefone: '', email: '', condicaoPagamento: '', observacoes: '',
}

const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-full'

function formatCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

export default function ClientesPage() {
  const [busca, setBusca] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [carregando, setCarregando] = useState(true)

  // Formulário
  const [form, setForm] = useState<Cliente>(VAZIO)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  // Busca CNPJ
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false)
  const [msgCNPJ, setMsgCNPJ] = useState('')

  // Confirmação de exclusão
  const [deletandoId, setDeletandoId] = useState<string | null>(null)

  const buscarClientes = useCallback(async () => {
    setCarregando(true)
    const res = await fetch(`/api/clientes?busca=${encodeURIComponent(busca)}&pagina=1`)
    const json = await res.json()
    setClientes(json.clientes || [])
    setTotal(json.total || 0)
    setCarregando(false)
  }, [busca])

  useEffect(() => {
    const t = setTimeout(buscarClientes, 300)
    return () => clearTimeout(t)
  }, [buscarClientes])

  function set(campo: keyof Cliente, valor: string) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  function abrirNovo() {
    setForm(VAZIO)
    setEditandoId(null)
    setErroForm('')
    setMsgCNPJ('')
    setShowForm(true)
  }

  function abrirEditar(c: Cliente) {
    setForm(c)
    setEditandoId(c._id!)
    setErroForm('')
    setMsgCNPJ('')
    setShowForm(true)
  }

  function fecharForm() {
    setShowForm(false)
    setEditandoId(null)
    setForm(VAZIO)
    setMsgCNPJ('')
    setErroForm('')
  }

  async function consultarCNPJ() {
    const cnpjLimpo = form.cnpj.replace(/\D/g, '')
    if (cnpjLimpo.length !== 14) {
      setMsgCNPJ('⚠️ Digite os 14 dígitos do CNPJ antes de consultar')
      return
    }
    setBuscandoCNPJ(true)
    setMsgCNPJ('Consultando Receita Federal...')
    try {
      const res = await fetch(`/api/clientes/cnpj/${cnpjLimpo}`)
      const json = await res.json()
      if (!res.ok) {
        setMsgCNPJ(`❌ ${json.error}`)
      } else {
        const c = json.cliente
        setForm(prev => ({
          ...prev,
          razaoSocial:  c.razaoSocial  || prev.razaoSocial,
          nomeFantasia: c.nomeFantasia || prev.nomeFantasia,
          cidade:       c.cidade       || prev.cidade,
          estado:       c.estado       || prev.estado,
          telefone:     c.telefone     || prev.telefone,
          email:        c.email        || prev.email,
          condicaoPagamento: c.condicaoPagamento || prev.condicaoPagamento,
        }))
        if (json.fonte === 'banco') {
          setMsgCNPJ('✅ Cliente já cadastrado — dados carregados')
          setEditandoId(c._id)
        } else {
          setMsgCNPJ('✅ Dados da Receita Federal carregados')
        }
      }
    } catch {
      setMsgCNPJ('❌ Erro ao consultar. Verifique sua conexão.')
    } finally {
      setBuscandoCNPJ(false)
    }
  }

  async function salvar() {
    if (!form.razaoSocial.trim()) {
      setErroForm('Razão Social é obrigatória')
      return
    }
    setSalvando(true)
    setErroForm('')
    try {
      const url    = editandoId ? `/api/clientes/${editandoId}` : '/api/clientes'
      const method = editandoId ? 'PUT' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const json = await res.json()
        setErroForm(json.error || 'Erro ao salvar')
        return
      }
      fecharForm()
      buscarClientes()
    } catch {
      setErroForm('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  async function deletar(id: string) {
    const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDeletandoId(null)
      buscarClientes()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 space-y-2">
          {/* Linha 1: título + botão */}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">Clientes</h1>
            <span className="text-sm text-gray-400">{total > 0 ? `${total} cadastrado${total !== 1 ? 's' : ''}` : ''}</span>
            <button
              onClick={abrirNovo}
              className="ml-auto bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              + Novo
            </button>
          </div>
          {/* Linha 2: busca full-width */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nome, fantasia ou CNPJ..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-4 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >✕</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {carregando ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : clientes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🏢</p>
            <p className="text-lg text-gray-500 mb-2">{busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}</p>
            {!busca && (
              <button onClick={abrirNovo} className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                + Cadastrar primeiro cliente
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {clientes.map(c => (
              <div key={c._id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 font-bold text-sm shrink-0 mt-0.5">
                    {c.razaoSocial.charAt(0).toUpperCase()}
                  </div>

                  {/* Info + ações */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800 leading-snug truncate">{c.razaoSocial}</p>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => abrirEditar(c)}
                          className="w-7 h-7 rounded-lg text-gray-300 hover:bg-blue-50 hover:text-blue-500 transition-colors flex items-center justify-center text-sm"
                          title="Editar"
                        >✏️</button>
                        <button
                          onClick={() => setDeletandoId(c._id!)}
                          className="w-7 h-7 rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center text-sm"
                          title="Excluir"
                        >🗑️</button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      {c.nomeFantasia    && <span className="text-xs text-gray-500">{c.nomeFantasia}</span>}
                      {c.cnpj            && <span className="text-xs text-gray-400 font-mono">{formatCNPJ(c.cnpj)}</span>}
                      {c.cidade          && <span className="text-xs text-gray-400">{c.cidade}{c.estado ? ` — ${c.estado}` : ''}</span>}
                      {c.telefone        && <span className="text-xs text-gray-400">{c.telefone}</span>}
                      {c.condicaoPagamento && (
                        <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                          {c.condicaoPagamento}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Formulário */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={fecharForm}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-800">{editandoId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={fecharForm} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {/* CNPJ com busca */}
              <Campo label="CNPJ">
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    value={formatCNPJ(form.cnpj)}
                    onChange={e => set('cnpj', e.target.value.replace(/\D/g, ''))}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                  />
                  <button
                    onClick={consultarCNPJ}
                    disabled={buscandoCNPJ}
                    className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap"
                  >
                    {buscandoCNPJ ? '...' : '🔍 Consultar'}
                  </button>
                </div>
                {msgCNPJ && (
                  <p className={`text-xs mt-1 ${msgCNPJ.startsWith('✅') ? 'text-emerald-600' : msgCNPJ.startsWith('❌') ? 'text-red-500' : 'text-gray-400'}`}>
                    {msgCNPJ}
                  </p>
                )}
              </Campo>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo label="Razão Social *">
                  <input className={inputCls} value={form.razaoSocial} onChange={e => set('razaoSocial', e.target.value)} placeholder="Empresa Ltda." />
                </Campo>
                <Campo label="Nome Fantasia">
                  <input className={inputCls} value={form.nomeFantasia} onChange={e => set('nomeFantasia', e.target.value)} placeholder="Nome Fantasia" />
                </Campo>
                <Campo label="Cidade">
                  <input className={inputCls} value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Fortaleza" />
                </Campo>
                <Campo label="Estado">
                  <input className={inputCls} value={form.estado} onChange={e => set('estado', e.target.value.toUpperCase().slice(0,2))} placeholder="CE" maxLength={2} />
                </Campo>
                <Campo label="Telefone">
                  <input className={inputCls} value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(85) 99999-9999" />
                </Campo>
                <Campo label="E-mail">
                  <input className={inputCls} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contato@empresa.com.br" />
                </Campo>
                <Campo label="Condição de Pagamento">
                  <select className={inputCls} value={form.condicaoPagamento} onChange={e => set('condicaoPagamento', e.target.value)}>
                    <option value="">Selecione...</option>
                    {CONDICOES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Campo>
              </div>

              <Campo label="Observações">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={2}
                  value={form.observacoes}
                  onChange={e => set('observacoes', e.target.value)}
                  placeholder="Informações adicionais sobre o cliente..."
                />
              </Campo>

              {erroForm && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">⚠️ {erroForm}</p>}

              <div className="flex gap-3 pt-1">
                <button onClick={fecharForm} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={salvar}
                  disabled={salvando}
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {salvando ? 'Salvando...' : editandoId ? '✓ Atualizar' : '+ Cadastrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmação de exclusão */}
      {deletandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <p className="text-3xl mb-3">🗑️</p>
            <h3 className="text-base font-bold text-gray-800 mb-1">Excluir cliente?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletandoId(null)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={() => deletar(deletandoId)} className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
