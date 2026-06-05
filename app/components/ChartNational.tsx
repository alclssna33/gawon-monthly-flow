'use client'

import { useRef, useState } from 'react'
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

function getColor(idx: number, total: number, alpha = 0.8) {
  const hue = Math.floor((idx / total) * 360)
  return `hsla(${hue},70%,60%,${alpha})`
}

export default function ChartNational({ data, months, specialty, onRegionClick }: Props) {
  const [popup, setPopup] = useState<{ title: string; hospitals: Hospital[]; position: 'left' | 'right' } | null>(null)
  const [pinned, setPinned] = useState(false)
  const chartRef = useRef<ChartJS<'bar'> | null>(null)

  // region × month → count
  const counts: Record<string, Record<string, number>> = {}
  REGIONS.forEach(r => { counts[r] = {} })
  for (const row of data) {
    if (counts[row.region1]) counts[row.region1][row.date] = (counts[row.region1][row.date] ?? 0) + row.count
    counts['전국'][row.date] = (counts['전국'][row.date] ?? 0) + row.count
  }

  const chartData: ChartData<'bar'> = {
    labels: REGIONS,
    datasets: months.map((m, idx) => ({
      label: m,
      data: REGIONS.map(r => counts[r][m] ?? 0),
      backgroundColor: getColor(idx, months.length),
    })),
  }

  const fetchHospitals = async (region: string, date: string, isRight: boolean, pin: boolean) => {
    if (pinned && !pin) return
    const params = new URLSearchParams({ date, region1: region })
    if (specialty !== '전체') params.set('specialty', specialty)
    const res = await fetch(`/api/hospital-list?${params}`)
    const hospitals: Hospital[] = await res.json()
    if (!hospitals.length) { if (!pinned) setPopup(null); return }
    const title = `📋 ${date}\n${region} (${hospitals.length}건)`
    setPopup({ title, hospitals, position: isRight ? 'left' : 'right' })
    if (pin) setPinned(true)
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } },
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
      if (pinned || !elements.length) { if (!pinned) setPopup(null); return }
      const { index, datasetIndex } = elements[0]
      const isRight = (event.x ?? 0) >= (chartRef.current?.width ?? 0) / 2
      fetchHospitals(REGIONS[index], months[datasetIndex], isRight, false)
    },
    onClick: (event, elements) => {
      if (!elements.length) return
      const { index, datasetIndex } = elements[0]
      const region = REGIONS[index]
      const month = months[datasetIndex]
      const isRight = (event.x ?? 0) >= (chartRef.current?.width ?? 0) / 2
      setPinned(false)
      fetchHospitals(region, month, isRight, true)
      onRegionClick(region)
    },
  }

  return (
    <div className="relative h-full w-full bg-white rounded-lg shadow-sm p-2">
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
