# TypeScript MCP Server 보일러플레이트

TypeScript MCP SDK와 [mcp-handler](https://github.com/vercel/mcp-handler)를 활용하여 Model Context Protocol (MCP) 서버를 빠르게 개발하고 **Vercel에 배포**할 수 있는 보일러플레이트 프로젝트입니다.

전송 방식은 **Streamable HTTP** (`/api/mcp`)이며, Stdio 대신 Next.js App Router Route Handler로 동작합니다.

## 프로젝트 구조

```
typescript-mcp-server-boilerplate/
├── app/
│   ├── api/
│   │   └── [transport]/
│   │       └── route.ts      # MCP HTTP 엔드포인트 (GET/POST/DELETE)
│   ├── layout.tsx
│   └── page.tsx
├── src/
│   └── mcp/
│       ├── context.ts          # x-hf-token 요청 컨텍스트 (AsyncLocalStorage)
│       ├── register.ts         # 도구/리소스/프롬프트 등록
│       └── prompts/
│           └── code-review.ts
├── next.config.ts
├── vercel.json
├── package.json
└── .cursor/mcp.json            # Cursor MCP 연결 예시
```

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 (선택)

로컬에서 서버 측 HF 토큰 fallback을 쓰려면 `.env` 파일을 만듭니다:

```bash
cp .env.example .env
# HF_TOKEN=hf_xxx
```

클라이언트가 `x-hf-token` 헤더를내면 **헤더 값이 우선**되고, 없을 때만 `HF_TOKEN` 환경변수를 사용합니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

MCP 엔드포인트: `http://localhost:3000/api/mcp`

### 4. 프로덕션 빌드

```bash
npm run build
npm run start
```

## 등록된 기능

| 종류 | 이름 | 설명 |
|------|------|------|
| Tool | `greeting` | 이름으로 인사 |
| Tool | `calculator` | 사칙연산 (add/subtract/multiply/divide) |
| Tool | `calculate` | 연산자 기호 사칙연산 |
| Tool | `get_time` | 시간대별 현재 시각 |
| Tool | `generate_image` | Hugging Face FLUX 이미지 생성 |
| Tool | `geocode` | OpenStreetMap Nominatim 지오코딩 |
| Tool | `get_weather` | Open-Meteo 날씨 조회 |
| Resource | `server-info` | 서버 메타데이터 JSON |
| Prompt | `code_review` | 코드 리뷰 프롬프트 템플릿 |

## x-hf-token 헤더 (이미지 생성)

`generate_image` 도구는 Hugging Face API 토큰이 필요합니다.

1. **클라이언트 헤더 (권장)**: 요청마다 `x-hf-token: hf_xxx` 전달
2. **서버 환경변수 (fallback)**: Vercel/로컬에 `HF_TOKEN` 설정

우선순위: `x-hf-token` 헤더 → `HF_TOKEN` 환경변수

## Cursor MCP 연결

`npm run dev` 실행 후 [`.cursor/mcp.json`](./.cursor/mcp.json)을 참고하세요:

```json
{
    "mcpServers": {
        "typescript-mcp-server": {
            "url": "http://localhost:3000/api/mcp",
            "headers": {
                "x-hf-token": "YOUR_HUGGING_FACE_TOKEN_HERE"
            }
        }
    }
}
```

Cursor 0.48+ 에서는 Streamable HTTP URL을 직접 지원합니다.

### Stdio 전용 클라이언트 (Claude Desktop 등)

[mcp-remote](https://www.npmjs.com/package/mcp-remote)로 HTTP 서버에 프록시합니다:

```json
{
    "mcpServers": {
        "typescript-mcp-server": {
            "command": "npx",
            "args": [
                "-y",
                "mcp-remote",
                "http://localhost:3000/api/mcp",
                "--header",
                "x-hf-token:YOUR_HUGGING_FACE_TOKEN_HERE"
            ]
        }
    }
}
```

## Vercel 배포

1. [Vercel](https://vercel.com)에 프로젝트를 연결합니다.
2. **Environment Variables**에 `HF_TOKEN`을 추가합니다 (선택, 클라이언트 헤더만 쓸 경우 생략 가능).
3. 배포 후 MCP URL: `https://<your-project>.vercel.app/api/mcp`

`vercel.json`에서 MCP Route Handler의 `maxDuration`을 60초로 설정해 두었습니다. Pro 플랜 이상에서 더 긴 이미지 생성이 필요하면 값을 조정하세요.

### 배포 후 Cursor 연결 예시

```json
{
    "mcpServers": {
        "typescript-mcp-server": {
            "url": "https://<your-project>.vercel.app/api/mcp",
            "headers": {
                "x-hf-token": "YOUR_HUGGING_FACE_TOKEN_HERE"
            }
        }
    }
}
```

## 개발 가이드

### MCP 도구 추가하기

[`src/mcp/register.ts`](./src/mcp/register.ts)의 `registerMcp` 함수 안에 `server.tool(...)` 을 추가합니다.

### 요청 컨텍스트 사용하기

[`src/mcp/context.ts`](./src/mcp/context.ts)의 `resolveHfToken()`으로 현재 요청의 HF 토큰을 읽을 수 있습니다. Route Handler에서 `x-hf-token` 헤더를 AsyncLocalStorage에 주입합니다.

## 주요 의존성

- **next**: App Router 및 Vercel 배포
- **mcp-handler**: Vercel용 MCP HTTP 어댑터
- **@modelcontextprotocol/sdk**: MCP 프로토콜 SDK (1.26.0+)
- **@huggingface/inference**: 이미지 생성
- **zod**: 스키마 검증

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | Next.js 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | Next.js 린트 |

## 참고 자료

- [Vercel - Deploy MCP servers](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel)
- [vercel/mcp-handler](https://github.com/vercel/mcp-handler)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## 라이선스

MIT
