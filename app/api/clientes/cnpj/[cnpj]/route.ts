import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Cliente from '@/models/Cliente'

// GET /api/clientes/cnpj/[cnpj]
// 1. Verifica se já existe no banco
// 2. Se não, consulta BrasilAPI (Receita Federal)
export async function GET(_req: NextRequest, { params }: { params: { cnpj: string } }) {
  const cnpjLimpo = params.cnpj.replace(/\D/g, '')

  if (cnpjLimpo.length !== 14) {
    return NextResponse.json({ error: 'CNPJ deve ter 14 dígitos' }, { status: 400 })
  }

  // Tenta buscar no banco primeiro
  await connectDB()
  const salvo = await Cliente.findOne({
    cnpj: { $regex: cnpjLimpo, $options: 'i' },
  }).lean()

  if (salvo) {
    return NextResponse.json({ fonte: 'banco', cliente: salvo })
  }

  // Consulta Receita Federal via BrasilAPI
  try {
    const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`
    console.log('[CNPJ] Consultando:', url)

    const resp = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; CatalogApp/1.0)',
      },
    })

    console.log('[CNPJ] Status BrasilAPI:', resp.status)

    const data = await resp.json()

    if (!resp.ok) {
      console.error('[CNPJ] Erro BrasilAPI:', JSON.stringify(data))
      const msg = data?.message || data?.erro || `CNPJ não encontrado (status ${resp.status})`
      return NextResponse.json({ error: msg }, { status: 404 })
    }

    // Formata telefone: "4198880068" → "(41) 98880-068" ou "4133334444" → "(41) 3333-4444"
    const fone = (data.ddd_telefone_1 || '').replace(/\D/g, '')
    const telFormatado = fone.length === 11
      ? fone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
      : fone.length === 10
      ? fone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
      : fone

    const cliente = {
      razaoSocial:       data.razao_social  || '',
      nomeFantasia:      data.nome_fantasia || '',
      cnpj:              cnpjLimpo,
      cidade:            data.municipio     || '',
      estado:            data.uf            || '',
      telefone:          telFormatado,
      email:             data.email         || '',
      condicaoPagamento: '',
      observacoes:       '',
    }

    console.log('[CNPJ] Sucesso:', cliente.razaoSocial)
    return NextResponse.json({ fonte: 'receita', cliente })
  } catch (err) {
    console.error('[CNPJ] Exceção:', err)
    return NextResponse.json({ error: 'Erro ao conectar com a Receita Federal' }, { status: 502 })
  }
}
