import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { toDbName } from '@/lib/specialtyMap'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET /api/monthly-flow?years=3&specialty=전체
// 반환: [{ date:"2024-03", region1:"서울", count:5 }, ...]
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const years = parseInt(searchParams.get('years') ?? '3')
  const specialtyDisplay = searchParams.get('specialty') ?? '전체'

  // '전체'는 DB 함수에 그대로 전달, 특정 과목은 DB명으로 변환
  const specialtyDb = specialtyDisplay === '전체' ? '전체' : toDbName(specialtyDisplay)

  // RPC 기본 limit=1000 우회: 페이지네이션으로 전체 수집
  const PAGE = 1000
  const all: unknown[] = []
  let offset = 0
  while (true) {
    const { data, error } = await supabase.rpc('get_monthly_flow', {
      p_years: years,
      p_specialty: specialtyDb,
    }).range(offset, offset + PAGE - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE) break
    offset += PAGE
  }

  return NextResponse.json(all)
}
