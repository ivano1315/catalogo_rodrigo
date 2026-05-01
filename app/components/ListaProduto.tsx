'use client'

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

function fmt(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ListaProduto({ produto }: { produto: Produto }) {
  return (
    <div className="bg-white border border-gray-100 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 sm:w-16 shrink-0">
        <span className="text-xs font-mono text-gray-400">{produto.cod}</span>
      </div>

      <p className="text-sm font-medium text-gray-800 flex-1 min-w-0">
        {produto.descricao}
        <span className="ml-2 text-xs text-gray-400 font-normal">{produto.unidade}</span>
      </p>

      <div className="flex gap-2 shrink-0">
        <div className="bg-blue-50 rounded-lg px-3 py-1.5 text-center min-w-[90px]">
          <p className="text-xs text-blue-400 leading-none">Master</p>
          <p className="text-xs text-blue-300 leading-none mt-0.5">≥{produto.cxMaster} un</p>
          <p className="text-sm font-bold text-blue-700 mt-1 leading-none">{fmt(produto.master)}</p>
        </div>
        <div className="bg-emerald-50 rounded-lg px-3 py-1.5 text-center min-w-[90px]">
          <p className="text-xs text-emerald-400 leading-none">Inner</p>
          <p className="text-xs text-emerald-300 leading-none mt-0.5">≥{produto.cxInner} un</p>
          <p className="text-sm font-bold text-emerald-700 mt-1 leading-none">{fmt(produto.inner)}</p>
        </div>
        <div className="bg-orange-50 rounded-lg px-3 py-1.5 text-center min-w-[90px]">
          <p className="text-xs text-orange-400 leading-none">Unitário</p>
          <p className="text-xs text-orange-300 leading-none mt-0.5">Mín.{produto.pacUnid} un</p>
          <p className="text-sm font-bold text-orange-700 mt-1 leading-none">{fmt(produto.unitario)}</p>
        </div>
      </div>
    </div>
  )
}
