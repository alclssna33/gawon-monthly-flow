'use client'

import { useState, useMemo } from 'react'
import {
  Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale,
  Filler, Tooltip, Legend,
  type ChartData, type ChartOptions,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { REGIONS } from '@/lib/regions'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend)

type Row = { date: string; specialty: string; count: number }
type Mode = 'open' | 'close' | 'net'

type Props = {
  months: string[]
  openData: Row[]
  closeData: Row[]
  specialties: string[]
  years: number
  onRegionChange: (region1: string) => void
  region1: string
}

function getColor(idx: number, total: number, alpha = 0.7) {
  return `hsla(${Math.floor((idx / total) * 300)},65%,55%,${alpha})`
}

function buildCumulative(data: Row[], specialties: string[], months: string[]) {
  const cum: Record<string, Record<string, number>> = {}
  for (const spec of specialties) {
    cum[spec] = {}
    let sum = 0
    for (const m of months) {
      const row = data.find(r => r.specialty === spec && r.date === m)
      sum += row?.count ?? 0
      cum[spec][m] = sum
    }
  }
  return cum
}

const MODE_LABELS: Record<Mode, string> = {
  open:  '개원',
  close: '폐원',
  net:   'Net (순증감)',
}

const REGION_OPTIONS = ['전국', ...REGIONS.filter(r => r !== '전국')]

export default function ChartStackedArea({
  months, openData, closeData, specialties, years, onRegionChange, region1,
}: Props) {
  const [mode, setMode] = useState<Mode>('open')

  const openCum  = useMemo(() => buildCumulative(openData,  specialties, months), [openData,  specialties, months])
  const closeCum = useMemo(() => buildCumulative(closeData, specialties, months), [closeData, specialties, months])

  const chartData: ChartData<'line'> = useMemo(() => {
    const datasets = specialties.map((spec, idx) => {
      let values: number[]
      if (mode === 'open') {
        values = months.map(m => openCum[spec]?.[m] ?? 0)
      } else if (mode === 'close') {
        values = months.map(m => closeCum[spec]?.[m] ?? 0)
      } else {
        values = months.map(m => (openCum[spec]?.[m] ?? 0) - (closeCum[spec]?.[m] ?? 0))
      }
      const color = getColor(idx, specialties.length)
      return {
        label: spec,
        data: values,
        backgroundColor: getColor(idx, specialties.length, 0.15),
        borderColor: color,
        borderWidth: 2,
        fill: mode !== 'net',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
      }
    })
    return { labels: months, datasets }
  }, [mode, months, specialties, openCum, closeCum])

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 }, padding: 6 } },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}건`,
        },
      },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 45 } },
      y: {
        beginAtZero: true,
        ticks: { callback: v => `${Number(v).toLocaleString()}건` },
      },
    },
  }

  const totalClose = closeData.reduce((s, r) => s + r.count, 0)

  return (
    <div className="h-full w-full bg-white rounded-lg shadow-sm p-3 flex flex-col gap-2">

      {/* 컨트롤 바 */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* 모드 토글 */}
        <div className="flex rounded overflow-hidden border border-gray-200 text-sm">
          {(['open', 'close', 'net'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 transition-colors ${
                mode === m
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* 지역 드롭다운 */}
        <div className="flex items-center gap-1 text-sm">
          <span className="text-gray-500">지역:</span>
          <select
            value={region1}
            onChange={e => onRegionChange(e.target.value)}
            className="border border-gray-200 rounded px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {REGION_OPTIONS.map(r => (
              <option key={r} value={r === '전국' ? '' : r}>{r}</option>
            ))}
          </select>
        </div>

        {/* 데이터 한계 안내 */}
        {(mode === 'close' || mode === 'net') && (
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            ⚠️ 폐원 데이터 {totalClose.toLocaleString()}건 반영 (일부 누락 가능, 참고용)
          </span>
        )}
      </div>

      {/* 차트 */}
      <div className="flex-1 min-h-0">
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}
