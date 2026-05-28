import type { NextRequest } from 'next/server'
import { createMcpHandler } from 'mcp-handler'
import { registerMcp } from '@/mcp/register'
import { requestContext } from '@/mcp/context'

const baseHandler = createMcpHandler(
    server => registerMcp(server),
    {
        serverInfo: {
            name: 'my-mcp-server',
            version: '1.0.0'
        },
        capabilities: {
            tools: {},
            resources: {},
            prompts: {}
        }
    },
    {
        basePath: '/api',
        maxDuration: 60,
        verboseLogs: true
    }
)

const handler = (req: NextRequest) => {
    const hfToken = req.headers.get('x-hf-token') ?? undefined
    return requestContext.run({ hfToken }, () => baseHandler(req))
}

export { handler as GET, handler as POST, handler as DELETE }
