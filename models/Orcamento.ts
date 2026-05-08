import mongoose, { Schema, Document } from 'mongoose'

export interface IItemSalvo {
  cod: number
  descricao: string
  unidade: string
  quantidade: number
  faixa: 'master' | 'inner' | 'unitario' | 'promocao'
  preco: number
  precoCustom: number | null
  subtotal: number
  // tiers preservados para reabrir no editor sem rebuscar na API
  cxMaster: number
  master: number
  cxInner: number
  inner: number
  pacUnid: number
  unitario: number
  // ruptura
  estoqueDisponivel: number | null   // estoque no momento do pedido
  ruptura: number                    // quantidade sem cobertura (pedido - estoque, mín 0)
  valorRuptura: number               // ruptura * preço unitário
}

export interface IClienteSnapshot {
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  cidade: string
  telefone: string
  condicao: string
}

export interface IOrcamento extends Document {
  numero: number
  criadoEm: Date
  cliente: IClienteSnapshot
  itens: IItemSalvo[]
  totalGeral: number
  totalRuptura: number
  valorTotalRuptura: number
  observacao: { tipo: string; texto: string }
  status: 'rascunho' | 'enviado' | 'aprovado' | 'cancelado'
}

const ItemSchema = new Schema<IItemSalvo>({
  cod:        { type: Number, required: true },
  descricao:  { type: String, required: true },
  unidade:    { type: String, default: '' },
  quantidade: { type: Number, required: true },
  faixa:      { type: String, enum: ['master','inner','unitario','promocao'], required: true },
  preco:      { type: Number, required: true },
  precoCustom:{ type: Number, default: null },
  subtotal:   { type: Number, required: true },
  cxMaster:          { type: Number, default: 0 },
  master:            { type: Number, default: 0 },
  cxInner:           { type: Number, default: 0 },
  inner:             { type: Number, default: 0 },
  pacUnid:           { type: Number, default: 0 },
  unitario:          { type: Number, default: 0 },
  estoqueDisponivel: { type: Number, default: null },
  ruptura:           { type: Number, default: 0 },
  valorRuptura:      { type: Number, default: 0 },
}, { _id: false })

const ClienteSchema = new Schema<IClienteSnapshot>({
  razaoSocial:  { type: String, default: '' },
  nomeFantasia: { type: String, default: '' },
  cnpj:         { type: String, default: '' },
  cidade:       { type: String, default: '' },
  telefone:     { type: String, default: '' },
  condicao:     { type: String, default: '' },
}, { _id: false })

const OrcamentoSchema = new Schema<IOrcamento>({
  numero:     { type: Number, required: true, unique: true },
  criadoEm:   { type: Date, default: Date.now },
  cliente:    { type: ClienteSchema, required: true },
  itens:      { type: [ItemSchema], required: true },
  totalGeral:       { type: Number, required: true },
  totalRuptura:     { type: Number, default: 0 },   // qtd total de unidades em falta
  valorTotalRuptura:{ type: Number, default: 0 },   // valor total da ruptura
  observacao: {
    tipo:  { type: String, default: '' },
    texto: { type: String, default: '' },
  },
  status:     { type: String, enum: ['rascunho','em_edicao','enviado','aprovado','cancelado'], default: 'rascunho' },
})

export default mongoose.models.Orcamento as mongoose.Model<IOrcamento>
  || mongoose.model<IOrcamento>('Orcamento', OrcamentoSchema)
