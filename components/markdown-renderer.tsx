"use client"

import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import rehypeRaw from "rehype-raw"

type MarkdownRendererProps = {
  content: string
  className?: string
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={[
      "prose prose-sm sm:prose-base max-w-none dark:prose-invert",
      "prose-headings:text-primary prose-h1:mt-0 prose-h2:mt-6 prose-h3:mt-5",
      "prose-table:overflow-hidden",
      className || "",
    ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h1: ({ node, ...props }) => <h2 {...props} />,
          h2: ({ node, ...props }) => <h3 {...props} />,
          h3: ({ node, ...props }) => <h4 {...props} />,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto border rounded-md">
              <table className="w-full text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-muted text-primary" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-3 py-2 font-semibold text-left" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-3 py-2 align-top border-t" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc pl-5 space-y-1" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-5 space-y-1" {...props} />
          ),
          // TypeScript from react-markdown types doesn't include `inline` on code props in our setup;
          // using `any` here to avoid overly strict typing while keeping a11y attrs passed through.
          code: ({ inline, className, children, ...props }: any) => (
            <code
              className={
                (inline ? "px-1 py-0.5 rounded bg-muted text-foreground" : "block p-3 rounded bg-muted text-foreground") +
                (className ? ` ${className}` : "")
              }
              {...props}
            >
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

