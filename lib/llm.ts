import OpenAI, { RateLimitError } from "openai"
import { setTimeout as sleep } from "node:timers/promises"

const DEFAULT_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
const DEFAULT_MODEL = "qwen3.5-flash"
// The SDK retries a 429 twice within a few seconds. A burst of uploads can
// outlast that, so keep backing off for longer before giving up on a call.
const RATE_LIMIT_RETRIES = 4
const RATE_LIMIT_BASE_MS = 2_000
const RATE_LIMIT_MAX_MS = 20_000

type ChatRequest = Omit<
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  "model"
>

let client: OpenAI | undefined

function getClient(): OpenAI {
  if (!process.env.DASHSCOPE_API_KEY) {
    throw new Error("DASHSCOPE_API_KEY is not configured.")
  }
  client ??= new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: process.env.DASHSCOPE_BASE_URL || DEFAULT_BASE_URL,
  })
  return client
}

export async function chatCompletion(
  request: ChatRequest,
  { signal }: { signal?: AbortSignal } = {}
) {
  // DashScope accepts `enable_thinking` on top of the OpenAI chat params.
  const body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
    enable_thinking: false
  } = {
    model: process.env.DASHSCOPE_MODEL || DEFAULT_MODEL,
    enable_thinking: false,
    ...request,
  }

  for (let retry = 0; ; retry += 1) {
    try {
      return await getClient().chat.completions.create(body, { signal })
    } catch (error) {
      if (!(error instanceof RateLimitError) || retry >= RATE_LIMIT_RETRIES) {
        throw error
      }
      const wait = rateLimitWait(retry)
      // The message says which limit was hit: requests, tokens or a burst.
      console.warn(
        `[llm] rate limited (${error.message}), retry ${retry + 1}/${RATE_LIMIT_RETRIES} in ${(wait / 1000).toFixed(1)}s`
      )
      await sleep(wait, undefined, { signal })
    }
  }
}

/** Exponential backoff with jitter, so retries from a burst spread out. */
function rateLimitWait(retry: number) {
  const ceiling = Math.min(RATE_LIMIT_MAX_MS, RATE_LIMIT_BASE_MS * 2 ** retry)
  return ceiling / 2 + Math.random() * (ceiling / 2)
}
