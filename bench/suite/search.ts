/**
 * Dyno's search params as plain strings (the router's default parses JSON,
 * which turns "2.0" into 2); each route's validateSearch types them. Shared
 * by the router (app.tsx) and the tests of links built through it.
 */
export function parseSearch(query: string): Record<string, unknown> {
  return Object.fromEntries(new URLSearchParams(query));
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
