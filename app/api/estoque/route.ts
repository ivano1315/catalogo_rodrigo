import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Produto from '@/models/Produto'

// Parseia o texto extraído do PDF e retorna { cod, estoque }[]
function parsearPDF(text: string): { cod: number; estoque: number }[] {
  const linhas = text.split('\n')
  const resultado: { cod: number; estoque: number }[] = []

  let codAtual: number | null = null
  let buffer: string[] = []

  const salvarAtual = () => {
    if (codAtual === null || buffer.length === 0) return
    // Pega todos os números decimais do buffer e usa o último como estoque
    const nums = buffer
      .join('\n')
      .match(/\d[\d.]*,\d+/g)
    if (nums && nums.length > 0) {
      const estoqueRaw = nums[nums.length - 1]
        .replace(/\./g, '')
        .replace(',', '.')
      const estoque = parseFloat(estoqueRaw)
      if (!isNaN(estoque)) {
        resultado.push({ cod: codAtual, estoque })
      }
    }
  }

  for (const linha of linhas) {
    const l = linha.trim()
    if (!l) continue

    const m = l.match(/^(\d{4,5})\s+\S/)
    if (m) {
      salvarAtual()
      codAtual = parseInt(m[1])
      buffer = []
    } else if (codAtual !== null) {
      buffer.push(l)
    }
  }
  salvarAtual()

  return resultado
}

// POST /api/estoque  — recebe PDF, retorna preview dos dados parseados
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const arquivo = formData.get('arquivo') as File | null

    if (!arquivo) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    if (!arquivo.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Somente arquivos PDF são aceitos' }, { status: 400 })
    }

    const buffer = Buffer.from(await arquivo.arrayBuffer())

    // Extrai texto do PDF com pdf-parse
    const pdfParse = (await import('pdf-parse')).default
    const dados = await pdfParse(buffer)
    const itens = parsearPDF(dados.text)

    if (itens.length === 0) {
      return NextResponse.json({ error: 'Nenhum produto encontrado no PDF' }, { status: 422 })
    }

    // Busca descrições no banco para enriquecer o preview
    await connectDB()
    const cods = itens.map(i => i.cod)
    const produtos = await Produto.find({ cod: { $in: cods } }, { cod: 1, descricao: 1, estoque: 1 }).lean()
    const mapaDesc: Record<number, { descricao: string; estoqueAtual: number }> = {}
    for (const p of produtos as { cod: number; descricao: string; estoque: number }[]) {
      mapaDesc[p.cod] = { descricao: p.descricao, estoqueAtual: p.estoque ?? 0 }
    }

    const preview = itens.map(i => ({
      cod:          i.cod,
      descricao:    mapaDesc[i.cod]?.descricao ?? '(não cadastrado)',
      estoqueAtual: mapaDesc[i.cod]?.estoqueAtual ?? 0,
      estoqueNovo:  i.estoque,
      cadastrado:   !!mapaDesc[i.cod],
    }))

    return NextResponse.json({
      total:         itens.length,
      cadastrados:   preview.filter(p => p.cadastrado).length,
      naoEncontrados: preview.filter(p => !p.cadastrado).length,
      preview,
    })
  } catch (err) {
    console.error('[ESTOQUE] Erro ao parsear PDF:', err)
    return NextResponse.json({ error: 'Erro ao processar o arquivo' }, { status: 500 })
  }
}

// PATCH /api/estoque  — aplica os dados ao MongoDB
export async function PATCH(req: NextRequest) {
  try {
    const { itens }: { itens: { cod: number; estoque: number }[] } = await req.json()

    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ error: 'Nenhum item para atualizar' }, { status: 400 })
    }

    await connectDB()

    const agora = new Date()
    const ops = itens.map(i => ({
      updateOne: {
        filter: { cod: i.cod },
        update: { $set: { estoque: i.estoque, estoqueAtualizadoEm: agora } },
      },
    }))

    const result = await Produto.bulkWrite(ops)

    return NextResponse.json({
      ok: true,
      atualizados: result.modifiedCount,
      naoEncontrados: itens.length - result.modifiedCount,
    })
  } catch (err) {
    console.error('[ESTOQUE] Erro ao aplicar:', err)
    return NextResponse.json({ error: 'Erro ao atualizar estoque' }, { status: 500 })
  }
}
