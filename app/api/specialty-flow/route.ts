import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { toDisplayName } from '@/lib/specialtyMap'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/specialty-flow?years=3
// 반환: [{ date:"2024-03", specialty:"내과", count:5 }, ...]
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const years = parseInt(searchParams.get('years') ?? '3')

  const { data, error } = await supabase.rpc('get_specialty_flow', { p_years: years })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // DB 과목명 → 표시명 변환
  const result = (data ?? []).map((r: { date: string; specialty: string; count: number }) => ({
    date: r.date,
    specialty: toDisplayName(r.specialty),
    count: r.count,
  }))

  return NextResponse.json(result)
}
