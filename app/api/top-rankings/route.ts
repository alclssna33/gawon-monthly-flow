import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { toDisplayName } from '@/lib/specialtyMap'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/top-rankings?years=3
// 반환: { regions: [{region1, count}], specialties: [{specialty, count}] }
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const years = parseInt(searchParams.get('years') ?? '3')

  const { data, error } = await supabase.rpc('get_top_rankings', { p_years: years })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // region1별 합산
  const regionCounts: Record<string, number> = {}
  const specialtyCounts: Record<string, number> = {}

  for (const row of data ?? []) {
    if (row.region1) regionCounts[row.region1] = (regionCounts[row.region1] ?? 0) + Number(row.count)
    if (row.specialty) {
      const d = toDisplayName(row.specialty)
      specialtyCounts[d] = (specialtyCounts[d] ?? 0) + Number(row.count)
    }
  }

  const regions = Object.entries(regionCounts)
    .map(([region1, count]) => ({ region1, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10)

  const specialties = Object.entries(specialtyCounts)
    .map(([specialty, count]) => ({ specialty, count }))
    .sort((a, b) => b.count - a.count).slice(0, 10)

  return NextResponse.json({ regions, specialties })
}
