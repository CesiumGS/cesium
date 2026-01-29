import { sha256 } from "./sha265.js";

/**
 * Dead-simple in-memory or in-localStorage store for OAuth state/code_verifier pairs with
 * 1 minute expiration
 * Works server-side, but is not recommended for production use there; you'll want a database
 * table for this if you can spare it, as it uses ~150 bytes per actively logging in user, and
 * public abuse could easily kill your server.
 */
const MAX_AGE = 60000;
const STORAGE_KEY = "cesium-oauth2-pkce-store";
const states = JSON.parse(
  globalThis?.localStorage?.getItem?.(STORAGE_KEY) ?? "{}",
);

function stow() {
  globalThis?.localStorage?.setItem?.(STORAGE_KEY, JSON.stringify(states));
}

function tidyStates() {
  const now = Date.now();
  // Clean up entries in the store older than MAX_AGE
  for (const oldState of Object.keys(states)) {
    if (now - (states[oldState]?.[1] ?? 0) > MAX_AGE) {
      delete states[oldState];
    }
  }
  return states;
}

// async because it would be if we were using a DB
export async function getVerifier(state: string) {
  const record = tidyStates()[state];
  delete states[state];
  stow();
  return record?.[0];
}

export async function newPkceState() {
  const crypto = globalThis.crypto;
  const state = crypto.randomUUID();
  const verifier = crypto.randomUUID();
  tidyStates()[state] = [verifier, Date.now()];
  stow();
  return [
    state,
    // Calculate and return the challenge
    await sha256(verifier),
  ];
}
