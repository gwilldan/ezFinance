"use client"

import type { ChatMessage } from "@/lib/bank-statement/chat"
import type { StatementReport } from "@/lib/bank-statement/schema"
import { ArrowUp, MessageCircle, Sparkles, X } from "lucide-react"
import { FormEvent, useEffect, useRef, useState } from "react"

const SUGGESTIONS = [
  "What did I spend the most on?",
  "List my 5 largest expenses",
  "How much did I spend on transport?",
  "Which subscriptions should I review?",
]

export function ChatSidebar({
  report,
  open,
  onOpenChange,
}: {
  report: StatementReport
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, pending])

  async function ask(question: string) {
    const content = question.trim()
    if (!content || pending) return

    const next: ChatMessage[] = [...messages, { role: "user", content }]
    setMessages(next)
    setInput("")
    setError(null)
    setPending(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report, messages: next }),
      })
      const data = (await response.json()) as {
        answer?: string
        error?: string
      }
      if (!response.ok || !data.answer) {
        throw new Error(data.error ?? "Unable to answer right now.")
      }
      setMessages([...next, { role: "assistant", content: data.answer }])
    } catch (chatError) {
      setError(
        chatError instanceof Error ? chatError.message : "Something went wrong."
      )
    } finally {
      setPending(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void ask(input)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="fixed right-6 bottom-6 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-lg hover:opacity-95"
      >
        <MessageCircle className="h-4 w-4" /> Ask about your statement
      </button>
    )
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full flex-col bg-white shadow-xl ring-1 ring-slate-100 sm:w-[420px]">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">
              Ask ezFinance
            </p>
            <p className="text-xs text-slate-400">
              Answers from your {report.statementPeriod} statement
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close chat"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
      >
        {!messages.length ? (
          <div>
            <p className="text-sm text-slate-500">
              Ask anything about your transactions. Try one of these:
            </p>
            <div className="mt-4 space-y-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void ask(suggestion)}
                  className="block w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left text-sm text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${message.role === "user" ? "ml-auto bg-slate-900 text-white" : "bg-slate-50 text-slate-700"}`}
          >
            {message.content}
          </div>
        ))}

        {pending ? (
          <div className="w-fit rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-400">
            Looking through your transactions…
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-slate-100 p-4"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about your spending…"
          aria-label="Your question"
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          aria-label="Send"
          className="grid h-11 w-11 place-items-center rounded-xl bg-slate-900 text-white disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </aside>
  )
}
