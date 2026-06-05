import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { toDbName } from '@/lib/specialtyMap'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/hospital-list?date=2024-03&region1=서울&region2=강남구&specialty=내과
// 반환: [{ name, address, region1, region2 }, ...]
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')      // YYYY-MM
  const region1 = searchParams.get('region1')
  const region2 = searchParams.get('region2')  // 선택
  const specialtyDisplay = searchParams.get('specialty')  // 선택

  if (!date || !region1) {
    return NextResponse.json([])
  }

  const fromDate = `${date}-01`
  // 월의 실제 마지막 날 계산 (4,6,9,11월=30일, 2월=28/29일, 나머지=31일)
  const [y, m] = date.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate() // new Date(year, month, 0) = 해당월 마지막날
  const toDate = `${date}-${String(lastDay).padStart(2, '0')}`

  let query = supabase
    .from('clinics')
    .select('name, address, region1, region2')
    .gte('license_date', fromDate)
    .lte('license_date', toDate)
    .neq('is_closed', true)
    .order('name')

  if (region1 !== '전국') {
    query = query.eq('region1', region1)
  }
  if (region2) {
    query = query.eq('region2', region2)
  }
  if (specialtyDisplay) {
    query = query.eq('specialty', toDbName(specialtyDisplay))
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
