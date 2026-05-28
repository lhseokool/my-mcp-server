import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { InferenceClient } from '@huggingface/inference'
import { z } from 'zod'
import { resolveHfToken } from '@/mcp/context'
import { buildCodeReviewPrompt } from '@/mcp/prompts/code-review'

const SERVER_META = {
    name: 'my-mcp-server',
    version: '1.0.0',
    description: 'TypeScript MCP Server 보일러플레이트'
} as const

const REGISTERED_TOOLS = [
    'greeting',
    'calculator',
    'calculate',
    'get_time',
    'generate_image',
    'geocode',
    'get_weather'
] as const

const REGISTERED_RESOURCES = [
    { name: 'server-info', uri: 'server://info' }
] as const

const REGISTERED_PROMPTS = ['code_review'] as const

export function registerMcp(server: McpServer): void {
    server.tool(
        'greeting',
        '사용자에게 한국어 또는 영어로 인사말을 생성합니다.',
        {
            name: z.string().describe('인사할 사람의 이름'),
            language: z
                .enum(['ko', 'en'])
                .optional()
                .default('ko')
                .describe('인사 언어 (기본값: ko)')
        },
        async ({ name, language }) => {
            const greeting =
                language === 'ko'
                    ? `안녕하세요, ${name}님! 😊`
                    : `Hello, ${name}! 👋`

            return {
                content: [
                    {
                        type: 'text',
                        text: greeting
                    }
                ]
            }
        }
    )

    server.tool(
        'calculator',
        '사칙연산(더하기, 빼기, 곱하기, 나누기)을 수행합니다.',
        {
            operation: z
                .enum(['add', 'subtract', 'multiply', 'divide'])
                .describe('수행할 연산 (add, subtract, multiply, divide)'),
            a: z.number().describe('첫 번째 숫자'),
            b: z.number().describe('두 번째 숫자')
        },
        async ({ operation, a, b }) => {
            let result: number
            switch (operation) {
                case 'add':
                    result = a + b
                    break
                case 'subtract':
                    result = a - b
                    break
                case 'multiply':
                    result = a * b
                    break
                case 'divide':
                    if (b === 0) throw new Error('0으로 나눌 수 없습니다')
                    result = a / b
                    break
                default:
                    throw new Error('지원하지 않는 연산입니다')
            }

            const operationSymbols = {
                add: '+',
                subtract: '-',
                multiply: '×',
                divide: '÷'
            } as const

            const operationSymbol =
                operationSymbols[operation as keyof typeof operationSymbols]

            return {
                content: [
                    {
                        type: 'text',
                        text: `${a} ${operationSymbol} ${b} = ${result}`
                    }
                ]
            }
        }
    )

    server.tool(
        'calculate',
        '연산자 기호(+, -, *, /)를 사용해 두 숫자의 사칙연산을 수행합니다.',
        {
            operator: z
                .enum(['+', '-', '*', '/'])
                .describe('사칙연산 연산자 (+, -, *, /)'),
            a: z.number().describe('첫 번째 숫자'),
            b: z.number().describe('두 번째 숫자')
        },
        async ({ operator, a, b }) => {
            let result: number
            switch (operator) {
                case '+':
                    result = a + b
                    break
                case '-':
                    result = a - b
                    break
                case '*':
                    result = a * b
                    break
                case '/':
                    if (b === 0) throw new Error('0으로 나눌 수 없습니다')
                    result = a / b
                    break
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: `${a} ${operator} ${b} = ${result}`
                    }
                ]
            }
        }
    )

    server.tool(
        'get_time',
        '지정한 타임존의 현재 날짜와 시각을 반환합니다.',
        {
            timeZone: z.string().describe('시간대')
        },
        async ({ timeZone }) => {
            return {
                content: [
                    {
                        type: 'text',
                        text: new Date().toLocaleString('ko-KR', {
                            timeZone
                        })
                    }
                ]
            }
        }
    )

    server.tool(
        'generate_image',
        '텍스트 프롬프트로 이미지를 생성합니다. 이미지를 그리거나 생성해 달라는 요청에는 반드시 이 도구를 사용하세요. FLUX.1-schnell 모델(Hugging Face / together)을 사용합니다.',
        {
            prompt: z.string().describe('이미지 생성 프롬프트'),
            num_inference_steps: z
                .number()
                .min(1)
                .max(10)
                .optional()
                .default(4)
                .describe('추론 스텝 수 (기본값: 4, 1~10)')
        },
        async ({ prompt, num_inference_steps }) => {
            const hfToken = resolveHfToken()
            if (!hfToken) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'Hugging Face 토큰이 없습니다. x-hf-token 헤더를 보내거나 서버 HF_TOKEN 환경변수를 설정한 뒤 다시 시도해 주세요.'
                        }
                    ]
                }
            }

            try {
                const client = new InferenceClient(hfToken)

                const imageBlob = await client.textToImage({
                    provider: 'together',
                    model: 'black-forest-labs/FLUX.1-schnell',
                    inputs: prompt,
                    parameters: { num_inference_steps }
                })

                const arrayBuffer = await (
                    imageBlob as unknown as Blob
                ).arrayBuffer()
                const base64Data = Buffer.from(arrayBuffer).toString('base64')

                return {
                    content: [
                        {
                            type: 'image',
                            data: base64Data,
                            mimeType: 'image/png'
                        }
                    ]
                }
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : '알 수 없는 오류'
                return {
                    content: [
                        {
                            type: 'text',
                            text: `이미지 생성 중 오류가 발생했습니다: ${message}`
                        }
                    ]
                }
            }
        }
    )

    server.tool(
        'geocode',
        '도시 이름이나 주소를 입력하면 위도·경도 좌표와 상세 주소 정보를 반환합니다. Nominatim(OpenStreetMap) API를 사용합니다.',
        {
            query: z.string().describe('검색할 도시 이름 또는 주소'),
            limit: z
                .number()
                .min(1)
                .max(40)
                .optional()
                .default(1)
                .describe('반환할 결과 수 (기본값: 1, 최대: 40)'),
            addressdetails: z
                .boolean()
                .optional()
                .default(true)
                .describe('주소 세부 정보 포함 여부')
        },
        async ({ query, limit, addressdetails }) => {
            const url = new URL('https://nominatim.openstreetmap.org/search')
            url.searchParams.set('q', query)
            url.searchParams.set('format', 'jsonv2')
            url.searchParams.set('limit', String(limit))
            url.searchParams.set('addressdetails', addressdetails ? '1' : '0')

            const response = await fetch(url.toString(), {
                headers: {
                    'User-Agent': 'typescript-mcp-server/1.0.0',
                    'Accept-Language': 'ko,en'
                }
            })

            if (!response.ok) {
                throw new Error(`Nominatim API 오류: ${response.status}`)
            }

            const results = await response.json()

            if (!results || results.length === 0) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `"${query}"에 대한 검색 결과가 없습니다.`
                        }
                    ]
                }
            }

            const formatted = results.map(
                (r: {
                    display_name: string
                    lat: string
                    lon: string
                    type: string
                    importance: number
                    address: unknown
                }) => ({
                    name: r.display_name,
                    latitude: parseFloat(r.lat),
                    longitude: parseFloat(r.lon),
                    type: r.type,
                    importance: r.importance,
                    address: r.address
                })
            )

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(formatted, null, 2)
                    }
                ]
            }
        }
    )

    server.tool(
        'get_weather',
        '위도·경도를 기반으로 현재 날씨와 최대 16일치 일별 예보를 반환합니다. Open-Meteo API를 사용합니다.',
        {
            latitude: z.number().min(-90).max(90).describe('위도 (WGS84)'),
            longitude: z
                .number()
                .min(-180)
                .max(180)
                .describe('경도 (WGS84)'),
            timezone: z
                .string()
                .optional()
                .default('auto')
                .describe('시간대 (기본값: auto - 자동 감지)'),
            forecast_days: z
                .number()
                .min(1)
                .max(16)
                .optional()
                .default(3)
                .describe('예보 일수 (기본값: 3, 최대: 16)')
        },
        async ({ latitude, longitude, timezone, forecast_days }) => {
            const url = new URL('https://api.open-meteo.com/v1/forecast')
            url.searchParams.set('latitude', String(latitude))
            url.searchParams.set('longitude', String(longitude))
            url.searchParams.set('timezone', timezone)
            url.searchParams.set('forecast_days', String(forecast_days))
            url.searchParams.set(
                'current',
                'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m'
            )
            url.searchParams.set(
                'daily',
                'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code'
            )

            const response = await fetch(url.toString(), {
                headers: { 'User-Agent': 'typescript-mcp-server/1.0.0' }
            })

            if (!response.ok) {
                throw new Error(`Open-Meteo API 오류: ${response.status}`)
            }

            const data = await response.json()

            if (data.error) {
                throw new Error(
                    `Open-Meteo API 오류: ${data.reason || '알 수 없는 오류'}`
                )
            }

            const formatted = {
                location: {
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timezone: data.timezone,
                    elevation: data.elevation
                },
                current: data.current
                    ? {
                          temperature: data.current.temperature_2m,
                          humidity: data.current.relative_humidity_2m,
                          weather_code: data.current.weather_code,
                          wind_speed: data.current.wind_speed_10m,
                          time: data.current.time
                      }
                    : null,
                daily: data.daily
                    ? {
                          time: data.daily.time,
                          temperature_max: data.daily.temperature_2m_max,
                          temperature_min: data.daily.temperature_2m_min,
                          precipitation: data.daily.precipitation_sum,
                          weather_code: data.daily.weather_code
                      }
                    : null,
                units: {
                    temperature: data.current_units?.temperature_2m || '°C',
                    humidity: data.current_units?.relative_humidity_2m || '%',
                    wind_speed: data.current_units?.wind_speed_10m || 'km/h',
                    precipitation: data.daily_units?.precipitation_sum || 'mm'
                }
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(formatted, null, 2)
                    }
                ]
            }
        }
    )

    server.resource(
        'server-info',
        'server://info',
        {
            title: '서버 정보',
            description:
                'MCP 서버 메타데이터, 런타임 상태, 등록된 도구/리소스/프롬프트 목록',
            mimeType: 'application/json'
        },
        async () => {
            const memory = process.memoryUsage()

            const serverInfo = {
                ...SERVER_META,
                transport: 'streamable-http',
                deployment: 'vercel',
                timestamp: new Date().toISOString(),
                runtime: {
                    uptimeSeconds: process.uptime(),
                    nodeVersion: process.version,
                    platform: process.platform,
                    pid: process.pid,
                    memoryMb: {
                        rss: Math.round(memory.rss / 1024 / 1024),
                        heapUsed: Math.round(memory.heapUsed / 1024 / 1024)
                    }
                },
                capabilities: {
                    tools: [...REGISTERED_TOOLS],
                    resources: REGISTERED_RESOURCES.map(r => ({
                        name: r.name,
                        uri: r.uri
                    })),
                    prompts: [...REGISTERED_PROMPTS]
                },
                externalApis: {
                    geocode: 'Nominatim (OpenStreetMap)',
                    weather: 'Open-Meteo',
                    imageGeneration:
                        'Hugging Face Inference (together / FLUX.1-schnell, x-hf-token 헤더 또는 HF_TOKEN 환경변수)'
                }
            }

            return {
                contents: [
                    {
                        uri: 'server://info',
                        mimeType: 'application/json',
                        text: JSON.stringify(serverInfo, null, 2)
                    }
                ]
            }
        }
    )

    server.prompt(
        'code_review',
        '코드 리뷰 (Code Review)',
        {
            code: z.string().describe('리뷰할 소스 코드'),
            language: z
                .string()
                .optional()
                .describe(
                    '프로그래밍 언어 또는 프레임워크 (예: TypeScript, Python)'
                ),
            context: z
                .string()
                .optional()
                .describe('코드의 목적이나 배경 설명 (선택)')
        },
        async ({ code, language, context }) => {
            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: buildCodeReviewPrompt(code, {
                                language,
                                context
                            })
                        }
                    }
                ]
            }
        }
    )
}
