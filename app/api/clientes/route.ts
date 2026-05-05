import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Cliente from '@/models/Cliente'

// GET /api/clientes?busca=&pagina=1
export async function GET(req: NextRequest) {
  await connectDB()
  const { searchParams } = new URL(req.url)
  const busca  = searchParams.get('busca') || ''
  const pagina = parseInt(searchParams.get('pagina') || '1')
  const limite = 20

  const filtro = busca
    ? {
        $or: [
          { razaoSocial:  { $regex: busca, $options: 'i' } },
          { nomeFantasia: { $regex: busca, $options: 'i' } },
          { cnpj:         { $regex: busca.replace(/\D/g, ''), $options: 'i' } },
        ],
      }
    : {}

  const total    = await Cliente.countDocuments(filtro)
  const clientes = await Cliente.find(filtro)
    .sort({ razaoSocial: 1 })
    .skip((pagina - 1) * limite)
    .limit(limite)
    .lean()

  return NextResponse.json({ clientes, total, paginas: Math.ceil(total / limite), paginaAtual: pagina })
}

// POST /api/clientes  — cria novo cliente
export async function POST(req: NextRequest) {
  await connectDB()
  const body = await req.json()

  if (!body.razaoSocial?.trim()) {
    return NextResponse.json({ error: 'Razão Social é obrigatória' }, { status: 400 })
  }

  const cliente = await Cliente.create(body)
  return NextResponse.json(cliente, { status: 201 })
}
