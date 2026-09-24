import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

// No typography plugin is installed, so element styles are mapped here, on theme tokens.
const components: Components = {
  h1: ({ node: _, ...props }) => <h3 className="mt-5 mb-2 text-lg font-semibold first:mt-0" {...props} />,
  h2: ({ node: _, ...props }) => <h3 className="mt-5 mb-2 text-base font-semibold first:mt-0" {...props} />,
  h3: ({ node: _, ...props }) => <h4 className="mt-4 mb-1.5 text-sm font-semibold first:mt-0" {...props} />,
  h4: ({ node: _, ...props }) => <h5 className="mt-3 mb-1 text-sm font-medium first:mt-0" {...props} />,
  p: ({ node: _, ...props }) => <p className="my-2 leading-relaxed first:mt-0 last:mb-0" {...props} />,
  ul: ({ node: _, ...props }) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-muted-foreground" {...props} />,
  ol: ({ node: _, ...props }) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-muted-foreground" {...props} />,
  a: ({ node: _, ...props }) => (
    <a className="font-medium text-primary underline-offset-4 hover:underline" target="_blank" rel="noreferrer" {...props} />
  ),
  blockquote: ({ node: _, ...props }) => (
    <blockquote className="my-3 border-l-2 pl-3 text-muted-foreground italic" {...props} />
  ),
  code: ({ node: _, className, ...props }) => (
    <code className={cn("rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]", className)} {...props} />
  ),
  pre: ({ node: _, ...props }) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs [&_code]:bg-transparent [&_code]:p-0" {...props} />
  ),
  hr: () => <hr className="my-4" />,
  table: ({ node: _, ...props }) => (
    <div className="my-3 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm" {...props} />
    </div>
  ),
  thead: ({ node: _, ...props }) => <thead className="bg-muted/50" {...props} />,
  th: ({ node: _, ...props }) => <th className="border-b px-3 py-1.5 text-left font-medium" {...props} />,
  td: ({ node: _, ...props }) => <td className="border-b px-3 py-1.5 last:border-b-0 [tr:last-child_&]:border-b-0" {...props} />,
  input: ({ node: _, ...props }) => <input className="mr-1.5 align-middle" {...props} disabled />,
};

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("text-sm break-words", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
