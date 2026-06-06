import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/mr/pie-data?year=2024&month=&facilityType=의원
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year         = searchParams.get('year') ?? ''
  const month        = searchParams.get('month') ?? ''
  const facilityType = searchParams.get('facilityType') ?? '의원'

  if (!year) return NextResponse.json([])

  const { data, error } = await supabase.rpc('mr_pie_data', {
    p_year:          year,
    p_month:         month,
    p_facility_type: facilityType,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
