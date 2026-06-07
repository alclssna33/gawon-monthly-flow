'use client'

import { useRef, useState, useCallback, useMemo, useEffect } from 'react'
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
  type ChartData, type ChartOptions,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import HospitalListPopup from './HospitalListPopup'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend)

type FlowRow = { date: string; region1: string; count: number }
type Hospital = { name: string; address: string | null; region1: string | null; region2: string | null; is_transfer?: boolean | null }
type Mode = 'open' | 'close' | 'net'

type Props = {
  region: string
  data: FlowRow[]
  closeData: FlowRow[]
  months: string[]
  specialty: string
  facilityType: string
  years: number
}

const MODE_LABELS: Record<Mode, string> = { open: '개원', close: '폐원', net: 'Net' }

export default function ChartDetail({ region, data, closeData, months, specialty, facilityType, years }: Props) {
  const [mode, setMode] = useState<Mode>('open')
  const [popup, setPopup] = useState<{ title: string; hospitals: Hospital[]; position: 'left' | 'right' } | null>(null)
  const [transferData, setTransferData] = useState<FlowRow[]>([])
  const chartRef = useRef<ChartJS<'bar'> | null>(null)

  // 양수양도 데이터 로드 (개원 탭 + 지역 선택 시)
  useEffect(() => {
    if (mode !== 'open' || !region || region === '전국') { setTransferData([]); return }
    const p = new URLSearchParams({
      years: String(years), facilityType, region1: region,
      specialty: specialty === '전체' ? '' : specialty,
    })
    fetch(`/api/mr/monthly-transfer-flow?${p}`)
      .then(r => r.json())
      .then(setTransferData)
      .catch(() => setTransferData([]))
  }, [mode, region, years, facilityType, specialty])

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

  const transferByMonth = useMemo(() => {
    const m: Record<string, number> = {}
    for (const row of transferData) m[row.date] = (m[row.date] ?? 0) + row.count
    return m
  }, [transferData])

  // 차트 데이터
  const chartData: ChartData<'bar'> = useMemo(() => {
    if (mode === 'open') {
      // 스택: 1층=양수양도(주황), 2층=신규개원(파랑)
      const transferVals = months.map(m => transferByMonth[m] ?? 0)
      const newOpenVals  = months.map(m => Math.max(0, (openByMonth[m] ?? 0) - (transferByMonth[m] ?? 0)))
      return {
        labels: months,
        datasets: [
          {
            label: '양수양도',
            data: transferVals,
            backgroundColor: 'rgba(251,146,60,0.85)',   // 주황
            stack: 'open',
          },
          {
            label: '신규개원',
            data: newOpenVals,
            backgroundColor: 'rgba(59,130,246,0.75)',   // 파랑
            stack: 'open',
          },
        ],
      }
    }

    if (mode === 'close') {
      return {
        labels: months,
        datasets: [{
          label: '폐원',
          data: months.map(m => closeByMonth[m] ?? 0),
          backgroundColor: 'rgba(239,68,68,0.7)',
        }],
      }
    }

    // Net
    return {
      labels: months,
      datasets: [{
        label: 'Net',
        data: months.map(m => (openByMonth[m] ?? 0) - (closeByMonth[m] ?? 0)),
        backgroundColor: months.map(m =>
          (openByMonth[m] ?? 0) - (closeByMonth[m] ?? 0) >= 0
            ? 'hsla(130,60%,50%,0.8)'
            : 'rgba(239,68,68,0.7)'
        ),
      }],
    }
  }, [mode, months, openByMonth, closeByMonth, transferByMonth])

  const fetchHospitals = useCallback(async (date: string, isRight: boolean) => {
    if (!region || region === '전국') return
    const params = new URLSearchParams({
      date, region1: region,
      facilityType: facilityType || '의원',
      mode: mode === 'close' ? 'close' : 'open',
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
      legend: {
        display: mode === 'open' && region !== '전국',
        position: 'top',
        labels: { boxWidth: 12, font: { size: 10 }, padding: 8 },
      },
      tooltip: {
        callbacks: {
          title: ctx => ctx[0].label ?? '',
          label: ctx => {
            const v = ctx.parsed.y ?? 0
            if (mode === 'net') return `Net: ${v >= 0 ? '+' : ''}${v}건`
            return `${ctx.dataset.label}: ${v}건`
          },
          footer: ctx => {
            if (mode !== 'open') return ''
            const month = ctx[0]?.label
            if (!month) return ''
            const total = openByMonth[month] ?? 0
            const transfer = transferByMonth[month] ?? 0
            if (!total) return ''
            const pct = Math.round(transfer / total * 100)
            return `양수양도 비율: ${pct}% (${transfer}/${total}건)`
          },
        },
        backgroundColor: 'rgba(255,255,255,0.95)',
        titleColor: '#333', bodyColor: '#333', footerColor: '#f97316',
        borderColor: '#ccc', borderWidth: 1,
      },
    },
    scales: {
      x: {
        stacked: mode === 'open',
        ticks: {
          autoSkip: true,
          maxTicksLimit: months.length > 60 ? 20 : months.length > 24 ? 36 : months.length,
          maxRotation: 45, minRotation: 0, font: { size: 10 },
        },
        grid: { display: false },
      },
      y: { stacked: mode === 'open', beginAtZero: mode !== 'net' },
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
        {mode === 'open' && region !== '전국' && (
          <span className="ml-2 text-xs text-gray-400">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-orange-400 mr-1" />양수양도
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400 ml-2 mr-1" />신규개원
          </span>
        )}
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
