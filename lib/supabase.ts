import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type ClinicRow = {
  id: number
  license_date: string | null
  name: string
  address: string | null
  specialty: string | null
  region1: string | null
  region2: string | null
  year_group: string | null
}
