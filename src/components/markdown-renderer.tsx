import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "~/lib/utils"
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeReact from "rehype-react";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
interface MarkdownRendererProps {
    content: string
    className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
    return (
        <div className={cn("prose prose-neutral dark:prose-invert max-w-none", className)}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath,]}
                components={{
                    h1: ({ children }) => (
                        <h1 className="text-3xl font-bold tracking-tight text-foreground mt-8 mb-4 first:mt-0 border-b border-border pb-2">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground mt-8 mb-3 border-b border-border pb-2">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => <h3 className="text-xl font-semibold text-foreground mt-6 mb-2">{children}</h3>,
                    h4: ({ children }) => <h4 className="text-lg font-semibold text-foreground mt-4 mb-2">{children}</h4>,
                    p: ({ children }) => <p className="text-foreground/90 leading-7 mb-4">{children}</p>,
                    ul: ({ children }) => <ul className="my-4 ml-6 list-disc space-y-2 text-foreground/90">{children}</ul>,
                    ol: ({ children }) => <ol className="my-4 ml-6 list-decimal space-y-2 text-foreground/90">{children}</ol>,
                    li: ({ children }) => <li className="leading-7">{children}</li>,
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">
                            {children}
                        </blockquote>
                    ),
                    code: ({ className, children, ...props }) => {
                        const isInline = !className
                        if (isInline) {
                            return (
                                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props}>
                                    {children}
                                </code>
                            )
                        }
                        return (
                            <code
                                className={cn("block bg-muted p-4 rounded-lg overflow-x-auto font-mono text-sm", className)}
                                {...props}
                            >
                                {children}
                            </code>
                        )
                    },
                    pre: ({ children }) => <pre className="bg-muted rounded-lg overflow-x-auto my-4">{children}</pre>,
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                        >
                            {children}
                        </a>
                    ),
                    hr: () => <hr className="my-6 border-border" />,
                    table: ({ children }) => (
                        <div className="my-4 overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-sm">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
                    th: ({ children }) => (
                        <th className="px-4 py-2 text-left font-semibold text-foreground border-b border-border">{children}</th>
                    ),
                    td: ({ children }) => <td className="px-4 py-2 text-foreground/90 border-b border-border">{children}</td>,
                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}
