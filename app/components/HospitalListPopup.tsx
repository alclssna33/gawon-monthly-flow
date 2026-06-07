'use client'

type Hospital = {
  name: string
  address: string | null
  region1: string | null
  region2: string | null
  is_transfer?: boolean | null
}

type Props = {
  title: string
  hospitals: Hospital[]
  position: 'left' | 'right'
  onClose: () => void
}

export default function HospitalListPopup({ title, hospitals, position, onClose }: Props) {
  return (
    <div
      className={`absolute top-2 ${position === 'right' ? 'right-2' : 'left-2'} bg-white border-2 border-blue-500 rounded-lg shadow-lg p-3 z-10`}
      style={{ maxWidth: 320, maxHeight: 400, overflowY: 'auto' }}
    >
      <div className="flex items-center justify-between mb-2 border-b pb-1">
        <div className="text-xs font-bold text-gray-700 whitespace-pre-line">{title}</div>
        <button onClick={onClose} className="text-gray-500 hover:text-red-600 font-bold text-lg leading-none px-2">×</button>
      </div>
      <div className="text-xs space-y-0.5">
        {hospitals.map((h, i) => (
          <div key={i} className="text-gray-600 py-0.5 flex justify-between gap-2">
            <span className="shrink-0">{i + 1}.</span>
            <span className="flex-1">
              {h.name}
              {h.is_transfer && (
                <span className="ml-1 text-[10px] font-semibold text-orange-500 bg-orange-50 px-1 rounded">양수</span>
              )}
            </span>
            <span className="text-gray-400 text-[10px] shrink-0">{h.region2}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
