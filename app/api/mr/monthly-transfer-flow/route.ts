import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { toDbName } from '@/lib/specialtyMap'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/mr/monthly-transfer-flow?years=3&facilityType=의원&specialty=전체&region1=서울
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const years        = parseInt(searchParams.get('years') ?? '3')
  const facilityType = searchParams.get('facilityType') ?? '의원'
  const specialty    = searchParams.get('specialty') ?? ''
  const region1      = searchParams.get('region1') ?? ''

  const PAGE = 1000
  const all: unknown[] = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase.rpc('mr_monthly_transfer_flow', {
      p_years:         years,
      p_facility_type: facilityType,
      p_specialty:     specialty === '전체' ? '' : toDbName(specialty),
      p_region1:       region1,
    }).range(offset, offset + PAGE - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }
  return NextResponse.json(all)
}
