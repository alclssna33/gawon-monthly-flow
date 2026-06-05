'use client'

import { useRef, useState } from 'react'
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

type Props = {
  region: string
  data: FlowRow[]
  months: string[]
  specialty: string
}

function getColor(idx: number, total: number) {
  return `hsla(${Math.floor((idx / total) * 360)},70%,60%,0.8)`
}

export default function ChartDetail({ region, data, months, specialty }: Props) {
  const [popup, setPopup] = useState<{ title: string; hospitals: Hospital[]; position: 'left' | 'right' } | null>(null)
  const [pinned, setPinned] = useState(false)
  const chartRef = useRef<ChartJS<'bar'> | null>(null)

  const isMetro = METROPOLISES.has(region)

  // 광역시: X축 = [region], 도/특별자치도: X축 = region2 목록 (API 호출로 가져옴)
  // 여기서는 region1 단위 집계만 존재하므로 광역시는 단일 바, 그 외는 region2별 집계 필요
  // → region2 집계는 /api/monthly-flow에 region1 파라미터를 추가하여 처리
  // 현재 API는 region1 집계만 반환하므로 일단 광역시 처리만 구현
  // (도 단위 상세는 추후 /api/monthly-flow?region1=경기도 추가 후 연동)

  const labels = isMetro ? [region] : [region]
  const counts: Record<string, Record<string, number>> = {}
  labels.forEach(l => { counts[l] = {} })

  for (const row of data) {
    counts[region][row.date] = (counts[region][row.date] ?? 0) + row.count
  }

  const chartData: ChartData<'bar'> = {
    labels,
    datasets: months.map((m, idx) => ({
      label: m,
      data: labels.map(l => counts[l][m] ?? 0),
      backgroundColor: getColor(idx, months.length),
    })),
  }

  const fetchHospitals = async (date: string, r1: string, r2: string | null, isRight: boolean, pin: boolean) => {
    if (pinned && !pin) return
    const params = new URLSearchParams({ date, region1: r1 })
    if (r2) params.set('region2', r2)
    if (specialty !== '전체') params.set('specialty', specialty)
    const res = await fetch(`/api/hospital-list?${params}`)
    const hospitals: Hospital[] = await res.json()
    if (!hospitals.length) { if (!pinned) setPopup(null); return }
    const locLabel = r2 ? `${r1} ${r2}` : r1
    const title = `📋 ${date}\n${locLabel} (${hospitals.length}건)`
    setPopup({ title, hospitals, position: isRight ? 'left' : 'right' })
    if (pin) setPinned(true)
  }

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
    scales: {
      x: { stacked: false, ticks: { autoSkip: false, maxRotation: 45, minRotation: 45, font: { size: 10 } }, grid: { display: false } },
      y: { beginAtZero: true },
    },
    onHover: (event, elements) => {
      const el = event.native?.target as HTMLElement
      if (el) el.style.cursor = elements.length ? 'pointer' : 'default'
      if (pinned || !elements.length) { if (!pinned) setPopup(null); return }
      const { index, datasetIndex } = elements[0]
      const isRight = (event.x ?? 0) >= (chartRef.current?.width ?? 0) / 2
      fetchHospitals(months[datasetIndex], region, isMetro ? null : labels[index], isRight, false)
    },
    onClick: (event, elements) => {
      if (!elements.length) return
      const { index, datasetIndex } = elements[0]
      const isRight = (event.x ?? 0) >= (chartRef.current?.width ?? 0) / 2
      setPinned(false)
      fetchHospitals(months[datasetIndex], region, isMetro ? null : labels[index], isRight, true)
    },
  }

  return (
    <div className="relative h-full w-full bg-white rounded-lg shadow-sm p-2 pb-6">
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
