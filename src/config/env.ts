// eslint-disable-next-line @typescript-eslint/no-explicit-any -- window.__PROCESS_VAB_FE_ENV__ is injected at runtime via runtime-config.js and has no type definition
function readRuntimeGlobal(): any {
  return (window as any).__PROCESS_VAB_FE_ENV__ ?? {};
}

/**
 * Centralized environment configuration.
 *
 * In development (npm run dev): values come from VITE_* in .env via Vite.
 * In Docker containers: RUNTIME_* values are injected into
 * window.__PROCESS_VAB_FE_ENV__ at startup and take precedence over any
 * build-time baked values.
 *
 * Namespaced (not window._env_): this app is loaded as a Module Federation
 * remote inside a shell that shares one window with it, so a shared global
 * would let this app's config leak into — or be clobbered by — the shell's.
 */
export const env = {
  bffUrl: readRuntimeGlobal().RUNTIME_BFF_URL || import.meta.env.VITE_BFF_URL || "",
};

// Standalone (npm run dev / preview): index.html's own <script> tag has
// already run runtime-config.js before this module executes, so `env`
// above is already correct.
//
// As a Module Federation remote inside a shell (e.g. loaded by
// portal-handlaggare): only this JS chunk is loaded, never this app's own
// index.html, so that <script> tag never runs and window.__PROCESS_VAB_FE_ENV__
// stays unset. ensureEnvLoaded self-loads runtime-config.js from this app's
// own origin instead, resolved via import.meta.url — which always points at
// this module's own deployed URL, regardless of which host imported it.
let runtimeEnvReady: Promise<void> | null = null;

export function ensureEnvLoaded(): Promise<void> {
  if (!runtimeEnvReady) {
    runtimeEnvReady = new Promise<void>((resolve) => {
      if (Object.keys(readRuntimeGlobal()).length > 0) {
        resolve();
        return;
      }
      try {
        const ownOrigin = new URL(import.meta.url).origin;
        const script = document.createElement("script");
        script.src = `${ownOrigin}/runtime-config.js`;
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);
      } catch {
        // Loading runtime-config.js is best-effort: e.g. some test
        // environments disable script loading and throw synchronously
        // instead of firing onerror. Fall back to the VITE_*/default value.
        resolve();
      }
    }).then(() => {
      const runtimeEnv = readRuntimeGlobal();
      env.bffUrl = runtimeEnv.RUNTIME_BFF_URL || env.bffUrl;
    });
  }
  return runtimeEnvReady;
}
