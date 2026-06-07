import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { toDbName } from '@/lib/specialtyMap'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const facilityType = searchParams.get('facilityType') ?? '의원'
  const specialty    = searchParams.get('specialty') ?? ''

  const { data, error } = await supabase.rpc('mr_yoy_closure_by_region', {
    p_facility_type: facilityType,
    p_specialty:     specialty === '전체' ? '' : toDbName(specialty),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
