import OpenAI from "openai"

const DEFAULT_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
const DEFAULT_MODEL = "qwen3.7-plus"

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

export function chatCompletion(request: ChatRequest) {
  // DashScope accepts `enable_thinking` on top of the OpenAI chat params.
  const body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
    enable_thinking: false
  } = {
    model: process.env.DASHSCOPE_MODEL || DEFAULT_MODEL,
    enable_thinking: false,
    ...request,
  }
  return getClient().chat.completions.create(body)
}
