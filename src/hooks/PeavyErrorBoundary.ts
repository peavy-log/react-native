import { Component, ReactNode } from 'react';
import { Peavy } from '../Peavy';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary component that logs uncaught React errors via Peavy.
 *
 * Usage:
 * ```tsx
 * import { PeavyErrorBoundary } from '@peavy-log/react-native/hooks';
 *
 * <PeavyErrorBoundary fallback={<ErrorScreen />}>
 *   <App />
 * </PeavyErrorBoundary>
 * ```
 */
export class PeavyErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    const componentStack = info.componentStack || '';
    Peavy.e('React component error', {
      error,
      componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError && this.props.fallback) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
