'use client'

import { useRef, useState, useCallback } from 'react'
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
  type ChartData, type ChartOptions,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { METROPOLISES } from '@/lib/regions'
import HospitalListPopup from './HospitalListPopup'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

type FlowRow = { date: string; region1: string; count: number }
type Hospital = { name: string; address: string | null; region1: string | null; region2: string | null }
type Mode = 'open' | 'close' | 'net'

type Props = {
  region: string
  data: FlowRow[]         // 개원 데이터
  closeData: FlowRow[]    // 폐원 데이터
  months: string[]
  specialty: string
  facilityType: string
}

const MODE_LABELS: Record<Mode, string> = { open: '개원', close: '폐원', net: 'Net' }
const MODE_COLORS: Record<Mode, string> = {
  open:  'rgba(59,130,246,0.75)',   // 파랑
  close: 'rgba(239,68,68,0.75)',    // 빨강
  net:   'rgba(34,197,94,0.75)',    // 초록 (플러스)
}
const NET_NEG_COLOR = 'rgba(239,68,68,0.6)'  // Net 음수 = 빨강

function getColor(idx: number, total: number) {
  return `hsla(${Math.floor((idx / total) * 240)},65%,55%,0.8)`
}

export default function ChartDetail({ region, data, closeData, months, specialty, facilityType }: Props) {
  const [mode, setMode] = useState<Mode>('open')
  const [popup, setPopup] = useState<{ title: string; hospitals: Hospital[]; position: 'left' | 'right' } | null>(null)
  const [pinned, setPinned] = useState(false)
  const chartRef = useRef<ChartJS<'bar'> | null>(null)
  const lastHoverKey = useRef<string>('')
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isMetro = METROPOLISES.has(region)

  // 월별 합계 계산
  const openByMonth: Record<string, number> = {}
  const closeByMonth: Record<string, number> = {}
  for (const row of data)      openByMonth[row.date]  = (openByMonth[row.date]  ?? 0) + row.count
  for (const row of closeData) closeByMonth[row.date] = (closeByMonth[row.date] ?? 0) + row.count

  // 모드별 데이터셋 생성
  let chartData: ChartData<'bar'>
  const labels = [region]

  if (mode === 'open' || mode === 'close') {
    const byMonth = mode === 'open' ? openByMonth : closeByMonth
    chartData = {
      labels,
      datasets: months.map((m, idx) => ({
        label: m,
        data: [byMonth[m] ?? 0],
        backgroundColor: mode === 'open'
          ? getColor(idx, months.length)
          : `hsla(${Math.floor((idx / months.length) * 30) + 0},75%,55%,0.8)`,
      })),
    }
  } else {
    // Net = 개원 - 폐원
    chartData = {
      labels,
      datasets: months.map((m, idx) => {
        const net = (openByMonth[m] ?? 0) - (closeByMonth[m] ?? 0)
        return {
          label: m,
          data: [net],
          backgroundColor: net >= 0
            ? `hsla(${130 + idx},60%,50%,0.8)`
            : NET_NEG_COLOR,
        }
      }),
    }
  }

  const fetchHospitals = useCallback(async (
    date: string, r1: string, r2: string | null, isRight: boolean, pin: boolean
  ) => {
    const params = new URLSearchParams({
      date,
      region1:      r1,
      facilityType: facilityType ?? '의원',
      mode:         mode === 'close' ? 'close' : 'open',
    })
    if (r2) params.set('region2', r2)
    if (specialty !== '전체') params.set('specialty', specialty)

    const res = await fetch(`/api/mr/facility-list?${params}`)
    const hospitals: Hospital[] = await res.json()
    if (!hospitals.length) { setPopup(null); return }

    const locLabel = r2 ? `${r1} ${r2}` : r1
    const modeLabel = mode === 'close' ? '폐원' : mode === 'net' ? 'Net' : '개원'
    const title = `📋 ${date} ${modeLabel}\n${locLabel} (${hospitals.length}건)`
    setPopup({ title, hospitals, position: isRight ? 'left' : 'right' })
    if (pin) setPinned(true)
  }, [specialty, facilityType, mode])

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: ctx => ctx[0].dataset.label ?? '',
          label: ctx => {
            const v = ctx.parsed.y
            return mode === 'net'
              ? `Net: ${v >= 0 ? '+' : ''}${v}건`
              : `${MODE_LABELS[mode]}: ${v}건`
          },
        },
        displayColors: false,
        backgroundColor: 'rgba(255,255,255,0.95)',
        titleColor: '#000', bodyColor: '#000', borderColor: '#ccc', borderWidth: 1,
      },
    },
    scales: {
      x: {
        stacked: false,
        ticks: { autoSkip: false, maxRotation: 45, minRotation: 45, font: { size: 10 } },
        grid: { display: false },
      },
      y: { beginAtZero: mode !== 'net' },
    },
    onHover: (event, elements) => {
      const el = event.native?.target as HTMLElement
      if (el) el.style.cursor = elements.length ? 'pointer' : 'default'
      if (pinned || mode === 'net') return
      if (!elements.length) {
        if (hoverTimer.current) clearTimeout(hoverTimer.current)
        lastHoverKey.current = ''
        setPopup(null)
        return
      }
      const { datasetIndex } = elements[0]
      const month = months[datasetIndex]
      const hoverKey = `${month}|${region}|${mode}`
      if (hoverKey === lastHoverKey.current) return
      lastHoverKey.current = hoverKey
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
      hoverTimer.current = setTimeout(() => {
        const isRight = (event.x ?? 0) >= (chartRef.current?.width ?? 0) / 2
        fetchHospitals(month, region, isMetro ? null : region, isRight, false)
      }, 150)
    },
    onClick: (event, elements) => {
      if (!elements.length || mode === 'net') return
      const { datasetIndex } = elements[0]
      const isRight = (event.x ?? 0) >= (chartRef.current?.width ?? 0) / 2
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
      setPinned(false)
      fetchHospitals(months[datasetIndex], region, isMetro ? null : region, isRight, true)
    },
  }

  return (
    <div className="relative h-full w-full bg-white rounded-lg shadow-sm p-2 pb-6 flex flex-col gap-1">
      {/* 탭 */}
      <div className="flex gap-1">
        {(['open', 'close', 'net'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setPopup(null); setPinned(false) }}
            className={`px-3 py-0.5 rounded text-xs font-semibold transition-colors ${
              mode === m
                ? m === 'open'  ? 'bg-blue-600 text-white'
                : m === 'close' ? 'bg-red-500 text-white'
                :                 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
        {mode === 'net' && (
          <span className="ml-2 text-xs text-gray-400 self-center">
            클릭 팝업 미지원 (Net은 개원-폐원 차이값)
          </span>
        )}
      </div>

      {/* 차트 */}
      <div className="flex-1 min-h-0">
        <Bar ref={chartRef} data={chartData} options={options} />
      </div>

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
