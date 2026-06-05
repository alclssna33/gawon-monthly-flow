'use client'

import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  type ChartData, type ChartOptions,
} from 'chart.js'
import { Pie } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

type PieRow = { specialty: string; count: number }

type Props = {
  data: PieRow[]
}

function getColor(idx: number, total: number) {
  return `hsla(${Math.floor((idx / total) * 360)},70%,60%,0.8)`
}

export default function ChartPie({ data }: Props) {
  if (!data.length) {
    return (
      <div className="h-full w-full bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-400 text-sm">
        연도를 선택하면 과목별 비율이 표시됩니다.
      </div>
    )
  }

  const total = data.reduce((s, r) => s + r.count, 0)
  const colors = data.map((_, i) => getColor(i, data.length))

  const chartData: ChartData<'pie'> = {
    labels: data.map(r => r.specialty),
    datasets: [{
      data: data.map(r => r.count),
      backgroundColor: colors,
      borderWidth: 2,
      borderColor: '#fff',
    }],
  }

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: { size: 11 },
          padding: 10,
          generateLabels: chart => {
            const d = chart.data
            return (d.labels as string[]).map((label, i) => {
              const value = (d.datasets[0].data[i] as number)
              const pct = ((value / total) * 100).toFixed(1)
              return {
                text: `${label} (${value}건, ${pct}%)`,
                fillStyle: (d.datasets[0].backgroundColor as string[])[i],
                hidden: false,
                index: i,
              }
            })
          },
        },
      },
      tooltip: {
        callbacks: {
          label: ctx => {
            const value = ctx.parsed
            const pct = ((value / total) * 100).toFixed(1)
            return `${ctx.label}: ${value}건 (${pct}%)`
          },
        },
      },
    },
  }

  return (
    <div className="h-full w-full bg-white rounded-lg shadow-sm p-2">
      <Pie data={chartData} options={options} />
    </div>
  )
}
