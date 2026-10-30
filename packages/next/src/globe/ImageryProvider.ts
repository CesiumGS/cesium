/**
 * Imagery sources for the globe: where a tile's image comes from. Tiles are
 * addressed (x, y, level) with y counted from the north, as Web Mercator
 * (XYZ, Bing quadkeys) and geographic (WMTS) schemes do.
 */
import { ionDefaults, type IonAttribution } from "../io/ion.ts";

export interface ImageryProvider {
  readonly name: string;
  readonly tilingScheme: "webMercator" | "geographic";
  readonly minimumLevel: number;
  readonly maximumLevel: number;
  /** Tile width and height in pixels. */
  readonly tileSize: number;
  tileUrl(x: number, y: number, level: number): string;
  readonly headers?: Record<string, string>;
  /** Required on-screen credits (provider logos, ion). */
  readonly attributions: IonAttribution[];
}

/** XYZ tiles from a URL template with `{x}`, `{y}`, `{z}` (and `{s}`). */
export class UrlTemplateImagery implements ImageryProvider {
  readonly tilingScheme = "webMercator" as const;
  readonly tileSize: number;
  readonly minimumLevel: number;
  readonly maximumLevel: number;
  readonly attributions: IonAttribution[];

  constructor(
    readonly name: string,
    private readonly template: string,
    options: {
      subdomains?: string[];
      minimumLevel?: number;
      maximumLevel?: number;
      tileSize?: number;
      credit?: string;
    } = {},
  ) {
    this.subdomains = options.subdomains ?? [];
    this.minimumLevel = options.minimumLevel ?? 0;
    this.maximumLevel = options.maximumLevel ?? 19;
    this.tileSize = options.tileSize ?? 256;
    this.attributions = options.credit
      ? [{ html: options.credit, collapsible: false }]
      : [];
  }

  private readonly subdomains: string[];

  tileUrl(x: number, y: number, level: number): string {
    const s = this.subdomains.length
      ? this.subdomains[(x + y + level) % this.subdomains.length]!
      : "";
    return this.template
      .replace("{x}", String(x))
      .replace("{y}", String(y))
      .replace("{z}", String(level))
      .replace("{s}", s);
  }
}

/**
 * Bing Maps tiles (quadkeys), as ion serves its default imagery (asset 2).
 * Levels here are Web Mercator levels (one tile at level 0); Bing starts at
 * level 1, its quadkey length (1.x counts from there with 2×2 tiles).
 */
export class BingImagery implements ImageryProvider {
  readonly tilingScheme = "webMercator" as const;
  readonly minimumLevel = 1;

  private constructor(
    readonly name: string,
    private readonly template: string,
    private readonly subdomains: string[],
    readonly maximumLevel: number,
    readonly tileSize: number,
    readonly attributions: IonAttribution[],
  ) {}

  /**
   * The Bing imagery behind an ion asset (default: 2, Bing Maps Aerial),
   * resolved with the ion access token (`ionDefaults` or `accessToken`).
   */
  static async fromIon(
    assetId = 2,
    options: { accessToken?: string; server?: string } = {},
  ): Promise<BingImagery> {
    const accessToken = options.accessToken ?? ionDefaults.accessToken;
    if (!accessToken) {
      throw new Error(`ion asset ${assetId}: no access token`);
    }
    const server = options.server ?? ionDefaults.server;
    const response = await fetch(
      new URL(`v1/assets/${assetId}/endpoint`, server),
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) {
      throw new Error(
        `ion asset ${assetId}: endpoint request failed (${response.status})`,
      );
    }
    const endpoint = (await response.json()) as {
      type: string;
      externalType?: string;
      options?: { url?: string; key?: string; mapStyle?: string };
      attributions?: Array<{ html: string; collapsible?: boolean }>;
    };
    if (endpoint.type !== "IMAGERY" || endpoint.externalType !== "BING") {
      throw new Error(
        `ion asset ${assetId}: ${endpoint.externalType ?? endpoint.type} imagery is not supported`,
      );
    }
    const { url, key, mapStyle = "Aerial" } = endpoint.options ?? {};
    if (!url || !key) {
      throw new Error(`ion asset ${assetId}: Bing endpoint without url or key`);
    }
    const metadata = new URL(`REST/v1/Imagery/Metadata/${mapStyle}`, url);
    metadata.searchParams.set("incl", "ImageryProviders");
    metadata.searchParams.set("key", key);
    metadata.searchParams.set("uriScheme", "https");
    const meta = await (await fetch(metadata)).json();
    const resource = meta.resourceSets?.[0]?.resources?.[0];
    if (!resource?.imageUrl) {
      throw new Error("Bing metadata: no imageUrl");
    }
    const attributions = (endpoint.attributions ?? []).map((a) => ({
      html: a.html,
      collapsible: a.collapsible === true,
    }));
    return new BingImagery(
      `Bing Maps ${mapStyle}`,
      (resource.imageUrl as string).replace("{culture}", ""),
      resource.imageUrlSubdomains ?? [],
      resource.zoomMax ?? 21,
      resource.imageWidth ?? 256,
      attributions,
    );
  }

  tileUrl(x: number, y: number, level: number): string {
    let quadkey = "";
    for (let i = level; i > 0; i--) {
      const mask = 1 << (i - 1);
      quadkey += ((x & mask ? 1 : 0) + (y & mask ? 2 : 0)).toString();
    }
    const s = this.subdomains.length
      ? this.subdomains[(x + y + level) % this.subdomains.length]!
      : "";
    return this.template
      .replace("{quadkey}", quadkey)
      .replace("{subdomain}", s);
  }
}
