import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/mr/top-rankings?years=3&facilityType=의원
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const years        = parseInt(searchParams.get('years') ?? '3')
  const facilityType = searchParams.get('facilityType') ?? '의원'

  const { data, error } = await supabase.rpc('mr_top_rankings', {
    p_years:         years,
    p_facility_type: facilityType,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as { region1: string; specialty: string; count: number }[]

  const regionMap = new Map<string, number>()
  const specMap   = new Map<string, number>()
  for (const r of rows) {
    regionMap.set(r.region1, (regionMap.get(r.region1) ?? 0) + r.count)
    specMap.set(r.specialty, (specMap.get(r.specialty) ?? 0) + r.count)
  }

  const regions = [...regionMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([region1, count]) => ({ region1, count }))

  const specialties = [...specMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([specialty, count]) => ({ specialty, count }))

  return NextResponse.json({ regions, specialties })
}
