import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { InferenceClient } from '@huggingface/inference'
import dotenv from 'dotenv'
dotenv.config()

const SERVER_META = {
    name: 'typescript-mcp-server',
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

function buildCodeReviewPrompt(
    code: string,
    options?: { language?: string; context?: string }
): string {
    const contextLines = [
        options?.language && `- **언어/스택**: ${options.language}`,
        options?.context && `- **코드 목적/배경**: ${options.context}`
    ].filter(Boolean)
    const contextSection =
        contextLines.length > 0
            ? `## 컨텍스트\n${contextLines.join('\n')}\n\n`
            : ''
    const codeFence = options?.language?.toLowerCase() ?? ''

    return `당신은 시니어 소프트웨어 엔지니어입니다. 아래 코드에 대해 **코드 리뷰 베스트 프랙티스**에 따라 체계적으로 리뷰해 주세요.

## 리뷰 원칙
- 변경 의도를 먼저 파악하고, 가정이 필요하면 명시합니다.
- 문제점만이 아니라 **잘된 점**도 반드시 언급합니다.
- 모든 지적에는 **이유**와 **구체적인 개선 방향**을 함께 제시합니다.
- 스타일 취향보다 **버그·보안·유지보수성·성능**을 우선합니다.
- 가능하면 코드 위치(함수명·라인 등)를 참조해 설명합니다.

## 리뷰 체크리스트
1. **요약**: 전체 품질, 머지 가능 여부(Approve / Request changes / Comment)
2. **정확성**: 로직 오류, 엣지 케이스, null/undefined 처리
3. **가독성**: 네이밍, 함수 크기, 중복, 주석 필요 여부
4. **설계**: 단일 책임, 결합도, 확장성, 적절한 추상화
5. **에러 처리**: 예외 처리, 실패 시 복구, 사용자/호출자 피드백
6. **보안**: 입력 검증, 인젝션, 시크릿 노출, 권한 검사
7. **성능**: 불필요한 연산·할당, N+1, 비동기/동시성 이슈
8. **테스트**: 테스트 가능성, 누락된 테스트 케이스 제안
9. **유지보수성**: 타입 안전성, 의존성, 문서화 필요 여부

## 출력 형식
각 항목을 아래 구조로 작성합니다.

### [심각도] 제목
- **위치**: (함수/클래스/라인 등)
- **문제**: 무엇이 문제인지
- **제안**: 어떻게 고칠지 (가능하면 예시 코드)

심각도: \`critical\` | \`major\` | \`minor\` | \`nit\`

마지막에 **우선 수정 목록**(상위 3개)과 **잘된 점**을 bullet으로 정리합니다.

${contextSection}## 리뷰할 코드
\`\`\`${codeFence}
${code}
\`\`\``
}

// 서버 인스턴스 생성
const server = new McpServer(
    {
        name: SERVER_META.name,
        version: SERVER_META.version
    },
    {
        capabilities: {
            tools: {},
            resources: {},
            prompts: {}
        }
    }
)

// 예시 도구: 인사하기
server.tool(
    'greeting',
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

// 예시 도구: 계산기
server.tool(
    'calculator',
    {
        operation: z
            .enum(['add', 'subtract', 'multiply', 'divide'])
            .describe('수행할 연산 (add, subtract, multiply, divide)'),
        a: z.number().describe('첫 번째 숫자'),
        b: z.number().describe('두 번째 숫자')
    },
    async ({ operation, a, b }) => {
        // 연산 수행
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

// 예시 도구: 시간 조회
server.tool(
    'get_time',
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

// 이미지 생성 도구
server.tool(
    'generate_image',
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
        if (!process.env.HF_TOKEN) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'HF_TOKEN 환경변수가 설정되지 않았습니다. Hugging Face 토큰을 설정한 뒤 다시 시도해 주세요.'
                    }
                ]
            }
        }

        try {
            const client = new InferenceClient(process.env.HF_TOKEN)

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

// 지오코딩 도구: 주소/도시명으로 좌표 검색
server.tool(
    'geocode',
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

        const formatted = results.map((r: any) => ({
            name: r.display_name,
            latitude: parseFloat(r.lat),
            longitude: parseFloat(r.lon),
            type: r.type,
            importance: r.importance,
            address: r.address
        }))

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

// 날씨 정보 도구: Open-Meteo API 사용
server.tool(
    'get_weather',
    {
        latitude: z.number().min(-90).max(90).describe('위도 (WGS84)'),
        longitude: z.number().min(-180).max(180).describe('경도 (WGS84)'),
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

// 서버 정보 리소스
server.resource(
    'server-info',
    'server://info',
    {
        title: '서버 정보',
        description: 'MCP 서버 메타데이터, 런타임 상태, 등록된 도구/리소스/프롬프트 목록',
        mimeType: 'application/json'
    },
    async () => {
        const memory = process.memoryUsage()

        const serverInfo = {
            ...SERVER_META,
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
                    'Hugging Face Inference (together / FLUX.1-schnell, HF_TOKEN 필요)'
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

// 코드 리뷰 프롬프트 (베스트 프랙티스 템플릿)
server.prompt(
    'code_review',
    '코드 리뷰 (Code Review)',
    {
        code: z.string().describe('리뷰할 소스 코드'),
        language: z
            .string()
            .optional()
            .describe('프로그래밍 언어 또는 프레임워크 (예: TypeScript, Python)'),
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
                        text: buildCodeReviewPrompt(code, { language, context })
                    }
                }
            ]
        }
    }
)

// 서버 시작
async function main() {
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('TypeScript MCP 서버가 시작되었습니다!')
}

main().catch(error => {
    console.error('서버 시작 중 오류 발생:', error)
    process.exit(1)
})
