/**
 * Cesium ion asset resolution: exchanges an access token for an asset's
 * endpoint (its root URL and a short-lived asset token). Requests for the
 * asset and everything it references carry the returned headers, a
 * renewable `Credential`'s: a 401 fetches the endpoint again and the
 * request is made once more with the new asset token (fetchProvider.ts).
 */
import { Credential, engineFetch } from "./fetchProvider.ts";

/**
 * A required attribution, as HTML: from the ion API, or from any content
 * source. It belongs to the content (`Tileset3D.attributions`,
 * `ImageryProvider.attributions`), so whatever shows the content credits it.
 */
export interface Attribution {
  html: string;
  /** False: must be shown on screen; true: may be listed behind a toggle. */
  collapsible: boolean;
}

export interface IonAsset {
  /** Root resource of the asset, e.g. a tileset.json URL. */
  url: string;
  /**
   * Headers for every request under the asset (Authorization: Bearer): a
   * `Credential`'s, sent only to the asset's origin and renewed on a 401.
   */
  headers: Record<string, string>;
  type: string;
  /**
   * Attributions the asset requires on screen, as HTML from the ion API
   * (e.g. the Cesium ion and Google logos).
   */
  attributions: Attribution[];
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
  const endpoint = await ionEndpoint(assetId, options);
  // Non-collapsible attributions must stay on screen (1.x shows them in
  // the credit bar); collapsible ones may go behind "Data attribution".
  const attributions = ionAttributions(endpoint);
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
  const url = endpoint.url!;
  return {
    url,
    headers: ionCredential(assetId, options, endpoint).headers,
    type: endpoint.type,
    attributions,
  };
}

/** @internal What ion's endpoint request answers. */
export interface IonEndpoint {
  url?: string;
  accessToken?: string;
  type: string;
  externalType?: string;
  options?: { url?: string; key?: string; mapStyle?: string };
  attributions?: Array<{ html: string; collapsible?: boolean }>;
}

/**
 * @internal An asset's endpoint (`GET v1/assets/{id}/endpoint`), with the
 * access token of `options` or `ionDefaults`, read when it is called (so
 * an application's new token is used by the next refresh).
 */
export async function ionEndpoint(
  assetId: number,
  options: IonOptions,
): Promise<IonEndpoint> {
  const accessToken = options.accessToken ?? ionDefaults.accessToken;
  if (!accessToken) {
    throw new Error(
      `ion asset ${assetId}: no access token (set ionDefaults.accessToken or pass one)`,
    );
  }
  const server = options.server ?? ionDefaults.server;
  const response = await engineFetch(
    new URL(`v1/assets/${assetId}/endpoint`, server),
    {
      kind: "endpoint",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok) {
    throw new Error(
      `ion asset ${assetId}: endpoint request failed (${response.status})`,
    );
  }
  return (await response.json()) as IonEndpoint;
}

/** @internal An endpoint's attributions. */
export function ionAttributions(endpoint: IonEndpoint): Attribution[] {
  return (endpoint.attributions ?? []).map((a) => ({
    html: a.html,
    collapsible: a.collapsible === true,
  }));
}

/**
 * @internal The asset token of an endpoint as a renewable credential: sent
 * only to the endpoint URL's origin (as 1.x's `IonResource`), and renewed
 * after a 401 by asking for the endpoint again.
 */
export function ionCredential(
  assetId: number,
  options: IonOptions,
  endpoint: IonEndpoint,
): Credential {
  return new Credential(
    { headers: { Authorization: `Bearer ${endpoint.accessToken ?? ""}` } },
    {
      ...(endpoint.url ? { origins: [new URL(endpoint.url).origin] } : {}),
      refresh: async () => {
        const next = await ionEndpoint(assetId, options);
        return next.accessToken
          ? { headers: { Authorization: `Bearer ${next.accessToken}` } }
          : undefined;
      },
    },
  );
}
