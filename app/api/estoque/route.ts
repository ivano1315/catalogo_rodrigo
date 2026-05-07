import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import Produto from '@/models/Produto'

// Parseia o texto extraído do PDF e retorna { cod, estoque }[]
// Formato: cada produto em uma única linha — código (4-5 dígitos) + dados + estoque (último decimal)
// Ex: "10119 ABRA NYLON BC 2,5X100 ... PT 4,6000   0 0 14.774,0000"
function parsearPDF(text: string): { cod: number; estoque: number }[] {
  const resultado: { cod: number; estoque: number }[] = []

  for (const linha of text.split('\n')) {
    const l = linha.trim()
    if (!l) continue

    // Linha deve começar com código de 4-5 dígitos seguido de espaço e outro char
    const m = l.match(/^(\d{4,5})\s+\S/)
    if (!m) continue

    const cod = parseInt(m[1])

    // Último número decimal da linha (formato brasileiro: 14.774,0000) = estoque
    const nums = l.match(/\d[\d.]*,\d+/g)
    if (!nums || nums.length === 0) continue

    const estoqueRaw = nums[nums.length - 1]
      .replace(/\./g, '')
      .replace(',', '.')
    const estoque = parseFloat(estoqueRaw)

    if (!isNaN(estoque)) {
      resultado.push({ cod, estoque })
    }
  }

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

    // pdf-parse v2: PDFParse recebe { data } no construtor, texto via .getText()
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse')
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const resultado = await parser.getText() as { text: string }
    const dados = resultado
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
