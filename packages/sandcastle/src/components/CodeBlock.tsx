/**
 * CodeBlock Component
 *
 * A simple code block component for displaying syntax-highlighted code.
 * This is a lightweight placeholder that renders code with basic styling.
 */

export interface CodeBlockProps {
  /** Code content to display */
  code: string;
  /** Programming language for syntax highlighting */
  language: string;
  /** Additional CSS class name */
  className?: string;
}

/**
 * CodeBlock component for displaying formatted code
 */
export function CodeBlock({ code, language, className = "" }: CodeBlockProps) {
  return (
    <pre className={`code-block ${className}`}>
      <code className={`language-${language}`}>{code}</code>
    </pre>
  );
}
