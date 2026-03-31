import { useRef, useCallback } from 'react';
import { Peavy } from '../Peavy';

/**
 * Hook that logs screen changes when integrated with React Navigation.
 *
 * Usage:
 * ```tsx
 * import { useNavigationTracking } from '@peavy-log/react-native/hooks';
 *
 * function App() {
 *   const { onReady, onStateChange, navigationRef } = useNavigationTracking();
 *   return (
 *     <NavigationContainer
 *       ref={navigationRef}
 *       onReady={onReady}
 *       onStateChange={onStateChange}
 *     >
 *       ...
 *     </NavigationContainer>
 *   );
 * }
 * ```
 */
export function useNavigationTracking() {
  const navigationRef = useRef<any>(null);
  const routeNameRef = useRef<string | undefined>(undefined);

  const onReady = useCallback(() => {
    routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
  }, []);

  const onStateChange = useCallback(() => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

    if (previousRouteName !== currentRouteName && currentRouteName) {
      Peavy.i(`Screen changed to ${currentRouteName}`);
    }

    routeNameRef.current = currentRouteName;
  }, []);

  return { navigationRef, onReady, onStateChange };
}
