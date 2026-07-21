import type { RecognizedTrip } from './parseScreenshot'
import type { Trip } from '../types/models'

export interface ImportCandidate {
  key: string
  trip?: Trip
  reason?: string
  source: RecognizedTrip
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function validTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value)
}

function detail(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed || undefined
}

function candidateKey(source: RecognizedTrip, index: number): string {
  return `${source.dateISO}|${source.timeHHmm}|${source.fromText}|${source.toText}|${source.fare}|${index}`
}

export function isSameTrip(a: Trip, b: Trip): boolean {
  return (
    a.at === b.at &&
    a.platformId === b.platformId &&
    a.from === b.from &&
    a.to === b.to &&
    a.fare === b.fare &&
    (a.fromDetail ?? '') === (b.fromDetail ?? '') &&
    (a.toDetail ?? '') === (b.toDetail ?? '')
  )
}

export function makeImportCandidates({
  recognized,
  fallbackDate,
  fallbackPlatformId,
  knownPlatformIds,
  existingTrips,
  createId,
}: {
  recognized: RecognizedTrip[]
  fallbackDate: string
  fallbackPlatformId: string
  knownPlatformIds: string[]
  existingTrips: Trip[]
  createId: () => string
}): ImportCandidate[] {
  return recognized.map((source, index) => {
    const dateISO = validDate(source.dateISO) ? source.dateISO : fallbackDate
    const platformId = knownPlatformIds.includes(source.platformId) ? source.platformId : fallbackPlatformId
    const key = candidateKey({ ...source, dateISO }, index)

    if (!source.fromCode || !source.toCode) {
      return { key, source: { ...source, dateISO }, reason: '지역을 시군구로 확인하지 못했어요' }
    }
    if (!validDate(dateISO) || !validTime(source.timeHHmm)) {
      return { key, source: { ...source, dateISO }, reason: '날짜 또는 시각을 확인하지 못했어요' }
    }
    if (source.fare <= 0) {
      return { key, source: { ...source, dateISO }, reason: '수입 금액을 확인하지 못했어요' }
    }

    const trip: Trip = {
      id: createId(),
      at: `${dateISO}T${source.timeHHmm}:00`,
      platformId,
      from: source.fromCode,
      to: source.toCode,
      fromDetail: detail(source.fromText),
      toDetail: detail(source.toText),
      fare: source.fare,
      paymentMethod: source.paymentMethod || undefined,
      rain: false,
      event: false,
    }

    if (existingTrips.some((existing) => isSameTrip(existing, trip))) {
      return { key, source: { ...source, dateISO }, reason: '이미 저장된 운행이에요' }
    }
    return { key, source: { ...source, dateISO }, trip }
  })
}
