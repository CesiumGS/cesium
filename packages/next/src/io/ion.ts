/**
 * Cesium ion asset resolution: exchanges an access token for an asset's
 * endpoint (its root URL and a short-lived asset token). Requests for the
 * asset and everything it references carry the returned headers.
 */

export interface IonAsset {
  /** Root resource of the asset, e.g. a tileset.json URL. */
  url: string;
  /** Headers for every request under the asset (Authorization: Bearer). */
  headers: Record<string, string>;
  type: string;
}

export interface IonOptions {
  accessToken: string;
  /** ion API server; defaults to the public Cesium ion. */
  server?: string;
}

export async function resolveIonAsset(
  assetId: number,
  options: IonOptions,
): Promise<IonAsset> {
  const server = options.server ?? "https://api.cesium.com/";
  const response = await fetch(
    new URL(`v1/assets/${assetId}/endpoint`, server),
    {
      headers: { Authorization: `Bearer ${options.accessToken}` },
    },
  );
  if (!response.ok) {
    throw new Error(
      `ion asset ${assetId}: endpoint request failed (${response.status})`,
    );
  }
  const endpoint = (await response.json()) as {
    url: string;
    accessToken: string;
    type: string;
  };
  return {
    url: endpoint.url,
    headers: { Authorization: `Bearer ${endpoint.accessToken}` },
    type: endpoint.type,
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
