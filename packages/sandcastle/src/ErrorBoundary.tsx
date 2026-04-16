import { Component, Fragment, type ReactNode, type ErrorInfo } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, resetKey: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            gap: "8px",
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>Something went wrong</p>
          <p style={{ margin: 0, fontSize: "0.85em", opacity: 0.7 }}>
            {this.state.error?.message}
          </p>
          <button
            onClick={() =>
              this.setState((prev) => ({
                hasError: false,
                error: null,
                resetKey: prev.resetKey + 1,
              }))
            }
            style={{
              marginTop: "8px",
              padding: "6px 16px",
              cursor: "pointer",
              borderRadius: "4px",
              border: "1px solid currentColor",
              background: "transparent",
              color: "inherit",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
  }
}
