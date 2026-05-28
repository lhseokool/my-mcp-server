export default function Home() {
    return (
        <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
            <h1>TypeScript MCP Server</h1>
            <p>Streamable HTTP endpoint: <code>/api/mcp</code></p>
            <p>
                이미지 생성 시 <code>x-hf-token</code> 헤더로 Hugging Face
                토큰을 전달할 수 있습니다.
            </p>
        </main>
    )
}
