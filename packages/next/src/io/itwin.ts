/**
 * iTwin Platform mesh export: resolves an iModel to the tileset.json of its
 * latest complete 3D Tiles export, as 1.x `ITwinData.createTilesetFromIModelId`.
 * The export link is signed (its query is the credential, valid about an
 * hour), and `resolveUri` carries that query to every resource under it.
 */

export interface ITwinOptions {
  /** iTwin share key (sent as `Basic`), or else an OAuth access token. */
  shareKey?: string;
  accessToken?: string;
  /** A specific changeset; the latest export otherwise. */
  changesetId?: string;
  /** Platform API root; defaults to the public iTwin Platform. */
  server?: string;
}

interface MeshExport {
  status: "NotStarted" | "InProgress" | "Complete" | "Invalid";
  _links: { mesh: { href: string } };
}

/**
 * Resolved exports, reused for 45 minutes: the signed links last about an
 * hour, and the export lookup takes over a second. Failures are not kept.
 */
const exportCache = new Map<
  string,
  { expires: number; result: Promise<{ url: string }> }
>();
const EXPORT_TTL_MS = 45 * 60 * 1000;

export function resolveITwinIModel(
  iModelId: string,
  options: ITwinOptions,
): Promise<{ url: string }> {
  const key = JSON.stringify([
    iModelId,
    options.shareKey ?? "",
    options.accessToken ?? "",
    options.changesetId ?? "",
    options.server ?? "",
  ]);
  const cached = exportCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.result;
  }
  const result = fetchITwinIModel(iModelId, options);
  exportCache.set(key, { expires: Date.now() + EXPORT_TTL_MS, result });
  result.catch(() => exportCache.delete(key));
  return result;
}

async function fetchITwinIModel(
  iModelId: string,
  options: ITwinOptions,
): Promise<{ url: string }> {
  const authorization = options.shareKey
    ? `Basic ${options.shareKey}`
    : options.accessToken
      ? `Bearer ${options.accessToken}`
      : undefined;
  if (!authorization) {
    throw new Error("iTwin: a share key or access token is required");
  }
  const url = new URL(
    "mesh-export",
    options.server ?? "https://api.bentley.com/",
  );
  url.searchParams.set("iModelId", iModelId);
  url.searchParams.set("exportType", "3DTILES");
  url.searchParams.set("$top", "5");
  url.searchParams.set("client", "CesiumJS");
  if (options.changesetId) {
    url.searchParams.set("changesetId", options.changesetId);
  }
  const response = await fetch(url, {
    headers: {
      Authorization: authorization,
      Accept: "application/vnd.bentley.itwin-platform.v1+json",
      Prefer: "return=representation",
    },
  });
  if (!response.ok) {
    throw new Error(`iTwin mesh export: request failed (${response.status})`);
  }
  const { exports } = (await response.json()) as { exports: MeshExport[] };
  const complete = exports.find((e) => e.status === "Complete");
  if (!complete) {
    throw new Error(
      exports.length > 0 && exports.every((e) => e.status === "Invalid")
        ? "iTwin mesh export: every export of this iModel is invalid"
        : "iTwin mesh export: no complete 3D Tiles export yet",
    );
  }
  const tileset = new URL(complete._links.mesh.href);
  tileset.pathname = `${tileset.pathname}/tileset.json`;
  return { url: tileset.toString() };
}
