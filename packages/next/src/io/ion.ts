/**
 * Cesium ion asset resolution: exchanges an access token for an asset's
 * endpoint (its root URL and a short-lived asset token). Requests for the
 * asset and everything it references carry the returned headers.
 */

/** A required attribution, as HTML from the ion API. */
export interface IonAttribution {
  html: string;
  /** False: must be shown on screen; true: may be listed behind a toggle. */
  collapsible: boolean;
}

export interface IonAsset {
  /** Root resource of the asset, e.g. a tileset.json URL. */
  url: string;
  /** Headers for every request under the asset (Authorization: Bearer). */
  headers: Record<string, string>;
  type: string;
  /**
   * Attributions the asset requires on screen, as HTML from the ion API
   * (e.g. the Cesium ion and Google logos).
   */
  attributions: IonAttribution[];
}

export interface IonOptions {
  /** Overrides `ionDefaults.accessToken` for this asset. */
  accessToken?: string;
  /** Overrides `ionDefaults.server`. */
  server?: string;
}

/**
 * Defaults for every ion request, as 1.x `Ion.defaultAccessToken` and
 * `Ion.defaultServer`; a call's options override them. Unlike 1.x no token
 * is built in: the application sets one.
 */
export const ionDefaults: { accessToken?: string; server: string } = {
  server: "https://api.cesium.com/",
};

/**
 * Resolved endpoints, reused for 45 minutes: ion's asset tokens last about
 * an hour, and an endpoint request costs a round trip (300 ms or more)
 * every time content is switched. Failures are not kept.
 */
const endpointCache = new Map<
  string,
  { expires: number; asset: Promise<IonAsset> }
>();
const ENDPOINT_TTL_MS = 45 * 60 * 1000;

export function resolveIonAsset(
  assetId: number,
  options: IonOptions = {},
): Promise<IonAsset> {
  const key = JSON.stringify([
    assetId,
    options.accessToken ?? ionDefaults.accessToken ?? "",
    options.server ?? ionDefaults.server,
  ]);
  const cached = endpointCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.asset;
  }
  const asset = fetchIonAsset(assetId, options);
  endpointCache.set(key, { expires: Date.now() + ENDPOINT_TTL_MS, asset });
  asset.catch(() => endpointCache.delete(key));
  return asset;
}

async function fetchIonAsset(
  assetId: number,
  options: IonOptions,
): Promise<IonAsset> {
  const accessToken = options.accessToken ?? ionDefaults.accessToken;
  if (!accessToken) {
    throw new Error(
      `ion asset ${assetId}: no access token (set ionDefaults.accessToken or pass one)`,
    );
  }
  const server = options.server ?? ionDefaults.server;
  const response = await fetch(
    new URL(`v1/assets/${assetId}/endpoint`, server),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) {
    throw new Error(
      `ion asset ${assetId}: endpoint request failed (${response.status})`,
    );
  }
  const endpoint = (await response.json()) as {
    url?: string;
    accessToken?: string;
    type: string;
    externalType?: string;
    options?: { url?: string };
    attributions?: Array<{ html: string; collapsible?: boolean }>;
  };
  // Non-collapsible attributions must stay on screen (1.x shows them in
  // the credit bar); collapsible ones may go behind "Data attribution".
  const attributions = (endpoint.attributions ?? []).map((a) => ({
    html: a.html,
    collapsible: a.collapsible === true,
  }));
  if (endpoint.externalType) {
    // Assets ion proxies to another service (e.g. Google Photorealistic 3D
    // Tiles): the URL carries that service's key; requests send no ion token.
    if (endpoint.externalType !== "3DTILES" || !endpoint.options?.url) {
      throw new Error(
        `ion asset ${assetId}: external type ${endpoint.externalType} not supported`,
      );
    }
    return {
      url: endpoint.options.url,
      headers: {},
      type: endpoint.type,
      attributions,
    };
  }
  return {
    url: endpoint.url!,
    headers: { Authorization: `Bearer ${endpoint.accessToken}` },
    type: endpoint.type,
    attributions,
  };
}

/**
 * Resolves `uri` against `base`, carrying over the base's query parameters
 * (ion versions assets with `?v=`), as 1.x `Resource` does.
 */
export function resolveUri(uri: string, base: string): string {
  const resolved = new URL(uri, base);
  new URL(base).searchParams.forEach((value, key) => {
    if (!resolved.searchParams.has(key)) {
      resolved.searchParams.set(key, value);
    }
  });
  return resolved.href;
}
