import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type TransferRow = {
  open_date: string
  close_date: string
  open_name: string
  close_name: string
  address: string
  region1: string | null
  region2: string | null
  days: number
  specialty: string | null
}

// GET /api/transfers?years=3
export async function GET(req: NextRequest) {
  const years = parseInt(req.nextUrl.searchParams.get('years') ?? '3')

  const { data, error } = await supabase.rpc('get_transfers', { p_years: years })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
