import React, { Component, ReactNode, ErrorInfo } from 'react';
import { RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleResetCache = () => {
    try {
      localStorage.removeItem('airiser_sticky_notes');
      localStorage.removeItem('airiser_notepad');
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-6 select-none font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">
              Workspace Recovery
            </h2>
            
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              An unexpected error occurred while rendering the workspace. Your settings and tasks are preserved.
            </p>

            <div className="flex flex-col w-full gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>

              <button
                onClick={this.handleResetCache}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                Clear Stored Notes & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this.props as ErrorBoundaryProps).children;
  }
}
