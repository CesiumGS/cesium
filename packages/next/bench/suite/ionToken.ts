import ionSource from "../../../engine/Source/Core/Ion.js?raw";

/**
 * The ion token Dyno's views use, first found: pasted in the Viewer (this
 * session, or remembered on this device), VITE_ION_TOKEN (.env.local),
 * CesiumJS's evaluation token (public assets only).
 */

/**
 * CesiumJS's public evaluation token, read from the 1.x source (kept current
 * by the repo's token workflow) rather than copied here.
 */
export const DEFAULT_ION_TOKEN = /defaultAccessToken =\s*"([^"]+)"/.exec(
  ionSource,
)?.[1];

/** Where the Viewer keeps a pasted token. */
export const TOKEN_KEY = "viewer.ionToken";

/** The pasted ion token (this session, or remembered on this device). */
export function readToken(): string | undefined {
  try {
    return (
      sessionStorage.getItem(TOKEN_KEY) ??
      localStorage.getItem(TOKEN_KEY) ??
      undefined
    );
  } catch {
    return undefined;
  }
}

export const envToken = import.meta.env.VITE_ION_TOKEN as string | undefined;

/** The token to use now. */
export const ionToken = (): string | undefined =>
  readToken() ?? envToken ?? DEFAULT_ION_TOKEN;
