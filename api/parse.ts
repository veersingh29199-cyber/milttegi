// Vercel 서버리스 함수: 운행내역 스크린샷을 Google Gemini(무료 등급)로 분석해
// 출발/도착/요금을 뽑아 우리 시군구 코드로 매핑해 돌려준다.
// API 키는 이 서버 함수 환경변수(GEMINI_API_KEY)에만 있고, 앱 코드/브라우저엔 노출되지 않는다.

export const maxDuration = 30 // 비전 응답 대기 여유(초)

// Gemini 무료 등급 비전 모델. 필요하면 Vercel 환경변수 GEMINI_MODEL로 교체 가능.
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

// Gemini가 돌려줄 JSON 구조(타입은 대문자 표기).
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    trips: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          fromText: { type: 'STRING' },
          fromCode: { type: 'STRING' },
          toText: { type: 'STRING' },
          toCode: { type: 'STRING' },
          fare: { type: 'INTEGER' },
          dateISO: { type: 'STRING' },
          timeHHmm: { type: 'STRING' },
          platformId: { type: 'STRING', enum: ['kakao', 'tmap', ''] },
          paymentMethod: { type: 'STRING', enum: ['cash', 'card', ''] },
          confidence: { type: 'NUMBER' },
        },
        required: [
          'fromText',
          'fromCode',
          'toText',
          'toCode',
          'fare',
          'dateISO',
          'timeHHmm',
          'platformId',
          'paymentMethod',
          'confidence',
        ],
      },
    },
  },
  required: ['trips'],
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST만 허용됩니다' })
    return
  }
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(400).json({
      error: 'API 키가 없습니다. Vercel 설정에서 환경변수 GEMINI_API_KEY를 추가하세요.',
    })
    return
  }

  try {
    const { imageBase64, mediaType, regions, zones, fallbackDate } = req.body || {}
    if (!imageBase64) {
      res.status(400).json({ error: '이미지가 없습니다' })
      return
    }

    // 모델에 줄 지역/구역 목록(코드 → 이름).
    const regionList = (regions || []).map((r: any) => `${r.code} ${r.name}`).join(', ')
    const zoneList = (zones || []).map((z: any) => `${z.name}(→${z.parentCode})`).join(', ')

    const prompt = [
      '이 이미지는 한국 대리운전 플랫폼의 "운행 내역" 스크린샷이다.',
      '카카오 상세 내역은 1건, T맵 운행 내역 목록은 화면에 보이는 모든 행을 읽어라.',
      '보이는 각 운행 건에 대해 출발지·도착지·요금·날짜·시각·플랫폼·결제수단을 읽어라.',
      '출발지/도착지는 아래 시군구 목록에서 가장 가까운 곳의 5자리 코드로 매핑해라.',
      '동/지번/건물명만 보이면 그 동이 속한 시군구로 매핑한다. 매핑이 불가능하면 코드는 빈 문자열("")로 둔다.',
      `시군구 목록: ${regionList}`,
      zoneList ? `내 구역(참고): ${zoneList}` : '',
      `날짜가 연도 없이 보이면 기준 날짜 ${fallbackDate || '오늘'}의 연도를 사용해 YYYY-MM-DD로 만든다.`,
      '규칙: fromText/toText=화면에 보인 원문, fromCode/toCode=매핑한 5자리 코드(또는 ""),',
      'fare=숫자만(원·콤마 제거한 정수), dateISO=YYYY-MM-DD(모르면 ""), timeHHmm=시각이 보이면 "HH:mm" 아니면 "",',
      'platformId=카카오면 "kakao", 티맵이면 "tmap", 판단 불가면 "". paymentMethod=현금이면 "cash", 카드면 "card", 없으면 "".',
      'confidence=0~1 확신도. 화면에 분명히 보이는 건만 넣어라. 결과는 JSON.',
    ]
      .filter(Boolean)
      .join('\n')

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
    const gemRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mediaType || 'image/jpeg', data: imageBase64 } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    })

    if (!gemRes.ok) {
      const detail = await gemRes.text()
      res.status(502).json({ error: `인식 실패(Gemini ${gemRes.status})`, detail: detail.slice(0, 500) })
      return
    }

    const data = await gemRes.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      res.status(502).json({ error: '인식 결과가 비어 있습니다' })
      return
    }
    const parsed = JSON.parse(text)
    res.status(200).json({ trips: Array.isArray(parsed.trips) ? parsed.trips : [] })
  } catch (e: any) {
    res.status(500).json({ error: '서버 오류', detail: String(e?.message || e).slice(0, 300) })
  }
}
