import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Orcamento from '@/models/Orcamento'

// GET /api/orcamentos — lista com filtros opcionais
export async function GET(req: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''
    const busca  = searchParams.get('busca')  || ''

    const filtro: Record<string, unknown> = {}
    if (status) filtro.status = status
    if (busca)  filtro['cliente.razaoSocial'] = { $regex: busca, $options: 'i' }

    const orcamentos = await Orcamento.find(filtro)
      .sort({ criadoEm: -1 })
      .limit(200)
      .lean()

    return NextResponse.json({ orcamentos })
  } catch (err) {
    console.error('[ORCAMENTOS] GET erro:', err)
    return NextResponse.json({ error: 'Erro ao buscar orçamentos' }, { status: 500 })
  }
}

// POST /api/orcamentos — salva novo orçamento
export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const body = await req.json()

    // Número sequencial simples (conta os existentes + 1)
    const total = await Orcamento.countDocuments()
    const numero = total + 1

    const orcamento = await Orcamento.create({ ...body, numero })
    return NextResponse.json({ ok: true, numero, _id: orcamento._id }, { status: 201 })
  } catch (err) {
    console.error('[ORCAMENTOS] POST erro:', err)
    return NextResponse.json({ error: 'Erro ao salvar orçamento' }, { status: 500 })
  }
}
