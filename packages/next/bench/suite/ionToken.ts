import ionSource from "../../../engine/Source/Core/Ion.js?raw";

/**
 * The Cesium ion token every Dyno view, example, Lab page and benchmark
 * uses, first found: the one pasted in Dyno's ion token settings (this
 * session, or remembered on this device), VITE_ION_TOKEN from .env.local
 * (dev server only: production builds never contain it), CesiumJS's
 * evaluation token (public assets only).
 *
 * The token never goes into a URL, a log, a report or the console: code
 * passes it to ion requests and nothing else.
 */

/**
 * CesiumJS's public evaluation token, read from the 1.x source (kept current
 * by the repo's token workflow) rather than copied here.
 */
export const DEFAULT_ION_TOKEN = /defaultAccessToken =\s*"([^"]+)"/.exec(
  ionSource,
)?.[1];

/**
 * Where a pasted token is kept (the name predates the Dyno-wide setting).
 * A storage key, not a secret: Snyk's "hardcoded non-cryptographic secret"
 * here is a false positive.
 */
export const TOKEN_KEY = "viewer.ionToken";

/** Where the token in use came from. */
export type TokenSource = "pasted" | "env" | "evaluation" | "none";

const nonEmpty = (value: string | null | undefined): string | undefined =>
  value?.trim() ? value.trim() : undefined;

/** The pasted ion token (this session, or remembered on this device). */
export function readToken(): string | undefined {
  try {
    return (
      nonEmpty(sessionStorage.getItem(TOKEN_KEY)) ??
      nonEmpty(localStorage.getItem(TOKEN_KEY))
    );
  } catch {
    return undefined;
  }
}

/** Whether the pasted token is remembered on this device. */
export function isRemembered(): boolean {
  try {
    return nonEmpty(localStorage.getItem(TOKEN_KEY)) !== undefined;
  } catch {
    return false;
  }
}

/**
 * VITE_ION_TOKEN from .env.local, on the dev server only. Vite replaces both
 * `import.meta.env` reads at build time: in a production build the
 * condition is `false` and the token's string is dropped with its branch
 * (and `keepEnvSecretsOut` in vite.config.ts fails a build that still has
 * it).
 */
export function envToken(): string | undefined {
  return import.meta.env.DEV
    ? nonEmpty(import.meta.env.VITE_ION_TOKEN as string | undefined)
    : undefined;
}

/** A token of the person's own (pasted, or .env.local in dev), not the evaluation one. */
export const userToken = (): string | undefined => readToken() ?? envToken();

/** The token to use now. */
export const ionToken = (): string | undefined =>
  userToken() ?? DEFAULT_ION_TOKEN;

/** Where `ionToken()` comes from now. */
export function tokenSource(): TokenSource {
  return readToken()
    ? "pasted"
    : envToken()
      ? "env"
      : DEFAULT_ION_TOKEN
        ? "evaluation"
        : "none";
}

const CHANGED = "dyno:ion-token";
const OPEN_SETTINGS = "dyno:ion-token-settings";

/**
 * Keeps `token` for this session, or on this device with `remember`; none
 * clears it. Every view hears of it (`onTokenChange`).
 */
export function saveToken(token: string | undefined, remember: boolean): void {
  const value = nonEmpty(token);
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    if (value) {
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, value);
    }
  } catch {
    // Storage blocked: nothing is kept, and the source stays as it was.
  }
  dispatchEvent(new Event(CHANGED));
}

/** Calls `listener` when the token changes, here or in another tab. */
export function onTokenChange(listener: () => void): () => void {
  const storage = (e: StorageEvent) => {
    if (e.key === null || e.key === TOKEN_KEY) {
      listener();
    }
  };
  addEventListener(CHANGED, listener);
  addEventListener("storage", storage);
  return () => {
    removeEventListener(CHANGED, listener);
    removeEventListener("storage", storage);
  };
}

/** Opens Dyno's ion token settings (the shell's rail item). */
export const openTokenSettings = (): void => {
  dispatchEvent(new Event(OPEN_SETTINGS));
};

/** Calls `listener` when a view asks for the token settings. */
export function onOpenTokenSettings(listener: () => void): () => void {
  addEventListener(OPEN_SETTINGS, listener);
  return () => removeEventListener(OPEN_SETTINGS, listener);
}

/**
 * Whether `error` is ion turning content away for want of a token: none at
 * all, or one ion refused (401, 403), or (with only the evaluation token)
 * an asset outside its reach (404). The person's own token getting a 404
 * means the asset isn't in their account, which a new token won't fix.
 */
export function needsToken(
  error: unknown,
  source: TokenSource = tokenSource(),
): boolean {
  const text = error instanceof Error ? error.message : String(error);
  if (/ion asset \d+: no access token/.test(text)) {
    return true;
  }
  const status = /ion asset \d+: endpoint request failed \((\d{3})\)/.exec(
    text,
  )?.[1];
  return (
    status === "401" ||
    status === "403" ||
    (status === "404" && (source === "evaluation" || source === "none"))
  );
}

/** The end of an error for a page that needs the person's own token. */
export const NEEDS_TOKEN =
  "needs a Cesium ion token: paste one in Dyno (ion token, in the rail), or set VITE_ION_TOKEN in packages/next/.env.local for the dev server";

/** The person's own token, or an error saying where `who` gets one. */
export function requireToken(who: string): string {
  const token = userToken();
  if (!token) {
    throw new Error(`${who} ${NEEDS_TOKEN}`);
  }
  return token;
}
