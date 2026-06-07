'use client'

import { useRef, useState, useCallback } from 'react'
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale,
  Tooltip, Legend, type ChartData, type ChartOptions,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { REGIONS } from '@/lib/regions'
import HospitalListPopup from './HospitalListPopup'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

type FlowRow = { date: string; region1: string; count: number }
type Hospital = { name: string; address: string | null; region1: string | null; region2: string | null }

type Props = {
  data: FlowRow[]
  months: string[]
  specialty: string
  onRegionClick: (region: string) => void
}

// 기본적으로 ON/OFF 가능한 "큰 지역" 목록
const TOGGLEABLE = ['전국', '서울', '경기도']

function getColor(idx: number, total: number) {
  // 단일 파란색 계열 — 오래된 월은 연하게, 최근 월은 진하게
  const lightness = 75 - Math.floor((idx / Math.max(total - 1, 1)) * 30)  // 75% → 45%
  return `hsla(215,70%,${lightness}%,0.85)`
}

export default function ChartNational({ data, months, specialty, onRegionClick }: Props) {
  const [popup, setPopup] = useState<{ title: string; hospitals: Hospital[]; position: 'left' | 'right' } | null>(null)
  const [pinned, setPinned] = useState(false)
  const [hiddenRegions, setHiddenRegions] = useState<Set<string>>(new Set())
  const chartRef = useRef<ChartJS<'bar'> | null>(null)
  const lastHoverKey = useRef<string>('')
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toggleRegion = (r: string) => {
    setHiddenRegions(prev => {
      const next = new Set(prev)
      next.has(r) ? next.delete(r) : next.add(r)
      return next
    })
    // 팝업이 열려 있으면 닫기
    setPopup(null)
    setPinned(false)
  }

  // 표시할 지역 (숨김 제외)
  const visibleRegions = REGIONS.filter(r => !hiddenRegions.has(r))

  // region × month → count
  const counts: Record<string, Record<string, number>> = {}
  REGIONS.forEach(r => { counts[r] = {} })
  for (const row of data) {
    if (counts[row.region1]) counts[row.region1][row.date] = (counts[row.region1][row.date] ?? 0) + row.count
    counts['전국'][row.date] = (counts['전국'][row.date] ?? 0) + row.count
  }

  const chartData: ChartData<'bar'> = {
    labels: visibleRegions,
    datasets: months.map((m, idx) => ({
      label: m,
      data: visibleRegions.map(r => counts[r][m] ?? 0),
      backgroundColor: getColor(idx, months.length),
    })),
  }

  const fetchHospitals = useCallback(async (region: string, date: string, isRight: boolean, pin: boolean) => {
    const params = new URLSearchParams({ date, region1: region })
    if (specialty !== '전체') params.set('specialty', specialty)
    const res = await fetch(`/api/hospital-list?${params}`)
    const hospitals: Hospital[] = await res.json()
    if (!hospitals.length) { setPopup(null); return }
    const title = `📋 ${date}\n${region} (${hospitals.length}건)`
    setPopup({ title, hospitals, position: isRight ? 'left' : 'right' })
    if (pin) setPinned(true)
  }, [specialty])

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: ctx => ctx[0].dataset.label ?? '',
          label: ctx => `${ctx.parsed.y}건`,
        },
        displayColors: false,
        backgroundColor: 'rgba(255,255,255,0.95)',
        titleColor: '#000', bodyColor: '#000', borderColor: '#000', borderWidth: 2,
      },
    },
    scales: { x: { stacked: false }, y: { beginAtZero: true } },
    onHover: (event, elements) => {
      const el = event.native?.target as HTMLElement
      if (el) el.style.cursor = elements.length ? 'pointer' : 'default'
      if (pinned) return
      if (!elements.length) {
        if (hoverTimer.current) clearTimeout(hoverTimer.current)
        lastHoverKey.current = ''
        setPopup(null)
        return
      }
      const { index, datasetIndex } = elements[0]
      const region = visibleRegions[index]
      const month = months[datasetIndex]
      const hoverKey = `${region}|${month}`
      if (hoverKey === lastHoverKey.current) return
      lastHoverKey.current = hoverKey
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
      hoverTimer.current = setTimeout(() => {
        const isRight = (event.x ?? 0) >= (chartRef.current?.width ?? 0) / 2
        fetchHospitals(region, month, isRight, false)
      }, 150)
    },
    onClick: (event, elements) => {
      if (!elements.length) return
      const { index, datasetIndex } = elements[0]
      const region = visibleRegions[index]
      const month = months[datasetIndex]
      const isRight = (event.x ?? 0) >= (chartRef.current?.width ?? 0) / 2
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
      setPinned(false)
      fetchHospitals(region, month, isRight, true)
      onRegionClick(region)
    },
  }

  return (
    <div className="relative h-full w-full bg-white rounded-lg shadow-sm p-2">
      {/* 토글 버튼 */}
      <div className="absolute top-2 left-2 flex gap-1 z-10">
        {TOGGLEABLE.map(r => (
          <button
            key={r}
            onClick={() => toggleRegion(r)}
            className={`px-2 py-0.5 text-xs font-semibold rounded border transition-all ${
              hiddenRegions.has(r)
                ? 'bg-gray-100 text-gray-400 border-gray-300 line-through'
                : 'bg-blue-50 text-blue-700 border-blue-400 hover:bg-blue-100'
            }`}
          >
            {r}
          </button>
        ))}
        {hiddenRegions.size > 0 && (
          <button
            onClick={() => setHiddenRegions(new Set())}
            className="px-2 py-0.5 text-xs rounded border bg-red-50 text-red-500 border-red-300 hover:bg-red-100"
          >
            전체 표시
          </button>
        )}
      </div>
      <Bar ref={chartRef} data={chartData} options={options} />
      {popup && (
        <HospitalListPopup
          title={popup.title}
          hospitals={popup.hospitals}
          position={popup.position}
          onClose={() => { setPinned(false); setPopup(null) }}
        />
      )}
    </div>
  )
}
