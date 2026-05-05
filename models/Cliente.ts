import mongoose, { Schema, Document } from 'mongoose'

export interface ICliente extends Document {
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  cidade: string
  estado: string
  telefone: string
  email: string
  condicaoPagamento: string
  observacoes: string
  createdAt: Date
  updatedAt: Date
}

const ClienteSchema = new Schema<ICliente>(
  {
    razaoSocial:       { type: String, required: true, trim: true },
    nomeFantasia:      { type: String, default: '', trim: true },
    cnpj:              { type: String, default: '', trim: true },
    cidade:            { type: String, default: '', trim: true },
    estado:            { type: String, default: '', trim: true },
    telefone:          { type: String, default: '', trim: true },
    email:             { type: String, default: '', trim: true },
    condicaoPagamento: { type: String, default: '', trim: true },
    observacoes:       { type: String, default: '', trim: true },
  },
  { timestamps: true }
)

ClienteSchema.index({ razaoSocial: 'text', nomeFantasia: 'text', cnpj: 1 })

export default mongoose.models.Cliente || mongoose.model<ICliente>('Cliente', ClienteSchema)
