import { readFile } from 'fs/promises'
import { resolve } from 'path'
import XLSX from 'xlsx'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const ProdutoSchema = new mongoose.Schema({
  cod: { type: Number, required: true, unique: true },
  descricao: { type: String, required: true },
  unidade: { type: String, default: 'UN' },
  cxMaster: { type: Number, required: true },
  master: { type: Number, required: true },
  cxInner: { type: Number, required: true },
  inner: { type: Number, required: true },
  pacUnid: { type: Number, required: true },
  unitario: { type: Number, required: true },
})

const Produto = mongoose.models.Produto || mongoose.model('Produto', ProdutoSchema)

async function importar() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI nao definida no .env.local')
    process.exit(1)
  }

  console.log('Conectando ao MongoDB...')
  await mongoose.connect(uri)
  console.log('Conectado!')

  const filePath = resolve('scripts', 'TABELA.xlsx')
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets['Planilha2']
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  // Linha 1 (index 1) tem os headers, dados começam na linha 2 (index 2)
  const dados = rows.slice(2).filter(row => row[0] && row[1])

  const produtos = dados.map(row => ({
    cod: Number(row[0]),
    descricao: String(row[1]).trim(),
    unidade: row[3] ? String(row[3]).trim() : 'UN',
    cxMaster: Number(row[4]) || 0,
    master: Number(row[5]) || 0,
    cxInner: Number(row[6]) || 0,
    inner: Number(row[7]) || 0,
    pacUnid: Number(row[8]) || 1,
    unitario: Number(row[9]) || 0,
  }))

  console.log(`Importando ${produtos.length} produtos...`)

  let inseridos = 0
  let atualizados = 0

  for (const p of produtos) {
    const result = await Produto.findOneAndUpdate(
      { cod: p.cod },
      p,
      { upsert: true, new: true }
    )
    if (result.isNew) inseridos++
    else atualizados++
  }

  console.log(`Concluido! ${inseridos} inseridos, ${atualizados} atualizados.`)
  await mongoose.disconnect()
}

importar().catch(console.error)
