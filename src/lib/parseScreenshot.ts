import type { Settings } from '../types/models'
import { allDistricts } from '../data/regions'

// 서버(/api/parse)가 돌려주는 인식 결과 1건.
export interface RecognizedTrip {
  fromText: string
  fromCode: string
  toText: string
  toCode: string
  fare: number
  dateISO: string
  timeHHmm: string
  platformId: 'kakao' | 'tmap' | ''
  paymentMethod: 'cash' | 'card' | ''
  confidence: number
}

// 이미지를 긴 변 기준 maxEdge로 줄여 JPEG base64로 만든다.
// 업로드 용량·인식 비용을 줄이려는 목적(원본 그대로 보내지 않는다).
function toResizedBase64(file: File, maxEdge = 1600, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('canvas 사용 불가'))
      ctx.drawImage(img, 0, 0, w, h)
      // 'data:image/jpeg;base64,....' 에서 앞부분을 떼고 base64만 반환.
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('이미지를 읽을 수 없어요'))
    }
    img.src = url
  })
}

// 스크린샷을 서버로 보내 출발/도착/요금을 인식해 온다.
// 실패 시 사람이 읽을 수 있는 메시지로 throw 한다(호출부에서 토스트).
export async function parseScreenshot(
  file: File,
  settings: Settings,
  fallbackDate: string,
): Promise<RecognizedTrip[]> {
  const imageBase64 = await toResizedBase64(file)
  const regions = allDistricts().map((d) => ({ code: d.code, name: d.name }))
  const zones = settings.customZones.map((z) => ({ name: z.name, parentCode: z.parentCode }))

  const res = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mediaType: 'image/jpeg', regions, zones, fallbackDate }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `인식 실패 (${res.status})`)
  return Array.isArray(data.trips) ? (data.trips as RecognizedTrip[]) : []
}
