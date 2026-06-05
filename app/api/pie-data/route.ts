import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { toDisplayName } from '@/lib/specialtyMap'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/pie-data?year=2024&month=03
// 반환: [{ specialty:"내과", count:35 }, ...] (count 내림차순)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year')
  const month = searchParams.get('month') ?? ''

  if (!year) return NextResponse.json([])

  const { data, error } = await supabase.rpc('get_pie_data', {
    p_year: year,
    p_month: month,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (data ?? []).map((r: { specialty: string; count: number }) => ({
    specialty: toDisplayName(r.specialty),
    count: Number(r.count),
  }))

  return NextResponse.json(result)
}
