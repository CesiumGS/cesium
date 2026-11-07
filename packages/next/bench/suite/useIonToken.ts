import { useMemo, useSyncExternalStore } from "react";
import {
  ionToken,
  isRemembered,
  onTokenChange,
  tokenSource,
  type TokenSource,
} from "./ionToken.ts";

export interface IonTokenState {
  /** The token in use (ionToken()). */
  token: string | undefined;
  source: TokenSource;
  /** The pasted token is kept on this device, not only this session. */
  remembered: boolean;
}

// One string, so React compares snapshots by value.
const snapshot = () =>
  `${tokenSource()}\u0000${isRemembered() ? 1 : 0}\u0000${ionToken() ?? ""}`;

/** Dyno's ion token, kept current as it is pasted or cleared anywhere. */
export function useIonToken(): IonTokenState {
  const key = useSyncExternalStore(onTokenChange, snapshot);
  return useMemo(() => {
    const [source, remembered, token] = key.split("\u0000");
    return {
      token: token || undefined,
      source: source as TokenSource,
      remembered: remembered === "1",
    };
  }, [key]);
}
