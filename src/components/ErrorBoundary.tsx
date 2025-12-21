import * as React from "react";

interface ErrorBoundaryProps {
	fallbackRender: (error: unknown) => React.ReactNode;
	children?: React.ReactNode;
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
		// Update state so the next render will show the fallback UI.
		return { error };
	}

	render() {
		if (this.state.error) {
			// You can render any custom fallback UI
			return this.props.fallbackRender(this.state.error);
		}

		return this.props.children;
	}
}
