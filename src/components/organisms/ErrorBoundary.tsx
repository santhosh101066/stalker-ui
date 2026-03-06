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
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
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
        if (this.state.hasError && (event.key === 'Enter' || event.keyCode === 13)) {
            this.handleReload();
        }
    };

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 font-sans text-gray-200">
                    <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center border border-gray-700">
                        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                        <h1 className="text-2xl font-bold text-white mb-4">Something went wrong</h1>
                        <p className="text-gray-400 mb-8">
                            We're sorry, but an unexpected error occurred. Please try reloading the application.
                        </p>
                        <button
                            onClick={this.handleReload}
                            className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                        >
                            <RefreshCw className="w-5 h-5 mr-4" />
                            Reload Application
                        </button>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mt-8 text-left bg-gray-900 p-4 rounded overflow-auto border border-gray-700 max-h-48 text-xs text-red-400 font-mono break-all whitespace-pre-wrap">
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
