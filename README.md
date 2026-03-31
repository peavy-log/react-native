# @peavy-log/react-native

Peavy remote logging library for React Native.

## Installation

```bash
npm install @peavy-log/react-native pako react-native-fs react-native-device-info
# or
yarn add @peavy-log/react-native pako react-native-fs react-native-device-info
```

For iOS, run `cd ios && pod install` after installation.

### Optional peer dependencies

```bash
# For automatic screen tracking
npm install @react-navigation/native

# For HTTP request tracing
npm install axios
```

## Quick Start

```typescript
import { Peavy, LogLevel } from '@peavy-log/react-native';

Peavy.init({
  endpoint: 'https://logs.example.com/ingest',
  logLevel: LogLevel.Debug,
});

Peavy.i('App started');
Peavy.d('Debug info', { userId: '123' });
Peavy.e('Something failed', new Error('Oops'));
```

## API

### Initialization

```typescript
Peavy.init(options: PeavyOptions)
```

### Logging

```typescript
Peavy.t(message, errorOrObj?)  // Trace
Peavy.d(message, errorOrObj?)  // Debug
Peavy.i(message, errorOrObj?)  // Info
Peavy.w(message, errorOrObj?)  // Warning
Peavy.e(message, errorOrObj?)  // Error

// Advanced builder
Peavy.log({
  level: LogLevel.Info,
  message: 'Custom log',
  json: { key: 'value' },
});
```

### Metadata

```typescript
Peavy.setMeta({ userId: '123', role: 'admin' });
Peavy.clearMeta();
```

### Runtime configuration

```typescript
Peavy.setOptions({
  endpoint: 'https://new-endpoint.com',
  logLevel: LogLevel.Trace,
  pushInterval: 30000,
});
```

### Event tracking

```typescript
import { EventType, EventResult } from '@peavy-log/react-native';

// Actions
Peavy.action('auth', 'login');
Peavy.action('auth', 'login', 'user123');
Peavy.action('auth', 'login', EventResult.Success);
Peavy.action('auth', 'login', 1250, EventResult.Success);

// State
Peavy.state('custom-state', 'value');

// Generic event
Peavy.ev(EventType.Action, 'category', 'name', 'ident', 0, EventResult.Success);
```

## React Navigation Integration

```tsx
import { useNavigationTracking } from '@peavy-log/react-native/hooks';
import { NavigationContainer } from '@react-navigation/native';

function App() {
  const { navigationRef, onReady, onStateChange } = useNavigationTracking();

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={onReady}
      onStateChange={onStateChange}
    >
      {/* screens */}
    </NavigationContainer>
  );
}
```

## Error Boundary

```tsx
import { PeavyErrorBoundary } from '@peavy-log/react-native/hooks';

<PeavyErrorBoundary fallback={<ErrorScreen />}>
  <App />
</PeavyErrorBoundary>
```

## Axios Integration

```typescript
import axios from 'axios';
import {
  peavyRequestInterceptor,
  peavyResponseInterceptor,
  peavyErrorInterceptor,
} from '@peavy-log/react-native/integrations/axios';

const client = axios.create({ baseURL: 'https://api.example.com' });
client.interceptors.request.use(peavyRequestInterceptor);
client.interceptors.response.use(peavyResponseInterceptor, peavyErrorInterceptor);
```

## Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `endpoint` | `string` | *required* | Remote URL for log submission |
| `logLevel` | `LogLevel` | `Info` | Minimum level to process |
| `printToConsole` | `boolean` | `false` | Echo logs to console |
| `debug` | `boolean` | `false` | Enable library debug logging |
| `pushInterval` | `number` | `15000` | Batch flush interval (ms) |
| `attachUncaughtHandler` | `boolean` | `true` | Catch unhandled JS errors |

App version, bundle ID, and device model are detected automatically via `react-native-device-info`.

## Log Levels

| Level | Value |
|---|---|
| Trace | 1 |
| Debug | 2 |
| Info | 3 |
| Warning | 4 |
| Error | 5 |

## License

MIT
