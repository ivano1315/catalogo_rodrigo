import { NextRequest, NextResponse } from 'next/server'
import imagensMapa from '@/lib/imagens_mapa.json'

const LIMITE = 24
const mapa = imagensMapa as Record<string, string>

function comImagem(produtos: Produto[]) {
  return produtos.map(p => ({ ...p, imagem: mapa[String(p.cod)] || null }))
}

async function getProdutosLocal(busca: string, pagina: number) {
  const dados = await import('@/lib/dados.json')
  const todos = dados.default as Produto[]

  const filtrado = busca
    ? todos.filter(p => p.descricao.toLowerCase().includes(busca.toLowerCase()) || String(p.cod).includes(busca))
    : todos

  const sorted = [...filtrado].sort((a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR'))
  const total = sorted.length
  const produtos = sorted.slice((pagina - 1) * LIMITE, pagina * LIMITE)

  return { produtos: comImagem(produtos), total, paginas: Math.ceil(total / LIMITE), paginaAtual: pagina }
}

async function getProdutosMongo(busca: string, pagina: number) {
  const { connectDB } = await import('@/lib/mongodb')
  const { default: Produto } = await import('@/models/Produto')

  await connectDB()

  const filtro = busca
    ? { descricao: { $regex: busca, $options: 'i' } }
    : {}

  const total = await Produto.countDocuments(filtro)
  const produtos = await Produto.find(filtro)
    .sort({ descricao: 1 })
    .skip((pagina - 1) * LIMITE)
    .limit(LIMITE)
    .lean()

  return { produtos: comImagem(produtos as Produto[]), total, paginas: Math.ceil(total / LIMITE), paginaAtual: pagina }
}

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
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const busca = searchParams.get('busca') || ''
  const pagina = parseInt(searchParams.get('pagina') || '1')

  const useMongo = !!process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('SEU_USUARIO')

  const resultado = useMongo
    ? await getProdutosMongo(busca, pagina)
    : await getProdutosLocal(busca, pagina)

  return NextResponse.json(resultado)
}
