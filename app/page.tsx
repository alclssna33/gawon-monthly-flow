'use client'

import { useState, useCallback, useEffect } from 'react'
import Sidebar, { type SidebarFilters } from './components/Sidebar'
import ChartNational from './components/ChartNational'
import ChartDetail from './components/ChartDetail'
import ChartPie from './components/ChartPie'
import ChartStackedArea from './components/ChartStackedArea'
import ChartYoY from './components/ChartYoY'

type FlowRow = { date: string; region1: string; count: number }
type PieRow = { specialty: string; count: number }
type RankingsData = {
  regions: { region1: string; count: number }[]
  specialties: { specialty: string; count: number }[]
}
type SpecialtyFlowRow = { date: string; specialty: string; count: number }

const FACILITY_TYPES = ['의원', '한의원', '치과의원'] as const
type FacilityType = typeof FACILITY_TYPES[number]

export default function Dashboard() {
  const [filters, setFilters] = useState<SidebarFilters>({
    specialty: '전체',
    years: 3,
    pieYear: '',
    pieMonth: '',
  })

  const [facilityType, setFacilityType] = useState<FacilityType>('의원')

  const [flowData, setFlowData] = useState<FlowRow[]>([])
  const [closureFlowMonthly, setClosureFlowMonthly] = useState<FlowRow[]>([])
  const [pieData, setPieData] = useState<PieRow[]>([])
  const [yoyTrend,         setYoyTrend]         = useState<{year:number;count:number}[]>([])
  const [yoyByRegion,      setYoyByRegion]      = useState<{region1:string;this_period:number;prev_period:number;yoy_pct:number|null}[]>([])
  const [yoyBySpecialty,   setYoyBySpecialty]   = useState<{specialty:string;this_period:number;prev_period:number;yoy_pct:number|null}[]>([])
  const [yoyClosureTrend,  setYoyClosureTrend]  = useState<{year:number;count:number}[]>([])
  const [yoyClosureRegion, setYoyClosureRegion] = useState<{region1:string;this_period:number;prev_period:number;yoy_pct:number|null}[]>([])
  const [yoyClosureSpec,   setYoyClosureSpec]   = useState<{specialty:string;this_period:number;prev_period:number;yoy_pct:number|null}[]>([])
  const [specialtyFlowData, setSpecialtyFlowData] = useState<SpecialtyFlowRow[]>([])
  const [closureFlowData, setClosureFlowData] = useState<SpecialtyFlowRow[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])
  const [months, setMonths] = useState<string[]>([])
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [detailRegion, setDetailRegion] = useState('전국')
  const [loaded, setLoaded] = useState(false)
  const [graph4Region, setGraph4Region] = useState('')
  const [regionPanelLoading, setRegionPanelLoading] = useState(false)

  // ── 메인 데이터 로드 (mogaha_registry 기반) ─────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const ft = facilityType
      const baseParams = new URLSearchParams({
        years:        String(filters.years),
        facilityType: ft,
      })
      const flowParams = new URLSearchParams({
        years:        String(filters.years),
        specialty:    filters.specialty,
        facilityType: ft,
      })
      const g4Params = new URLSearchParams({
        years:        String(filters.years),
        facilityType: ft,
        region1:      graph4Region,
      })

      const yoyBaseParams = new URLSearchParams({ facilityType: ft })
      const yoyTrendParams = new URLSearchParams({
        facilityType: ft,
        region1:   graph4Region,
        specialty: filters.specialty,
      })
      const yoyRegionParams = new URLSearchParams({ facilityType: ft, specialty: filters.specialty })
      const yoySpecParams   = new URLSearchParams({ facilityType: ft, region1: graph4Region })

      const [flowRes, closureMonthlyRes, specFlowRes, closureFlowRes,
             trendRes, yoyRegionRes, yoySpecRes,
             closureTrendRes, yoyClosureRegionRes, yoyClosureSpecRes] = await Promise.all([
        fetch(`/api/mr/monthly-flow?${flowParams}`),
        fetch(`/api/mr/monthly-closure-flow?${flowParams}`),
        fetch(`/api/mr/specialty-flow?${g4Params}`),
        fetch(`/api/mr/closure-flow?${g4Params}`),
        fetch(`/api/mr/yearly-trend?${yoyTrendParams}`),
        fetch(`/api/mr/yoy-by-region?${yoyRegionParams}`),
        fetch(`/api/mr/yoy-by-specialty?${yoySpecParams}`),
        fetch(`/api/mr/yearly-closure-trend?${yoyTrendParams}`),
        fetch(`/api/mr/yoy-closure-by-region?${yoyRegionParams}`),
        fetch(`/api/mr/yoy-closure-by-specialty?${yoySpecParams}`),
      ])
      void yoyBaseParams

      const flow: FlowRow[] = await flowRes.json()
      setFlowData(flow)

      const closureMonthly: FlowRow[] = await closureMonthlyRes.json()
      setClosureFlowMonthly(closureMonthly)

      const allMonths = [...new Set(flow.map(r => r.date))].sort()
      setMonths(allMonths)
      setAvailableYears([...new Set(allMonths.map(m => m.slice(0, 4)))].sort((a, b) => +b - +a))

      const specFlow: SpecialtyFlowRow[] = await specFlowRes.json()
      setSpecialtyFlowData(specFlow)
      setSpecialties([...new Set(specFlow.map(r => r.specialty))].sort())

      const closureFlow: SpecialtyFlowRow[] = await closureFlowRes.json()
      setClosureFlowData(closureFlow)

      setYoyTrend(await trendRes.json())
      setYoyByRegion(await yoyRegionRes.json())
      setYoyBySpecialty(await yoySpecRes.json())
      setYoyClosureTrend(await closureTrendRes.json())
      setYoyClosureRegion(await yoyClosureRegionRes.json())
      setYoyClosureSpec(await yoyClosureSpecRes.json())

      setDetailRegion('전국')
      setLoaded(true)
    } catch (e) {
      console.error(e)
      alert('데이터 로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [filters, facilityType])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── 지역 변경 시 Graph 4/5 재로드 (로딩 표시 동기화) ─────
  const [graph4Loading, setGraph4Loading] = useState(false)
  const [graph5Loading, setGraph5Loading] = useState(false)
  useEffect(() => {
    setRegionPanelLoading(graph4Loading || graph5Loading)
  }, [graph4Loading, graph5Loading])

  // ── Graph 4: 지역 변경 시 재로드 ─────────────────────────
  useEffect(() => {
    if (!loaded) return
    const p = new URLSearchParams({
      years: String(filters.years), facilityType, region1: graph4Region,
    })
    setGraph4Loading(true)
    Promise.all([
      fetch(`/api/mr/specialty-flow?${p}`).then(r => r.json()),
      fetch(`/api/mr/closure-flow?${p}`).then(r => r.json()),
    ]).then(([open, close]) => {
      setSpecialtyFlowData(open)
      setClosureFlowData(close)
      setSpecialties([...new Set((open as SpecialtyFlowRow[]).map(r => r.specialty))].sort())
    }).catch(console.error)
      .finally(() => setGraph4Loading(false))
  }, [graph4Region])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Graph 5: 지역 변경 시 YoY 재로드 ─────────────────────
  useEffect(() => {
    if (!loaded) return
    const ft = facilityType
    const trendP  = new URLSearchParams({ facilityType: ft, region1: graph4Region, specialty: filters.specialty })
    const specP   = new URLSearchParams({ facilityType: ft, region1: graph4Region })
    setGraph5Loading(true)
    Promise.all([
      fetch(`/api/mr/yearly-trend?${trendP}`).then(r => r.json()),
      fetch(`/api/mr/yoy-by-specialty?${specP}`).then(r => r.json()),
      fetch(`/api/mr/yearly-closure-trend?${trendP}`).then(r => r.json()),
      fetch(`/api/mr/yoy-closure-by-specialty?${specP}`).then(r => r.json()),
    ]).then(([trend, spec, closureTrend, closureSpec]) => {
      setYoyTrend(trend)
      setYoyBySpecialty(spec)
      setYoyClosureTrend(closureTrend)
      setYoyClosureSpec(closureSpec)
    }).catch(console.error)
      .finally(() => setGraph5Loading(false))
  }, [detailRegion, graph4Region])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Graph 3: pieYear/pieMonth 변경 시 자동 fetch ─────────
  useEffect(() => {
    if (!filters.pieYear) { setPieData([]); return }
    const p = new URLSearchParams({ year: filters.pieYear, facilityType })
    if (filters.pieMonth) p.set('month', filters.pieMonth)
    fetch(`/api/mr/pie-data?${p}`)
      .then(r => r.json())
      .then((d: PieRow[]) => setPieData(d))
      .catch(console.error)
  }, [filters.pieYear, filters.pieMonth, facilityType])

  // ── availableMonths 업데이트 ─────────────────────────────
  useEffect(() => {
    if (!filters.pieYear || !flowData.length) { setAvailableMonths([]); return }
    const ms = [...new Set(
      flowData.filter(r => r.date.startsWith(filters.pieYear)).map(r => r.date.slice(5, 7))
    )].sort()
    setAvailableMonths(ms)
  }, [filters.pieYear, flowData])

  // ── 파생 값 ──────────────────────────────────────────────
  const detailFlowData = detailRegion === '전국'
    ? flowData
    : flowData.filter(r => r.region1 === detailRegion)

  const detailClosureData = detailRegion === '전국'
    ? closureFlowMonthly
    : closureFlowMonthly.filter(r => r.region1 === detailRegion)

  const ftLabel = facilityType
  const subtitleText = `(${filters.specialty === '전체' ? '전체' : filters.specialty}, 최근 ${filters.years}년, ${ftLabel})`
  const pieSubtitle = filters.pieYear
    ? `(${filters.pieYear}년${filters.pieMonth ? ` ${parseInt(filters.pieMonth)}월` : ' 전체'}, 총 ${pieData.reduce((s, r) => s + r.count, 0)}건, ${ftLabel})`
    : ''

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" }}>
      <Sidebar
        filters={filters}
        availableYears={availableYears}
        availableMonths={availableMonths}
        loading={loading}
        onChange={setFilters}
        onLoad={loadData}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">

        {/* 기관 종류 선택 바 */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-sm text-gray-500 font-medium">기관 종류:</span>
          {FACILITY_TYPES.map(ft => (
            <button
              key={ft}
              onClick={() => { setFacilityType(ft); setLoaded(false) }}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                facilityType === ft
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {ft}
            </button>
          ))}
          {loaded && (
            <span className="ml-2 text-xs text-gray-400">
              ※ 기관 변경 후 데이터 불러오기 버튼을 눌러주세요
            </span>
          )}
        </div>

        {/* Graph 1: 지역별 개원 흐름 */}
        <div className="h-[55%] min-h-[400px] p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-700 mb-2">
            📊 지역별 개원 흐름{' '}
            <span className="text-sm font-normal text-gray-500">{subtitleText}</span>
          </h2>
          <div className="relative h-[calc(100%-2.5rem)]">
            {loaded ? (
              <ChartNational
                data={flowData}
                months={months}
                specialty={filters.specialty}
                onRegionClick={r => {
                  setDetailRegion(r)
                  setGraph4Region(r === '전국' ? '' : r)
                }}
              />
            ) : (
              <div className="h-full bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-400 text-sm">
                데이터 불러오기 버튼을 눌러주세요.
              </div>
            )}
          </div>
        </div>

        {/* Graph 2: 상세 지역 흐름 */}
        <div className="h-[45%] min-h-[350px] p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-700 mb-2">
            📍 상세 지역 흐름{' '}
            <span className="text-sm font-normal text-blue-600 ml-2">
              {detailRegion === '전국' ? '— 상단 그래프에서 지역을 클릭하세요' : `— ${detailRegion}`}
            </span>
          </h2>
          <div className="relative h-[calc(100%-2.5rem)]">
            {loaded ? (
              <ChartDetail
                region={detailRegion}
                data={detailFlowData}
                closeData={detailClosureData}
                months={months}
                specialty={filters.specialty}
                facilityType={facilityType}
                years={filters.years}
              />
            ) : (
              <div className="h-full bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-400 text-sm">
                상단 그래프의 지역 막대를 클릭하면 표시됩니다.
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">* 상단 그래프의 지역 막대를 클릭하면 상세 지역이 표시됩니다.</p>
        </div>

        {/* Graph 3: 파이차트 */}
        <div className="min-h-[500px] p-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-700 mb-2">
            🥧 전공과목별 개원 비율{' '}
            <span className="text-sm font-normal text-gray-500">{pieSubtitle}</span>
          </h2>
          <div className="h-[450px]">
            <ChartPie data={pieData} />
          </div>
        </div>

        {/* Graph 4: 누적 추이 (개원/폐원/Net) */}
        <div className="min-h-[520px] p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-700 mb-2">
            📈 전공과목별 누적 추이{' '}
            <span className="text-sm font-normal text-gray-500">
              {loaded ? `(최근 ${filters.years}년${graph4Region ? ` · ${graph4Region}` : ' · 전국'} · ${ftLabel})` : ''}
            </span>
          </h2>
          <div className="relative h-[460px]">
            {loaded && regionPanelLoading && (
              <div className="absolute inset-0 z-10 bg-white/60 flex items-center justify-center rounded-lg">
                <span className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  지역 데이터 갱신 중...
                </span>
              </div>
            )}
            {loaded ? (
              <ChartStackedArea
                months={months}
                openData={specialtyFlowData}
                closeData={closureFlowData}
                specialties={specialties}
                years={filters.years}
                region1={graph4Region}
                onRegionChange={setGraph4Region}
              />
            ) : (
              <div className="h-full bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-400 text-sm">
                데이터 불러오기 버튼을 눌러주세요.
              </div>
            )}
          </div>
        </div>

        {/* Graph 5: YoY 성장률 */}
        <div className="min-h-[600px] p-4 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-700 mb-2">
            📊 YoY 성장률{' '}
            <span className="text-sm font-normal text-gray-500">
              {loaded
                ? `(${detailRegion === '전국' ? '전국' : detailRegion} · ${filters.specialty} · ${ftLabel})`
                : ''}
            </span>
          </h2>
          <div className="relative h-[560px]">
            {loaded && regionPanelLoading && (
              <div className="absolute inset-0 z-10 bg-white/60 flex items-center justify-center rounded-lg">
                <span className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  지역 데이터 갱신 중...
                </span>
              </div>
            )}
            {loaded ? (
              <ChartYoY
                trendData={yoyTrend}
                byRegion={yoyByRegion}
                bySpecialty={yoyBySpecialty}
                closureTrend={yoyClosureTrend}
                closureByRegion={yoyClosureRegion}
                closureBySpec={yoyClosureSpec}
                selectedRegion={detailRegion === '전국' ? '' : detailRegion}
                selectedSpecialty={filters.specialty}
              />
            ) : (
              <div className="h-full bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-400 text-sm">
                데이터 불러오기 버튼을 눌러주세요.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
