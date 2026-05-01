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

export default function CartaoProduto({ produto }: { produto: Produto }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
          #{produto.cod}
        </span>
        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
          {produto.unidade}
        </span>
      </div>

      <p className="text-sm font-medium text-gray-800 leading-snug min-h-[40px]">
        {produto.descricao}
      </p>

      <div className="grid grid-cols-3 gap-2 mt-1">
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <p className="text-xs text-blue-500 font-semibold uppercase tracking-wide">Master</p>
          <p className="text-xs text-blue-400 mt-0.5">A partir de {produto.cxMaster} un</p>
          <p className="text-base font-bold text-blue-700 mt-1">{fmt(produto.master)}</p>
        </div>

        <div className="bg-emerald-50 rounded-lg p-2 text-center">
          <p className="text-xs text-emerald-500 font-semibold uppercase tracking-wide">Inner</p>
          <p className="text-xs text-emerald-400 mt-0.5">A partir de {produto.cxInner} un</p>
          <p className="text-base font-bold text-emerald-700 mt-1">{fmt(produto.inner)}</p>
        </div>

        <div className="bg-orange-50 rounded-lg p-2 text-center">
          <p className="text-xs text-orange-500 font-semibold uppercase tracking-wide">Unitário</p>
          <p className="text-xs text-orange-400 mt-0.5">Mín. {produto.pacUnid} un</p>
          <p className="text-base font-bold text-orange-700 mt-1">{fmt(produto.unitario)}</p>
        </div>
      </div>
    </div>
  )
}
