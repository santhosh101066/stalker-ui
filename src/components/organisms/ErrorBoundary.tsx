import { Component, type ReactNode, type ErrorInfo } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public componentDidMount() {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  public componentWillUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    if (
      this.state.hasError &&
      (event.key === 'Enter' || event.keyCode === 13)
    ) {
      this.handleReload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-6 font-sans text-gray-200">
          <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-800 p-8 text-center shadow-xl">
            <AlertTriangle className="mx-auto mb-6 h-16 w-16 text-red-500" />
            <h1 className="mb-4 text-2xl font-bold text-white">
              Something went wrong
            </h1>
            <p className="mb-8 text-gray-400">
              We're sorry, but an unexpected error occurred. Please try
              reloading the application.
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <RefreshCw className="mr-4 h-5 w-5" />
              Reload Application
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded border border-gray-700 bg-gray-900 p-4 text-left font-mono text-xs text-red-400">
                {this.state.error.stack || this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
