'use client'

import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip,
  type ChartData, type ChartOptions,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

type Item = { label: string; count: number }

type Props = {
  title: string
  items: Item[]
  colorOffset?: number
}

function getColor(idx: number, total: number) {
  return `hsla(${Math.floor((idx / total) * 360)},70%,60%,0.8)`
}

export default function ChartTopRankings({ title, items, colorOffset = 0 }: Props) {
  const chartData: ChartData<'bar'> = {
    labels: items.map(i => i.label),
    datasets: [{
      label: '개원 수',
      data: items.map(i => i.count),
      backgroundColor: items.map((_, idx) => getColor((idx + colorOffset) % 10, 10)),
      borderWidth: 1,
    }],
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `${ctx.parsed.x}건` } },
    },
    scales: {
      x: { beginAtZero: true, ticks: { font: { size: 11 } } },
      y: { ticks: { font: { size: 11 } } },
    },
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-md font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="relative h-96 w-full">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  )
}
