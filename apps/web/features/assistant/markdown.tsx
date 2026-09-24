import Link from "next/link";
import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  p: ({ children }) => <p className="leading-relaxed [&:not(:first-child)]:mt-2">{children}</p>,
  ul: ({ children }) => <ul className="mt-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h3 className="mt-3 text-base font-semibold">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-3 text-sm font-semibold">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-3 text-sm font-semibold">{children}</h4>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  a: ({ href = "", children }) =>
    href.startsWith("/") ? (
      <Link href={href} className="font-medium text-primary underline-offset-2 hover:underline">
        {children}
      </Link>
    ) : (
      <a href={href} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-2 hover:underline">
        {children}
      </a>
    ),
  code: ({ children, className }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
    ),
  pre: ({ children }) => <pre className="mt-2 overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs">{children}</pre>,
  blockquote: ({ children }) => <blockquote className="mt-2 border-l-2 pl-3 text-muted-foreground">{children}</blockquote>,
  table: ({ children }) => (
    <div className="mt-2 overflow-x-auto rounded-md border">
      <table className="w-full text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b bg-muted/60 px-2 py-1.5 text-left font-medium">{children}</th>,
  td: ({ children }) => <td className="border-b px-2 py-1.5 tabular-nums last:border-0">{children}</td>,
  hr: () => <hr className="my-3" />,
};

export const Markdown = memo(function Markdown({ text }: { text: string }) {
  return (
    <div className="text-sm break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
});
