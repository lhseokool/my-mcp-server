import { AsyncLocalStorage } from 'node:async_hooks'

export type RequestContext = {
    hfToken?: string
}

export const requestContext = new AsyncLocalStorage<RequestContext>()

/**
 * Resolves Hugging Face token: x-hf-token header (via AsyncLocalStorage) first,
 * then server HF_TOKEN environment variable.
 */
export function resolveHfToken(): string | undefined {
    return requestContext.getStore()?.hfToken ?? process.env.HF_TOKEN
}
