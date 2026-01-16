import * as React from "react";

interface ErrorBoundaryProps {
	fallbackRender: (error: unknown, reset: () => void) => React.ReactNode;
	children?: React.ReactNode;
	onError?: (error: unknown, errorInfo: React.ErrorInfo) => void;
}

export class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	{ error?: unknown }
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { error: undefined };
	}

	static getDerivedStateFromError(error: unknown) {
		return { error };
	}

	componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
		// Log error to console
		console.error("[ErrorBoundary] Caught error:", {
			error,
			errorInfo,
		});

		// Call custom error handler if provided
		this.props.onError?.(error, errorInfo);

		// Log additional context
		if (error instanceof Error) {
			console.error("[ErrorBoundary] Error details:", {
				message: error.message,
				stack: error.stack,
				componentStack: errorInfo.componentStack,
			});
		}
	}

	handleReset = () => {
		console.log("[ErrorBoundary] Resetting error boundary");
		this.setState({ error: undefined });
	};

	render() {
		if (this.state.error) {
			// You can render any custom fallback UI
			return this.props.fallbackRender(this.state.error, this.handleReset);
		}

		return this.props.children;
	}
}
