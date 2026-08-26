import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    // Send to backend for debugging
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message + '\n' + error.stack + '\n' + errorInfo.componentStack })
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-stone-800 mb-2">Oops! Algo salió mal.</h1>
            <p className="text-stone-600 mb-8">
              Ha ocurrido un error inesperado en la aplicación. Nuestro equipo ha sido notificado.
            </p>
            
            <div className="p-4 bg-red-50 rounded-lg text-left mb-8 overflow-auto max-h-32">
              <p className="text-sm font-mono text-red-800">
                {this.state.error?.message || 'Error desconocido'}
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-stone-900 text-white py-3 px-4 rounded-xl hover:bg-stone-800 transition-colors font-medium"
            >
              <RefreshCcw size={18} />
              Recargar la página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
