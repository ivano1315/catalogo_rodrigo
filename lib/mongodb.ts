import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('Defina MONGODB_URI no arquivo .env.local')
}

declare global {
  var mongoose: { conn: typeof import('mongoose') | null; promise: Promise<typeof import('mongoose')> | null }
}

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then(async (m) => {
      // Remove o índice único de 'numero' caso ainda exista de versões anteriores.
      // O _id (ObjectId) é a referência interna; 'numero' é apenas display.
      try {
        await m.connection.collection('orcamentos').dropIndex('numero_1')
        console.log('[DB] Índice único de numero removido com sucesso')
      } catch {
        // índice já não existe — normal em ambientes novos
      }
      return m
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
