import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected interface error occurred.',
    };
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#141414] border border-neutral-800 rounded-xl p-6 space-y-4">
            <h1 className="text-base font-semibold text-neutral-100">
              Something went wrong in the interface
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 transition-colors"
            >
              Restore Assistant
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
