'use client'

import { REGIONS } from '@/lib/regions'
import { SPECIALTY_ORDER } from '@/lib/specialtyMap'

export type SidebarFilters = {
  region: string
  specialty: string
  years: number
  pieYear: string
  pieMonth: string
}

type Props = {
  filters: SidebarFilters
  availableYears: string[]
  availableMonths: string[]
  loading: boolean
  onChange: (f: SidebarFilters) => void
  onLoad: () => void
}

const YEAR_OPTIONS = [1, 3, 5, 10, 15, 20, 30]

export default function Sidebar({
  filters, availableYears, availableMonths, loading, onChange, onLoad,
}: Props) {
  const set = (patch: Partial<SidebarFilters>) => onChange({ ...filters, ...patch })

  return (
    <div className="w-80 bg-white shadow-lg p-6 flex flex-col gap-5 overflow-y-auto z-10 shrink-0">
      <h1 className="text-xl font-bold text-gray-800 border-b pb-2">개원 현황 대시보드</h1>

      {/* 바로가기 */}
      <div className="space-y-2">
        <a
          href="https://cafe.naver.com/anesinformation"
          target="_blank"
          className="block w-full text-center py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg shadow transition-colors text-sm"
        >
          🏠 개원비밀공간
        </a>
        <a
          href="https://gaewon-map.vercel.app"
          target="_blank"
          className="block w-full text-center py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow transition-colors text-sm"
        >
          🗺️ 개비공 개원지도
        </a>
      </div>

      {/* 지역 선택 */}
      <div>
        <label className="block text-sm font-semibold text-gray-600 mb-1">📍 지역 선택</label>
        <select
          value={filters.region}
          onChange={e => set({ region: e.target.value })}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 text-sm"
        >
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* 진료과목 */}
      <div>
        <label className="block text-sm font-semibold text-gray-600 mb-1">진료과목 (분류)</label>
        <select
          value={filters.specialty}
          onChange={e => set({ specialty: e.target.value })}
          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 text-sm"
        >
          {SPECIALTY_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* 조회 기간 */}
      <div>
        <label className="block text-sm font-semibold text-gray-600 mb-2">조회 기간 (최근)</label>
        <div className="grid grid-cols-4 gap-2">
          {YEAR_OPTIONS.map(y => (
            <button
              key={y}
              onClick={() => set({ years: y })}
              className={`px-3 py-1 rounded border text-sm transition ${
                filters.years === y
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'hover:bg-blue-50 border-gray-300'
              }`}
            >
              {y}년
            </button>
          ))}
        </div>
      </div>

      {/* 파이차트 기간 */}
      <div>
        <label className="block text-sm font-semibold text-gray-600 mb-1">📊 원형차트 기간 선택</label>
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">연도</label>
            <select
              value={filters.pieYear}
              onChange={e => set({ pieYear: e.target.value, pieMonth: '' })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">선택 안함</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">월 (연도 선택 시 활성화)</label>
            <select
              value={filters.pieMonth}
              onChange={e => set({ pieMonth: e.target.value })}
              disabled={!filters.pieYear}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
            >
              <option value="">전체</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{parseInt(m)}월</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 데이터 불러오기 */}
      <button
        onClick={onLoad}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow disabled:opacity-60"
      >
        {loading ? '데이터 처리중...' : '데이터 불러오기'}
      </button>
    </div>
  )
}
