'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto mt-8 max-w-[640px] rounded-xl border border-red-200 bg-white p-5 shadow-sm dark:border-red-900 dark:bg-slate-900">
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Application error</p>
              <p className="mt-1 break-words text-sm leading-6 text-slate-600 dark:text-slate-400">{this.state.message || 'Terjadi kesalahan tak terduga.'}</p>
              <button onClick={() => this.setState({ hasError: false, message: '' })} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-black dark:bg-white dark:text-slate-900">
                <RefreshCw className="h-4 w-4" /> Coba lagi
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
