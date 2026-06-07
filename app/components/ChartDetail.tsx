'use client'

import { useRef, useState, useCallback, useMemo } from 'react'
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
  type ChartData, type ChartOptions,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import HospitalListPopup from './HospitalListPopup'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

type FlowRow = { date: string; region1: string; count: number }
type Hospital = { name: string; address: string | null; region1: string | null; region2: string | null }
type Mode = 'open' | 'close' | 'net'

type Props = {
  region: string
  data: FlowRow[]
  closeData: FlowRow[]
  months: string[]
  specialty: string
  facilityType: string
}

const MODE_LABELS: Record<Mode, string> = { open: '개원', close: '폐원', net: 'Net' }

export default function ChartDetail({ region, data, closeData, months, specialty, facilityType }: Props) {
  const [mode, setMode] = useState<Mode>('open')
  const [popup, setPopup] = useState<{ title: string; hospitals: Hospital[]; position: 'left' | 'right' } | null>(null)
  const chartRef = useRef<ChartJS<'bar'> | null>(null)

  // 월별 합계
  const openByMonth = useMemo(() => {
    const m: Record<string, number> = {}
    for (const row of data) m[row.date] = (m[row.date] ?? 0) + row.count
    return m
  }, [data])

  const closeByMonth = useMemo(() => {
    const m: Record<string, number> = {}
    for (const row of closeData) m[row.date] = (m[row.date] ?? 0) + row.count
    return m
  }, [closeData])

  // 모드별 값 배열 (labels=months, 단일 dataset)
  const values = useMemo(() => months.map(m => {
    if (mode === 'open')  return openByMonth[m]  ?? 0
    if (mode === 'close') return closeByMonth[m] ?? 0
    return (openByMonth[m] ?? 0) - (closeByMonth[m] ?? 0)
  }), [mode, months, openByMonth, closeByMonth])

  const barColors = useMemo(() => values.map((v, i) => {
    if (mode === 'net') return v >= 0 ? 'hsla(130,60%,50%,0.8)' : 'rgba(239,68,68,0.7)'
    const hue = mode === 'open'
      ? Math.floor((i / Math.max(months.length, 1)) * 240)
      : Math.floor((i / Math.max(months.length, 1)) * 30)
    return `hsla(${hue},65%,55%,0.8)`
  }), [mode, values, months])

  const chartData: ChartData<'bar'> = {
    labels: months,
    datasets: [{
      label: MODE_LABELS[mode],
      data: values,
      backgroundColor: barColors,
    }],
  }

  const fetchHospitals = useCallback(async (date: string, isRight: boolean) => {
    if (!region || region === '전국') return

    const params = new URLSearchParams({
      date,
      region1:      region,
      facilityType: facilityType || '의원',
      mode:         mode === 'close' ? 'close' : 'open',
    })
    if (specialty && specialty !== '전체') params.set('specialty', specialty)

    try {
      const res = await fetch(`/api/mr/facility-list?${params}`)
      const hospitals: Hospital[] = await res.json()
      if (!Array.isArray(hospitals) || !hospitals.length) { setPopup(null); return }
      const modeLabel = mode === 'close' ? '폐원' : '개원'
      setPopup({
        title: `📋 ${date} ${modeLabel} — ${region} (${hospitals.length}건)`,
        hospitals,
        position: isRight ? 'left' : 'right',
      })
    } catch { setPopup(null) }
  }, [region, specialty, facilityType, mode])

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: ctx => ctx[0].label ?? '',
          label: ctx => {
            const v = ctx.parsed.y ?? 0
            return mode === 'net'
              ? `Net: ${v >= 0 ? '+' : ''}${v}건`
              : `${MODE_LABELS[mode]}: ${v}건`
          },
        },
        displayColors: false,
        backgroundColor: 'rgba(255,255,255,0.95)',
        titleColor: '#333', bodyColor: '#333', borderColor: '#ccc', borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          autoSkip: true,
          maxTicksLimit: months.length > 60 ? 20 : months.length > 24 ? 36 : months.length,
          maxRotation: 45,
          minRotation: 0,
          font: { size: 10 },
        },
        grid: { display: false },
      },
      y: { beginAtZero: mode !== 'net' },
    },
    onHover: (event, elements) => {
      const el = event.native?.target as HTMLElement
      if (el) el.style.cursor = (elements.length && mode !== 'net') ? 'pointer' : 'default'
    },
    onClick: (event, elements) => {
      if (!elements.length || mode === 'net') return
      const month = months[elements[0].index]
      if (!month) return
      const isRight = (event.x ?? 0) >= (chartRef.current?.width ?? 0) / 2
      fetchHospitals(month, isRight)
    },
  }

  return (
    <div className="relative h-full w-full bg-white rounded-lg shadow-sm p-2 pb-6 flex flex-col gap-1">
      {/* 탭 */}
      <div className="flex gap-1 items-center">
        {(['open', 'close', 'net'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setPopup(null) }}
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
        {region === '전국' && (
          <span className="ml-2 text-xs text-gray-400">상단 지역 막대 클릭 후 사용</span>
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
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  )
}
