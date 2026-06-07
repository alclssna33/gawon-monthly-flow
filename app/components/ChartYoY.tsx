'use client'

import {
  Chart as ChartJS, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend,
  type ChartData, type ChartOptions,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { toDisplayName } from '@/lib/specialtyMap'

ChartJS.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

type TrendRow   = { year: number; count: number }
type RegionRow  = { region1: string;  this_period: number; prev_period: number; yoy_pct: number | null }
type SpecRow    = { specialty: string; this_period: number; prev_period: number; yoy_pct: number | null }

type Props = {
  trendData:   TrendRow[]
  byRegion:    RegionRow[]
  bySpecialty: SpecRow[]
  selectedRegion:    string  // '' = 전국
  selectedSpecialty: string  // 표시명
}

function yoyColor(v: number | null, highlight = false) {
  const a = highlight ? 1 : 0.7
  if (v === null || v === 0) return `rgba(156,163,175,${a})`
  return v > 0 ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})`
}

// 연도별 YoY 계산 (count 배열에서) — 현재 연도는 제외 (불완전)
function calcYoY(trend: TrendRow[]): { year: number; yoy: number | null }[] {
  const currentYear = new Date().getFullYear()
  return trend
    .filter(row => row.year < currentYear)
    .map((row, i, filtered) => {
      if (i === 0) return { year: row.year, yoy: null }
      const prev = filtered[i - 1].count
      if (!prev) return { year: row.year, yoy: null }
      return { year: row.year, yoy: Math.round((row.count - prev) / prev * 1000) / 10 }
    })
    .filter(r => r.yoy !== null)
}

export default function ChartYoY({
  trendData, byRegion, bySpecialty, selectedRegion, selectedSpecialty,
}: Props) {
  // ── 패널 1: YoY 흐름 (라인) ─────────────────────────────
  const yoyTrend = calcYoY(trendData)
  const trendLabels = yoyTrend.map(r => String(r.year))
  const trendValues = yoyTrend.map(r => r.yoy as number)

  const trendData_: ChartData<'line'> = {
    labels: trendLabels,
    datasets: [{
      label: 'YoY(%)',
      data: trendValues,
      borderColor: 'rgba(59,130,246,0.9)',
      backgroundColor: trendValues.map(v => v >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'),
      pointBackgroundColor: trendValues.map(v => v >= 0 ? 'rgba(34,197,94,1)' : 'rgba(239,68,68,1)'),
      pointRadius: 5,
      fill: false,
      tension: 0.3,
    }],
  }
  const trendOpts: ChartOptions<'line'> = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => `YoY: ${(ctx.parsed.y ?? 0) >= 0 ? '+' : ''}${ctx.parsed.y ?? 0}%` } },
    },
    scales: {
      x: { ticks: { font: { size: 11 } } },
      y: {
        ticks: { callback: v => `${Number(v) >= 0 ? '+' : ''}${v}%`, font: { size: 10 } },
        grid: { color: ctx => ctx.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)' },
      },
    },
  }

  // ── 패널 2: 지역별 YoY (횡막대) ─────────────────────────
  const rLabels = byRegion.map(r => r.region1)
  const rValues = byRegion.map(r => r.yoy_pct ?? 0)
  const rHighlight = selectedRegion ? rLabels.indexOf(selectedRegion) : -1

  const regionData: ChartData<'bar'> = {
    labels: rLabels,
    datasets: [{
      label: 'YoY(%)',
      data: rValues,
      backgroundColor: byRegion.map((r, i) => yoyColor(r.yoy_pct, i === rHighlight)),
      borderColor: byRegion.map((_, i) => i === rHighlight ? 'rgba(0,0,0,0.7)' : 'transparent'),
      borderWidth: byRegion.map((_, i) => i === rHighlight ? 2 : 0) as number[],
    }],
  }
  const regionOpts: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const row = byRegion[ctx.dataIndex]
            return `YoY: ${(ctx.parsed.x ?? 0) >= 0 ? '+' : ''}${ctx.parsed.x ?? 0}% (전전년 ${row.prev_period}건→전년 ${row.this_period}건)`
          },
        },
      },
    },
    scales: {
      x: { ticks: { callback: v => `${Number(v) >= 0 ? '+' : ''}${v}%`, font: { size: 9 } } },
      y: { ticks: { font: { size: 10 } } },
    },
  }

  // ── 패널 3: 과목별 YoY (횡막대) ─────────────────────────
  const sLabels = bySpecialty.map(r => toDisplayName(r.specialty))
  const sValues = bySpecialty.map(r => r.yoy_pct ?? 0)
  const sHighlight = selectedSpecialty && selectedSpecialty !== '전체'
    ? sLabels.indexOf(selectedSpecialty) : -1

  const specData: ChartData<'bar'> = {
    labels: sLabels,
    datasets: [{
      label: 'YoY(%)',
      data: sValues,
      backgroundColor: bySpecialty.map((r, i) => yoyColor(r.yoy_pct, i === sHighlight)),
      borderColor: bySpecialty.map((_, i) => i === sHighlight ? 'rgba(0,0,0,0.7)' : 'transparent'),
      borderWidth: bySpecialty.map((_, i) => i === sHighlight ? 2 : 0) as number[],
    }],
  }
  const specOpts: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => {
            const row = bySpecialty[ctx.dataIndex]
            return `YoY: ${(ctx.parsed.x ?? 0) >= 0 ? '+' : ''}${ctx.parsed.x ?? 0}% (전전년 ${row.prev_period}건→전년 ${row.this_period}건)`
          },
        },
      },
    },
    scales: {
      x: { ticks: { callback: v => `${Number(v) >= 0 ? '+' : ''}${v}%`, font: { size: 9 } } },
      y: { ticks: { font: { size: 10 } } },
    },
  }

  const regionLabel = selectedRegion || '전국'
  const specLabel   = selectedSpecialty && selectedSpecialty !== '전체' ? selectedSpecialty : '전체 과목'

  return (
    <div className="h-full w-full bg-white rounded-lg shadow-sm p-3 flex flex-col gap-2">
      {/* 범례 */}
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block"/>증가</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block"/>감소</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-300 inline-block"/>데이터 없음</span>
        <span className="ml-auto text-gray-400">★ = 선택 항목 강조</span>
      </div>

      {/* 패널 1: YoY 흐름 */}
      <div className="flex-none" style={{ height: '38%' }}>
        <p className="text-xs font-semibold text-gray-600 mb-1">
          📈 YoY 흐름 — {regionLabel} · {specLabel}
          <span className="font-normal text-gray-400 ml-2">(전년 대비 성장률)</span>
        </p>
        {yoyTrend.length > 0 ? (
          <div className="h-[calc(100%-1.5rem)]">
            <Line data={trendData_} options={trendOpts} />
          </div>
        ) : (
          <div className="h-[calc(100%-1.5rem)] flex items-center justify-center text-gray-400 text-sm">
            데이터 없음 — 지역/과목을 선택하세요
          </div>
        )}
      </div>

      {/* 패널 2+3: 비교 */}
      <div className="flex flex-1 gap-3 min-h-0">
        <div className="flex-1 min-h-0 flex flex-col">
          <p className="text-xs font-semibold text-gray-600 mb-1">
            🗺️ 지역별 YoY — {specLabel}
            <span className="font-normal text-gray-400 ml-1">(전년도 전체 vs 전전년도 전체)</span>
          </p>
          <div className="flex-1 min-h-0">
            <Bar data={regionData} options={regionOpts} />
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          <p className="text-xs font-semibold text-gray-600 mb-1">
            🏥 과목별 YoY — {regionLabel}
            <span className="font-normal text-gray-400 ml-1">(전년도 전체 vs 전전년도 전체)</span>
          </p>
          <div className="flex-1 min-h-0">
            <Bar data={specData} options={specOpts} />
          </div>
        </div>
      </div>
    </div>
  )
}
