import type sodiumModule from 'libsodium-wrappers-sumo';

// libsodium (the "sumo" build, which includes Argon2id) is loaded the first
// time something needs it, so the app doesn't pay for it at start-up.
// It runs as WebAssembly, which the site's Content-Security-Policy allows
// with 'wasm-unsafe-eval' (and nothing more).

export type Sodium = typeof sodiumModule;

let loading: Promise<Sodium> | null = null;

export function loadSodium(): Promise<Sodium> {
  loading ??= import('libsodium-wrappers-sumo')
    .then(async (module) => {
      const sodium = module.default;
      await sodium.ready;
      return sodium;
    })
    .catch((error: unknown) => {
      loading = null;
      throw error;
    });
  return loading;
}
