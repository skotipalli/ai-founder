/**
 * Single source of truth for the app's basePath. Used by next.config.ts
 * (server-side routing) and by client code that calls fetch/EventSource
 * directly, since Next.js only auto-prefixes its own router/asset URLs,
 * not raw fetch() or EventSource() calls.
 */
export const BASE_PATH = "/hitl";

export function apiPath(path: string): string {
  return `${BASE_PATH}${path}`;
}
