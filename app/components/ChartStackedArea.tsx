'use client'

import {
  Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale,
  Filler, Tooltip, Legend,
  type ChartData, type ChartOptions,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip, Legend)

type FlowRow = { date: string; region1: string; count: number }

type Props = {
  data: FlowRow[]       // 전체 flow 데이터 (specialty 축으로 재집계)
  months: string[]
  specialtyData: { date: string; specialty: string; count: number }[]
  specialties: string[]
}

function getColor(idx: number, total: number, alpha = 0.6) {
  return `hsla(${Math.floor((idx / total) * 360)},70%,60%,${alpha})`
}

export default function ChartStackedArea({ specialtyData, specialties, months }: Props) {
  // 누적 계산: specialty × month → 누적합
  const cumulative: Record<string, Record<string, number>> = {}
  for (const spec of specialties) {
    cumulative[spec] = {}
    let sum = 0
    for (const m of months) {
      const row = specialtyData.find(r => r.specialty === spec && r.date === m)
      sum += row?.count ?? 0
      cumulative[spec][m] = sum
    }
  }

  const chartData: ChartData<'line'> = {
    labels: months,
    datasets: specialties.map((spec, idx) => ({
      label: spec,
      data: months.map(m => cumulative[spec][m] ?? 0),
      backgroundColor: getColor(idx, specialties.length),
      borderColor: getColor(idx, specialties.length, 1),
      borderWidth: 1,
      fill: true,
      tension: 0.4,
    })),
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 }, padding: 8 } },
      tooltip: {
        callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}건` },
      },
    },
    scales: {
      x: { stacked: false, ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 45 } },
      y: { stacked: false, beginAtZero: true },
    },
  }

  return (
    <div className="h-full w-full bg-white rounded-lg shadow-sm p-2">
      <Line data={chartData} options={options} />
    </div>
  )
}
