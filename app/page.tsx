'use client'

import { useState, useCallback } from 'react'
import Sidebar, { type SidebarFilters } from './components/Sidebar'
import ChartNational from './components/ChartNational'
import ChartDetail from './components/ChartDetail'
import ChartPie from './components/ChartPie'
import ChartStackedArea from './components/ChartStackedArea'
import ChartTopRankings from './components/ChartTopRankings'
import { toDisplayName } from '@/lib/specialtyMap'

type FlowRow = { date: string; region1: string; count: number }
type PieRow = { specialty: string; count: number }
type RankingsData = {
  regions: { region1: string; count: number }[]
  specialties: { specialty: string; count: number }[]
}
type SpecialtyFlowRow = { date: string; specialty: string; count: number }

export default function Dashboard() {
  const [filters, setFilters] = useState<SidebarFilters>({
    region: '전국',
    specialty: '전체',
    years: 3,
    pieYear: '',
    pieMonth: '',
  })

  const [flowData, setFlowData] = useState<FlowRow[]>([])
  const [pieData, setPieData] = useState<PieRow[]>([])
  const [rankingsData, setRankingsData] = useState<RankingsData | null>(null)
  const [specialtyFlowData, setSpecialtyFlowData] = useState<SpecialtyFlowRow[]>([])
  const [specialties, setSpecialties] = useState<string[]>([])
  const [months, setMonths] = useState<string[]>([])
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [detailRegion, setDetailRegion] = useState('전국')
  const [loaded, setLoaded] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        years: String(filters.years),
        specialty: filters.specialty,
      })

      // Graph 1, 2: 지역별 월별 집계
      const flowRes = await fetch(`/api/monthly-flow?${params}`)
      const flow: FlowRow[] = await flowRes.json()
      setFlowData(flow)

      // 월 목록 추출 (정렬)
      const allMonths = [...new Set(flow.map(r => r.date))].sort()
      setMonths(allMonths)

      // 파이차트용 연도 목록
      const years = [...new Set(allMonths.map(m => m.slice(0, 4)))].sort((a, b) => +b - +a)
      setAvailableYears(years)

      // Graph 4: 과목별 누적 추이
      const [specFlowRes, rankRes] = await Promise.all([
        fetch(`/api/specialty-flow?years=${filters.years}`),
        fetch(`/api/top-rankings?years=${filters.years}`),
      ])
      const specFlow: SpecialtyFlowRow[] = await specFlowRes.json()
      setSpecialtyFlowData(specFlow)
      const foundSpecialties = [...new Set(specFlow.map(r => r.specialty))].sort()
      setSpecialties(foundSpecialties)

      // Graph 5: TOP 10
      const rankings: RankingsData = await rankRes.json()
      setRankingsData(rankings)

      setDetailRegion(filters.region)
      setLoaded(true)
    } catch (e) {
      console.error(e)
      alert('데이터 로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const loadPieData = useCallback(async () => {
    if (!filters.pieYear) { setPieData([]); return }
    const params = new URLSearchParams({ year: filters.pieYear })
    if (filters.pieMonth) params.set('month', filters.pieMonth)
    const res = await fetch(`/api/pie-data?${params}`)
    const data: PieRow[] = await res.json()
    setPieData(data)

    if (filters.pieYear && !filters.pieMonth) {
      // 월 목록 업데이트
      const months = [...new Set(
        flowData.filter(r => r.date.startsWith(filters.pieYear)).map(r => r.date.slice(5, 7))
      )].sort()
      setAvailableMonths(months)
    }
  }, [filters.pieYear, filters.pieMonth, flowData])

  // Graph 2용: 선택된 region의 flow 데이터만 필터
  const detailFlowData = detailRegion === '전국'
    ? flowData
    : flowData.filter(r => r.region1 === detailRegion)

  const subtitleText = `(${filters.specialty === '전체' ? '전체' : filters.specialty}, 최근 ${filters.years}년)`
  const pieSubtitle = filters.pieYear
    ? `(${filters.pieYear}년${filters.pieMonth ? ` ${parseInt(filters.pieMonth)}월` : ' 전체'}, 총 ${pieData.reduce((s, r) => s + r.count, 0)}건)`
    : ''

  const topRegions = (rankingsData?.regions ?? []).map(r => ({ label: r.region1, count: r.count }))
  const topSpecialties = (rankingsData?.specialties ?? []).map(r => ({ label: toDisplayName(r.specialty), count: r.count }))

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" }}>
      <Sidebar
        filters={filters}
        availableYears={availableYears}
        availableMonths={availableMonths}
        loading={loading}
        onChange={setFilters}
        onLoad={loadData}
        onPieChange={loadPieData}
      />

      <div className="flex-1 flex flex-col overflow-y-auto">

        {/* Graph 1: 지역별 개원 흐름 */}
        <div className="h-[55%] min-h-[400px] p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-700 mb-2">
            📊 지역별 개원 흐름 (전국){' '}
            <span className="text-sm font-normal text-gray-500">{subtitleText}</span>
          </h2>
          <div className="relative h-[calc(100%-2.5rem)]">
            {loaded ? (
              <ChartNational
                data={flowData}
                months={months}
                specialty={filters.specialty}
                onRegionClick={r => setDetailRegion(r)}
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
            <span className="text-sm font-normal text-blue-600 ml-2">- {detailRegion}</span>
          </h2>
          <div className="relative h-[calc(100%-2.5rem)]">
            {loaded ? (
              <ChartDetail
                region={detailRegion}
                data={detailFlowData}
                months={months}
                specialty={filters.specialty}
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

        {/* Graph 4: 누적 추이 */}
        <div className="min-h-[500px] p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-700 mb-2">
            📈 전공과목별 누적 개원 수 추이{' '}
            <span className="text-sm font-normal text-gray-500">
              {loaded ? `(최근 ${filters.years}년, 누적 개원 수)` : ''}
            </span>
          </h2>
          <div className="h-[450px]">
            {loaded ? (
              <ChartStackedArea
                data={flowData}
                months={months}
                specialtyData={specialtyFlowData}
                specialties={specialties}
              />
            ) : (
              <div className="h-full bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-400 text-sm">
                데이터 불러오기 버튼을 눌러주세요.
              </div>
            )}
          </div>
        </div>

        {/* Graph 5: TOP 10 */}
        <div className="min-h-[600px] p-4 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-700 mb-2">
            🏆 상위 랭킹{' '}
            <span className="text-sm font-normal text-gray-500">
              {loaded ? `(최근 ${filters.years}년 기준)` : ''}
            </span>
          </h2>
          {loaded && rankingsData ? (
            <div className="grid grid-cols-2 gap-4">
              <ChartTopRankings title="📍 지역 TOP 10" items={topRegions} colorOffset={0} />
              <ChartTopRankings title="🏥 전공과목 TOP 10" items={topSpecialties} colorOffset={5} />
            </div>
          ) : (
            <div className="h-48 bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-400 text-sm">
              데이터 불러오기 버튼을 눌러주세요.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
