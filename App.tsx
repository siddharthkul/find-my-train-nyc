import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary, installGlobalErrorHandlers } from './src/components/ErrorBoundary';
import { MapScreen } from './src/screens/MapScreen';

installGlobalErrorHandlers();

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <MapScreen />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
