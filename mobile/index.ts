import * as Crypto from 'expo-crypto';
import { registerRootComponent } from 'expo';

import App from './App';

if (typeof globalThis.crypto !== 'object' || globalThis.crypto === null) {
  (globalThis as unknown as { crypto: Record<string, unknown> }).crypto = {};
}
if (typeof globalThis.crypto.getRandomValues !== 'function') {
  (
    globalThis.crypto as unknown as {
      getRandomValues: <T extends ArrayBufferView>(arr: T) => T;
    }
  ).getRandomValues = <T extends ArrayBufferView>(arr: T): T => {
    const bytes = Crypto.getRandomBytes(arr.byteLength);
    new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength).set(bytes);
    return arr;
  };
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
