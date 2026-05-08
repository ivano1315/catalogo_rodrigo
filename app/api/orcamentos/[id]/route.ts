import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Orcamento from '@/models/Orcamento'

// PUT /api/orcamentos/[id] — atualiza orçamento completo (edição)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const body = await req.json()
    const doc = await Orcamento.findByIdAndUpdate(
      params.id,
      { $set: { cliente: body.cliente, itens: body.itens, totalGeral: body.totalGeral, observacao: body.observacao, status: body.status ?? 'rascunho' } },
      { new: true }
    ).lean()
    if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ ok: true, doc })
  } catch (err) {
    console.error('[ORCAMENTOS] PUT erro:', err)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

// PATCH /api/orcamentos/[id] — atualiza status
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    const { status } = await req.json()
    const doc = await Orcamento.findByIdAndUpdate(
      params.id,
      { status },
      { new: true }
    ).lean()
    if (!doc) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ ok: true, doc })
  } catch (err) {
    console.error('[ORCAMENTOS] PATCH erro:', err)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

// DELETE /api/orcamentos/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB()
    await Orcamento.findByIdAndDelete(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[ORCAMENTOS] DELETE erro:', err)
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 })
  }
}
