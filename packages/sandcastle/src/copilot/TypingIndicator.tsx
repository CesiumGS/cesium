import "./TypingIndicator.css";

export function TypingIndicator({ className }: { className?: string }) {
  return (
    <span
      className={`typing-dots${className ? ` ${className}` : ""}`}
      aria-hidden="true"
    >
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </span>
  );
}
