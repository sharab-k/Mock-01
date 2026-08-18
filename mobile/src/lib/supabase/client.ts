import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — copy mobile/.env.example to mobile/.env.local and fill them in.',
  );
}

// SecureStore has a ~2KB per-key limit on some platforms, which a Supabase
// session blob (access + refresh token + user metadata) can exceed. Chunking
// large values across multiple SecureStore keys is the standard workaround
// (same approach Supabase's own React Native guide documents) — AsyncStorage
// alone would be simpler but stores the session unencrypted on-device.
const CHUNK_SIZE = 1800;

const ChunkedSecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const first = await SecureStore.getItemAsync(key);
    if (first === null) return null;
    if (!first.startsWith('__chunked__:')) return first;

    const chunkCount = Number(first.split(':')[1]);
    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, i) => SecureStore.getItemAsync(`${key}_${i}`)),
    );
    return chunks.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(key, `__chunked__:${chunkCount}`);
    await Promise.all(
      Array.from({ length: chunkCount }, (_, i) =>
        SecureStore.setItemAsync(`${key}_${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)),
      ),
    );
  },
  async removeItem(key: string): Promise<void> {
    const first = await SecureStore.getItemAsync(key);
    if (first?.startsWith('__chunked__:')) {
      const chunkCount = Number(first.split(':')[1]);
      await Promise.all(Array.from({ length: chunkCount }, (_, i) => SecureStore.deleteItemAsync(`${key}_${i}`)));
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// Web (react-native-web, e.g. the browser preview) has no SecureStore —
// AsyncStorage is the correct fallback there since it's dev-only tooling,
// never a production build target for this app. AsyncStorage's web
// implementation reaches for `window.localStorage`, though, which doesn't
// exist during Expo Router's web SSR pass (Node, no `window`) — this client
// is a module-level singleton that Supabase initializes eagerly on import,
// so an unguarded AsyncStorage call there crashes the whole SSR render, not
// just this request. No-op during SSR; the real browser storage takes over
// once the client hydrates.
const isServer = typeof window === 'undefined';
const webStorage = {
  getItem: (key: string) => (isServer ? Promise.resolve(null) : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) => (isServer ? Promise.resolve() : AsyncStorage.setItem(key, value)),
  removeItem: (key: string) => (isServer ? Promise.resolve() : AsyncStorage.removeItem(key)),
};

const storage = Platform.OS === 'web' ? webStorage : ChunkedSecureStoreAdapter;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
