import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { toDisplayName } from '@/lib/specialtyMap'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/specialty-closure-flow?years=3&region1=서울
// 반환: [{ date:"2024-03", specialty:"내과", count:2 }, ...]
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const years   = parseInt(searchParams.get('years') ?? '3')
  const region1 = searchParams.get('region1') ?? ''

  const PAGE = 1000
  const all: { date: string; specialty: string; count: number }[] = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase.rpc('get_specialty_closure_flow', {
      p_years:   years,
      p_region1: region1,
    }).range(offset, offset + PAGE - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }

  const result = all.map(r => ({
    date:      r.date,
    specialty: toDisplayName(r.specialty),
    count:     r.count,
  }))

  return NextResponse.json(result)
}
