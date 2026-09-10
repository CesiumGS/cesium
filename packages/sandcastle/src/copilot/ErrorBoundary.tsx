import { Component, Fragment, type ReactNode, type ErrorInfo } from "react";
import { Button, Text } from "@stratakit/bricks";

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
          <Text variant="body-lg" style={{ fontWeight: 600 }}>
            Something went wrong
          </Text>
          <Text variant="body-sm" style={{ opacity: 0.7 }}>
            {this.state.error?.message}
          </Text>
          <Text variant="body-sm" style={{ opacity: 0.5, marginTop: "4px" }}>
            If this keeps happening, please{" "}
            <a
              href="https://github.com/CesiumGS/cesium/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              report an issue
            </a>
            .
          </Text>
          <Button
            variant="ghost"
            style={{ marginTop: "8px" }}
            onClick={() =>
              this.setState((prev) => ({
                hasError: false,
                error: null,
                resetKey: prev.resetKey + 1,
              }))
            }
          >
            Try again
          </Button>
        </div>
      );
    }
    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
  }
}
