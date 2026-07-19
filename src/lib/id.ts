// 기록마다 겹치지 않는 고유 id를 만든다.
// 최신 브라우저의 crypto.randomUUID를 쓰고, 없으면 시각+난수로 대체한다.
export function newId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`
}
