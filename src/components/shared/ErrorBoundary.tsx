'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  errorPrefix?: string;
}
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="p-6 text-[var(--RD)] text-sm">
          {this.props.errorPrefix ?? 'Error inesperado'}: {this.state.error?.message}
        </div>
      );
    }
    return this.props.children;
  }
}

export function TranslatedErrorBoundary({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const t = useTranslations('errors');
  return (
    <ErrorBoundary errorPrefix={t('unexpected')} fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}
