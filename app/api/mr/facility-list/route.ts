import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/mr/facility-list?date=2024-03&region1=서울&region2=강남구&specialty=내과&facilityType=의원&mode=open
// mode: open(개원) | close(폐원)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date         = searchParams.get('date') ?? ''
  const region1      = searchParams.get('region1') ?? ''
  const region2      = searchParams.get('region2') ?? ''
  const specialty    = searchParams.get('specialty') ?? ''
  const facilityType = searchParams.get('facilityType') ?? '의원'
  const mode         = searchParams.get('mode') ?? 'open'   // open | close

  if (!date) return NextResponse.json([])

  const dateCol = mode === 'close' ? 'closed_date' : 'license_date'
  const ym = date.slice(0, 7)

  let query = supabase.table('mogaha_registry')
    .select('name, address, specialty, region1, region2, license_date, closed_date, is_closed')
    .gte(dateCol, `${ym}-01`)
    .lte(dateCol, `${ym}-31`)
    .limit(200)

  if (facilityType) query = query.eq('facility_type', facilityType)
  if (region1)      query = query.eq('region1', region1)
  if (region2)      query = query.eq('region2', region2)
  if (specialty)    query = query.eq('specialty', specialty)
  if (mode === 'close') query = query.eq('is_closed', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
