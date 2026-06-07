'use client'

import { useState } from 'react'
import {
  Chart as ChartJS, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend,
  type ChartData, type ChartOptions,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { toDisplayName } from '@/lib/specialtyMap'

ChartJS.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

type TrendRow  = { year: number; count: number }
type RegionRow = { region1: string;  this_period: number; prev_period: number; yoy_pct: number | null }
type SpecRow   = { specialty: string; this_period: number; prev_period: number; yoy_pct: number | null }
type TabMode   = 'open' | 'close'

type Props = {
  // 개원
  trendData:        TrendRow[]
  byRegion:         RegionRow[]
  bySpecialty:      SpecRow[]
  // 폐원
  closureTrend:     TrendRow[]
  closureByRegion:  RegionRow[]
  closureBySpec:    SpecRow[]
  selectedRegion:    string
  selectedSpecialty: string
}

function yoyColor(v: number | null, highlight = false) {
  const a = highlight ? 1 : 0.7
  if (v === null || v === 0) return `rgba(156,163,175,${a})`
  return v > 0 ? `rgba(34,197,94,${a})` : `rgba(239,68,68,${a})`
}

function calcYoY(trend: TrendRow[]): { year: number; yoy: number | null }[] {
  const currentYear = new Date().getFullYear()
  return trend
    .filter(row => row.year < currentYear)
    .map((row, i, arr) => {
      if (i === 0) return { year: row.year, yoy: null }
      const prev = arr[i - 1].count
      if (!prev) return { year: row.year, yoy: null }
      return { year: row.year, yoy: Math.round((row.count - prev) / prev * 1000) / 10 }
    })
    .filter(r => r.yoy !== null)
}

function makeTrendChart(yoyTrend: { year: number; yoy: number | null }[]): {
  data: ChartData<'line'>; options: ChartOptions<'line'>
} {
  const labels = yoyTrend.map(r => String(r.year))
  const values = yoyTrend.map(r => r.yoy as number)
  return {
    data: {
      labels,
      datasets: [{
        label: 'YoY(%)',
        data: values,
        borderColor: 'rgba(59,130,246,0.9)',
        backgroundColor: values.map(v => v >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'),
        pointBackgroundColor: values.map(v => v >= 0 ? 'rgba(34,197,94,1)' : 'rgba(239,68,68,1)'),
        pointRadius: 5, fill: false, tension: 0.3,
      }],
    },
    options: {
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
    },
  }
}

function makeBarChart(
  rows: (RegionRow | SpecRow)[],
  getLabel: (r: RegionRow | SpecRow) => string,
  highlight: number,
): { data: ChartData<'bar'>; options: ChartOptions<'bar'> } {
  const labels = rows.map(getLabel)
  const values = rows.map(r => r.yoy_pct ?? 0)
  return {
    data: {
      labels,
      datasets: [{
        label: 'YoY(%)',
        data: values,
        backgroundColor: rows.map((r, i) => yoyColor(r.yoy_pct, i === highlight)),
        borderColor: rows.map((_, i) => i === highlight ? 'rgba(0,0,0,0.7)' : 'transparent'),
        borderWidth: rows.map((_, i) => i === highlight ? 2 : 0) as number[],
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const row = rows[ctx.dataIndex]
              return `YoY: ${(ctx.parsed.x ?? 0) >= 0 ? '+' : ''}${ctx.parsed.x ?? 0}% (전전년 ${row.prev_period}건→전년 ${row.this_period}건)`
            },
          },
        },
      },
      scales: {
        x: { ticks: { callback: v => `${Number(v) >= 0 ? '+' : ''}${v}%`, font: { size: 9 } } },
        y: { ticks: { font: { size: 10 } } },
      },
    },
  }
}

export default function ChartYoY({
  trendData, byRegion, bySpecialty,
  closureTrend, closureByRegion, closureBySpec,
  selectedRegion, selectedSpecialty,
}: Props) {
  const [tab, setTab] = useState<TabMode>('open')

  const regionLabel = selectedRegion || '전국'
  const specLabel   = selectedSpecialty && selectedSpecialty !== '전체' ? selectedSpecialty : '전체 과목'

  // 현재 탭 데이터 선택
  const activeTrend     = tab === 'open' ? trendData    : closureTrend
  const activeByRegion  = tab === 'open' ? byRegion     : closureByRegion
  const activeBySpec    = tab === 'open' ? bySpecialty  : closureBySpec

  const yoyTrend = calcYoY(activeTrend)
  const { data: trendChartData, options: trendOpts } = makeTrendChart(yoyTrend)

  const rHighlight = selectedRegion ? activeByRegion.findIndex(r => (r as RegionRow).region1 === selectedRegion) : -1
  const sHighlight = selectedSpecialty && selectedSpecialty !== '전체'
    ? activeBySpec.findIndex(r => toDisplayName((r as SpecRow).specialty) === selectedSpecialty) : -1

  const { data: rData, options: rOpts } = makeBarChart(activeByRegion, r => (r as RegionRow).region1, rHighlight)
  const { data: sData, options: sOpts } = makeBarChart(activeBySpec, r => toDisplayName((r as SpecRow).specialty), sHighlight)

  const tabLabel = tab === 'open' ? '개원' : '폐원'

  return (
    <div className="h-full w-full bg-white rounded-lg shadow-sm p-3 flex flex-col gap-2">
      {/* 탭 + 범례 */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {(['open', 'close'] as TabMode[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-0.5 rounded text-xs font-semibold transition-colors ${
                tab === t
                  ? t === 'open' ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'open' ? '개원' : '폐원'} YoY
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 ml-2">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block"/>증가</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-400 inline-block"/>감소</span>
        </div>
      </div>

      {/* 패널 1: YoY 흐름 */}
      <div className="flex-none" style={{ height: '38%' }}>
        <p className="text-xs font-semibold text-gray-600 mb-1">
          📈 {tabLabel} YoY 흐름 — {regionLabel} · {specLabel}
          <span className="font-normal text-gray-400 ml-2">(전년 대비 성장률)</span>
        </p>
        {yoyTrend.length > 0 ? (
          <div className="h-[calc(100%-1.5rem)]">
            <Line data={trendChartData} options={trendOpts} />
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
            🗺️ 지역별 {tabLabel} YoY — {specLabel}
            <span className="font-normal text-gray-400 ml-1">(전년도 전체 vs 전전년도 전체)</span>
          </p>
          <div className="flex-1 min-h-0">
            <Bar data={rData} options={rOpts} />
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
          <p className="text-xs font-semibold text-gray-600 mb-1">
            🏥 과목별 {tabLabel} YoY — {regionLabel}
            <span className="font-normal text-gray-400 ml-1">(전년도 전체 vs 전전년도 전체)</span>
          </p>
          <div className="flex-1 min-h-0">
            <Bar data={sData} options={sOpts} />
          </div>
        </div>
      </div>
    </div>
  )
}
