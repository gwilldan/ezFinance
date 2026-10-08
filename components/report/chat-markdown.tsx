import Markdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"

// Sized for a chat bubble: no headings, tight spacing, tables that scroll.
const COMPONENTS: Components = {
  h1: "p",
  h2: "p",
  h3: "p",
  h4: "p",
  p: ({ children }) => <p className="[&:not(:first-child)]:mt-2">{children}</p>,
  ul: ({ children }) => (
    <ul className="mt-2 list-disc space-y-1 pl-5 first:mt-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-2 list-decimal space-y-1 pl-5 first:mt-0">{children}</ol>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-cyan-accent underline underline-offset-2"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-white px-1 py-0.5 font-mono text-[0.8125rem]">
      {children}
    </code>
  ),
  table: ({ children }) => (
    <div className="mt-2 overflow-x-auto first:mt-0">
      <table className="w-full text-left text-xs tabular-nums">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-slate-200 px-2 py-1.5 font-semibold whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-slate-100 px-2 py-1.5 align-top">
      {children}
    </td>
  ),
}

/** An assistant reply, rendered from Markdown. Raw HTML is never rendered. */
export function ChatMarkdown({ children }: { children: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
      {children}
    </Markdown>
  )
}
