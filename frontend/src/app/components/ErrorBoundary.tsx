'use client';

import { Component, ReactNode } from 'react';

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
        <div className="mx-auto mt-6 max-w-xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">Application error</p>
          <p className="text-sm">{this.state.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}
