import mongoose, { Schema, Document } from 'mongoose'

export interface IProduto extends Document {
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

const ProdutoSchema = new Schema<IProduto>({
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

ProdutoSchema.index({ descricao: 'text' })

export default mongoose.models.Produto || mongoose.model<IProduto>('Produto', ProdutoSchema)
