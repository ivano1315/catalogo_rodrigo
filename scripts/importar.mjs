import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { MongoClient } from 'mongodb'

const __dirname = dirname(fileURLToPath(import.meta.url))

const MONGODB_URI = 'mongodb+srv://Vercel-Admin-vc-products:uyvTVjNRzfaIpHMI@vc-products.vlqmoec.mongodb.net/catalogo?retryWrites=true&w=majority'

const dados = JSON.parse(readFileSync(resolve(__dirname, '../lib/dados.json'), 'utf-8'))

async function importar() {
  console.log(`\n🔗 Conectando ao MongoDB Atlas...`)
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    console.log('✅ Conectado!\n')

    const db = client.db('catalogo')
    const col = db.collection('produtos')

    // Limpa antes de importar para evitar duplicatas
    const existentes = await col.countDocuments()
    if (existentes > 0) {
      console.log(`⚠️  ${existentes} produtos já existem — limpando coleção...`)
      await col.deleteMany({})
    }

    console.log(`📦 Importando ${dados.length} produtos...`)
    const resultado = await col.insertMany(dados)
    console.log(`✅ ${resultado.insertedCount} produtos inseridos!\n`)

    // Índices para busca rápida
    await col.createIndex({ cod: 1 }, { unique: true })
    await col.createIndex({ descricao: 'text' })
    console.log('🔍 Índices criados (cod único + busca textual)')

    // Amostra
    const amostra = await col.find({}).limit(3).toArray()
    console.log('\n📋 Primeiros 3 produtos no banco:')
    amostra.forEach(p => console.log(`  #${p.cod} — ${p.descricao} | Master: R$${p.master}`))

  } catch (err) {
    console.error('\n❌ Erro:', err.message)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\n🔌 Desconectado. Importação concluída!')
  }
}

importar()
