import { Component, type ErrorInfo, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Error boundary state
// ---------------------------------------------------------------------------

export type ErrorBoundaryState = {
	readonly hasError: boolean;
	readonly error: Error | undefined;
	readonly errorInfo: ErrorInfo | undefined;
};

// ---------------------------------------------------------------------------
// Error boundary props
// ---------------------------------------------------------------------------

export type ErrorBoundaryProps = {
	readonly children: ReactNode;
	readonly fallback?: (error: Error, errorInfo?: ErrorInfo) => ReactNode;
	readonly onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

// ---------------------------------------------------------------------------
// ErrorBoundary class component
// (React requires class components for error boundaries - the ONE exception)
// ---------------------------------------------------------------------------

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: undefined,
			errorInfo: undefined,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return {
			hasError: true,
			error,
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		this.setState({ errorInfo });
		this.props.onError?.(error, errorInfo);
	}

	resetError(): void {
		this.setState({
			hasError: false,
			error: undefined,
			errorInfo: undefined,
		});
	}

	render(): ReactNode {
		if (this.state.hasError && this.state.error !== undefined) {
			if (this.props.fallback !== undefined) {
				return this.props.fallback(this.state.error, this.state.errorInfo);
			}

			// Default: return null (ErrorOverview should be used as fallback)
			return null;
		}

		return this.props.children;
	}
}
