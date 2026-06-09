# gawon-monthly 프로젝트 가이드

> 마지막 업데이트: 2026-06-09  
> 월별 개원 흐름 웹앱 개선 작업 — 폐원율 시각화 추가

---

## 프로젝트 개요

**gawon-monthly** 는 개원비밀공간 회원들을 위한 월별 개원 흐름 분석 웹앱입니다.

### 기술 스택
| 항목 | 값 |
|------|-----|
| 프로젝트명 | gawon-monthly |
| 호스팅 | Vercel |
| DB | Supabase (auylragkbczepqifagec) |
| 프론트엔드 | Next.js + Chart.js |

---

## 주요 그래프 (5개)

### Graph 1: 지역별 개원 흐름
- **유형**: 막대 차트 (단색 파란색)
- **X축**: 17개 지역
- **Y축**: 개원 건수
- **상호작용**: 지역 클릭 → Graph 2 활성화

### Graph 2: 상세 지역 흐름 ⭐ (2026-06-09 업데이트)
- **유형**: 막대 차트 (탭식)
- **탭 4개**: 
  - `[개원]`: 양수양도(주황) + 신규개원(파랑) 스택
  - `[폐원]`: 폐원 건수 (빨강)
  - `[Net]`: 개원 - 폐원 (양수: 초록, 음수: 빨강)
  - `[폐원율]`: 폐원율(%) = (폐원 / 개원) × 100% **[NEW]**
  
#### 폐원율(폐원율) 탭 상세
```
계산식: 폐원율(%) = (월별 폐원 건수) / (월별 개원 건수) × 100%

색상 코딩 (위험도):
├─ ≤5%   → 초록 (안전)
├─ 5-10% → 파랑 (양호)
├─ 10-20% → 주황 (주의)
└─ >20%  → 빨강 (위험)

Tooltip: "폐원율: X.X% (폐원 Y건 / 개원 Z건)"

개원 0건 처리: 폐원율 = 0% (분모가 0인 경우)
```

### Graph 3: 전공과목별 개원 비율
- **유형**: 파이 차트
- **필터**: 연/월 선택 가능

### Graph 4: 전공과목별 누적 추이
- **유형**: 누적 면적 차트
- **탭 3개**: [개원] [폐원] [Net]
- **필터**: 지역별 선택 가능

### Graph 5: YoY 성장률
- **유형**: 라인 차트 + 수평 막대 (3패널)
- **탭 2개**: [개원 YoY] [폐원 YoY]
- **계산**: 연도 기준 (전전년도 대비 전년도)
  - 공식: ((현년 - 전년) / 전년) × 100%
  - 현재 완성도가 낮은 2026년 데이터는 제외

---

## 주요 컴포넌트

### ChartDetail.tsx (Graph 2 담당)
```typescript
type Mode = 'open' | 'close' | 'net' | 'rate'

// 폐원율 계산 로직
if (mode === 'rate') {
  const rateVals = months.map(m => {
    const open = openByMonth[m] ?? 0
    if (!open) return 0
    const close = closeByMonth[m] ?? 0
    return Math.round(close / open * 1000) / 10  // 소수점 1자리
  })
}

// 색상 매핑
backgroundColor: rateVals.map(v => {
  if (v <= 5) return 'rgba(34,197,94,0.8)'      // 초록
  if (v <= 10) return 'rgba(59,130,246,0.8)'    // 파랑
  if (v <= 20) return 'rgba(251,146,60,0.8)'    // 주황
  return 'rgba(239,68,68,0.8)'                  // 빨강
})
```

### ChartYoY.tsx (Graph 5 담당)
- 개원/폐원 YoY 비교 분석
- 3개 패널: 연도별 흐름 + 지역별 YoY + 과목별 YoY

---

## API 라우트

| 경로 | 설명 |
|------|------|
| `/api/mr/facility-list` | 월별 개원/폐원 병의원 목록 |
| `/api/mr/monthly-transfer-flow` | 월별 양수양도 건수 (region1 별) |
| `/api/mr/yearly-closure-trend` | 연도별 폐원 건수 |
| `/api/mr/yoy-closure-by-region` | 지역별 폐원율 YoY |
| `/api/mr/yoy-closure-by-specialty` | 과목별 폐원율 YoY |

---

## SQL 함수

| 함수 | 역할 |
|------|------|
| `mr_monthly_transfer_flow()` | 월별 양수양도 count (by region1) |
| `mr_yearly_closure_trend()` | 연도별 폐원 count |
| `mr_yoy_closure_by_region()` | 지역별 YoY 폐원율 |
| `mr_yoy_closure_by_specialty()` | 과목별 YoY 폐원율 |

---

## 2026-06-09 업데이트 내용

### ✅ 완료
- **Graph 2 폐원율 탭 추가**
  - ChartDetail.tsx에 `mode='rate'` 구현
  - 폐원율(%) 계산 로직 추가
  - 위험도별 색상 코딩 (4단계)
  - Tooltip에서 상세 수치 표시
  - 탭 버튼 추가 ([폐원율] 보라색)

### 배포
- ✅ GitHub master 브랜치 푸시
- ✅ Vercel 자동 배포 진행 중

### 🤔 향후 고려사항
- 개원 0건일 때 폐원이 있는 경우 처리 방식 (현재: 0% 표시, 추후 "N/A" 검토)
- 폐원율의 의미론적 해석 (월별 폐업 위험도 vs 누적 포화도)

---

## 개발 가이드

### 로컬 실행
```bash
cd /projects/gawon-monthly
npm run dev
# http://localhost:3000
```

### 배포
```bash
git add .
git commit -m "..."
git push origin master
# Vercel 자동 배포 (약 1-2분)
```

---

**마지막 커밋**: `ad67ef0` — Add closure rate (폐원율) tab to Graph 2 (2026-06-09)
