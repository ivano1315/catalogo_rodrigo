import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Cliente from '@/models/Cliente'

// PUT /api/clientes/[id]  — atualiza cliente
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB()
  const body = await req.json()

  const cliente = await Cliente.findByIdAndUpdate(params.id, body, { new: true })
  if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  return NextResponse.json(cliente)
}

// DELETE /api/clientes/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await connectDB()
  const cliente = await Cliente.findByIdAndDelete(params.id)
  if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true })
}
