import React, { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type State = {
  hasError: boolean;
  error: Error | null;
};

/**
 * Install global handlers for JS errors and unhandled promise rejections
 * that happen outside of React's render cycle (async code, event handlers,
 * timers, native callbacks, etc.). Call once at app startup.
 */
export function installGlobalErrorHandlers() {
  // Catch uncaught JS errors
  const defaultHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.log(`[GlobalError] ${isFatal ? 'FATAL' : 'non-fatal'}:`, error.message);
    console.log('[GlobalError] Stack:', error.stack);
    // Still call the default handler so RN's red box / LogBox shows up in dev
    defaultHandler(error, isFatal);
  });

  // Catch unhandled promise rejections
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const tracking = require('promise/setimmediate/rejection-tracking');
  tracking.enable({
    allRejections: true,
    onUnhandled: (_id: number, rejection: Error | string) => {
      const message = rejection instanceof Error ? rejection.message : String(rejection);
      const stack = rejection instanceof Error ? rejection.stack : undefined;
      console.log('[UnhandledPromise] Rejection:', message);
      if (stack) console.log('[UnhandledPromise] Stack:', stack);
    },
  });
}

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.log('[ErrorBoundary] Caught render error:', error.message);
    console.log('[ErrorBoundary] Stack:', error.stack);
    console.log('[ErrorBoundary] Component stack:', info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>🚇</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#000',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
});
