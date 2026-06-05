// clinics DB의 specialty → 화면 표시명 매핑
export const SPECIALTY_DISPLAY: Record<string, string> = {
  '통증관련': '정형통증유관',
  '비뇨기과': '비뇨의학과',
}

export const SPECIALTY_DB: Record<string, string> = {
  '정형통증유관': '통증관련',
  '비뇨의학과': '비뇨기과',
}

// 집계에서 제외할 specialty
export const EXCLUDED_SPECIALTIES = ['치과', '병원']

// 사이드바 표시 순서 (화면 표시명 기준)
export const SPECIALTY_ORDER = [
  '전체',
  '정형통증유관',
  '가정의학과',
  '내과',
  '비뇨의학과',
  '산부인과',
  '성형외과',
  '소아청소년과',
  '안과',
  '이비인후과',
  '정신과',
  '피부과',
  '외과',
  '일반의',
]

export function toDisplayName(dbName: string): string {
  return SPECIALTY_DISPLAY[dbName] ?? dbName
}

export function toDbName(displayName: string): string {
  return SPECIALTY_DB[displayName] ?? displayName
}
