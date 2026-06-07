import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const facilityType = searchParams.get('facilityType') ?? '의원'
  const region1      = searchParams.get('region1') ?? ''

  const { data, error } = await supabase.rpc('mr_yoy_closure_by_specialty', {
    p_facility_type: facilityType,
    p_region1:       region1,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
