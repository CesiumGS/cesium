import { sha256 } from "./sha265.js";

/**
 * Dead-simple in-memory or in-localStorage store for OAuth state/code_verifier pairs with
 * 1 minute expiration
 * Works server-side, but is not recommended for production use there; you'll want a database
 * table for this if you can spare it, as it uses ~150 bytes per actively logging in user, and
 * public abuse could easily kill your server.
 */
const MAX_AGE = 60 * 1000;
const STORAGE_KEY = "cesium-oauth2-pkce-store";

export type UUID = ReturnType<typeof crypto.randomUUID>;
type PkceState = {
  codeVerifier: UUID;
  /** created timestamp in ms */
  createdAt: number;
  previousPage: string;
};
type PkceStore = Record<UUID, PkceState>;

const storage: PkceStore = JSON.parse(
  globalThis?.localStorage?.getItem?.(STORAGE_KEY) ?? "{}",
);

function stow() {
  globalThis?.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(storage));
}

function tidyAndGetStates() {
  const now = Date.now();
  // Clean up entries in the store older than MAX_AGE
  for (const oldState of Object.keys(storage) as Array<keyof PkceStore>) {
    if (now - (storage[oldState]?.createdAt ?? 0) > MAX_AGE) {
      delete storage[oldState];
    }
  }
  return storage;
}

export async function getPkceState(
  stateId: UUID,
): Promise<PkceState | undefined> {
  const record = tidyAndGetStates()[stateId];
  delete storage[stateId];
  stow();
  return record;
}

export async function newPkceState() {
  const crypto = globalThis.crypto;
  const stateId = crypto.randomUUID();
  const codeVerifier = crypto.randomUUID();
  tidyAndGetStates()[stateId] = {
    codeVerifier,
    createdAt: Date.now(),
    previousPage: window.location.href,
  };
  stow();
  return {
    stateId: stateId,
    // Calculate and return the challenge
    codeChallenge: await sha256(codeVerifier),
  };
}
