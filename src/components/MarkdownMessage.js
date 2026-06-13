"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

function CopyButton({ code }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-white/10 text-gray-400 hover:text-white hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

export default function MarkdownMessage({ content }) {
  return (
    <div className="prose prose-sm max-w-none prose-pre:relative prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-sm prose-headings:text-gray-800 prose-p:text-gray-700 prose-p:leading-relaxed prose-a:text-brand-600 prose-strong:text-gray-800 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre({ children }) {
            const codeEl = children?.props?.children;
            const codeStr =
              typeof codeEl === "string"
                ? codeEl
                : codeEl?.props?.children?.[0] || "";
            return (
              <div className="group relative my-3">
                <pre className="!bg-gray-900 !text-gray-100 !rounded-lg !border-0 !p-4 !overflow-x-auto">
                  {children}
                </pre>
                <CopyButton code={codeStr} />
              </div>
            );
          },
          code({ className, children, ...props }) {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-gray-100 text-pink-600 text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3">
                <table className="min-w-full border-collapse border border-gray-200 text-sm">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border border-gray-200 px-3 py-2 text-gray-600">
                {children}
              </td>
            );
          },
        }}
      />
    </div>
  );
}
