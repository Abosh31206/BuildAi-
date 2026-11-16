import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Произошла непредвиденная ошибка интерфейса',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-rose-200 rounded-xl shadow-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-bold">Ошибка в работе инженерного модуля</h2>
            </div>
            <p className="text-xs text-slate-600 font-mono bg-slate-50 p-3 rounded border border-slate-200 overflow-auto max-h-40">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Перезагрузить платформу</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
