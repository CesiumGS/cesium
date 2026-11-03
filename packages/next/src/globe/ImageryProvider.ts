/**
 * Imagery sources for the globe: where a tile's image comes from. Tiles are
 * addressed (x, y, level) with y counted from the north, as Web Mercator
 * (XYZ, Bing quadkeys) and geographic (WMTS) schemes do.
 */
import { ionDefaults, type IonAttribution } from "../io/ion.ts";
import bingLogoUrl from "./assets/bing_maps_credit.png";

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
  /**
   * Data credits for one tile (1.x `getTileCredits`): the imagery
   * providers whose coverage includes it.
   */
  tileCredits?(x: number, y: number, level: number): string[];
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
 * Imagery ion tiles and hosts itself (a Tile Map Service: rows counted from
 * the south), as `IonImageryProvider` reads it in 1.x: e.g. asset 3812,
 * NASA's Black Marble (the Earth at night, public domain), the `Viewer`'s
 * city lights. Web Mercator only.
 */
export class IonTmsImagery implements ImageryProvider {
  readonly tilingScheme = "webMercator" as const;
  readonly minimumLevel = 0;

  private constructor(
    readonly name: string,
    private readonly base: string,
    private readonly extension: string,
    readonly maximumLevel: number,
    readonly tileSize: number,
    readonly headers: Record<string, string>,
    readonly attributions: IonAttribution[],
  ) {}

  /**
   * The imagery behind an ion asset, resolved with the ion access token
   * (`ionDefaults` or `accessToken`); its tile map's levels and format.
   */
  static async fromIon(
    assetId: number,
    options: { accessToken?: string; server?: string } = {},
  ): Promise<IonTmsImagery> {
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
      url?: string;
      accessToken?: string;
      attributions?: Array<{ html: string; collapsible?: boolean }>;
    };
    if (endpoint.type !== "IMAGERY" || endpoint.externalType || !endpoint.url) {
      throw new Error(
        `ion asset ${assetId}: ${endpoint.externalType ?? endpoint.type} imagery is not ion's own tiles`,
      );
    }
    const headers = { Authorization: `Bearer ${endpoint.accessToken ?? ""}` };
    const map = await fetch(new URL("tilemapresource.xml", endpoint.url), {
      headers,
    });
    if (!map.ok) {
      throw new Error(`ion asset ${assetId}: no tile map (${map.status})`);
    }
    const xml = new DOMParser().parseFromString(await map.text(), "text/xml");
    const srs = xml.querySelector("SRS")?.textContent ?? "";
    if (!/3857|900913/.test(srs)) {
      throw new Error(`ion asset ${assetId}: ${srs} tiles are not supported`);
    }
    const format = xml.querySelector("TileFormat");
    const levels = [...xml.querySelectorAll("TileSet")].map((t) =>
      Number(t.getAttribute("href")),
    );
    return new IonTmsImagery(
      `ion ${assetId}`,
      endpoint.url,
      format?.getAttribute("extension") ?? "png",
      Math.max(...levels, 0),
      Number(format?.getAttribute("width") ?? 256),
      headers,
      (endpoint.attributions ?? []).map((a) => ({
        html: a.html,
        collapsible: a.collapsible === true,
      })),
    );
  }

  tileUrl(x: number, y: number, level: number): string {
    // Rows counted from the south.
    const row = 2 ** level - 1 - y;
    return new URL(`${level}/${x}/${row}.${this.extension}`, this.base).href;
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
    private readonly providers: BingProvider[],
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
    // ion's attributions and Bing's logo (1.x lists it in the credit
    // lightbox); the imagery providers are credited per tile drawn
    // (`tileCredits`).
    const attributions: IonAttribution[] = (endpoint.attributions ?? []).map(
      (a) => ({ html: a.html, collapsible: a.collapsible === true }),
    );
    attributions.push({
      html: `<a href="https://www.microsoft.com/en-us/maps/bing-maps/product"><img src="${bingLogoUrl}" title="Bing Imagery"/></a>`,
      collapsible: true,
    });
    const providers: BingProvider[] = [];
    for (const p of (resource.imageryProviders ?? []) as Array<{
      attribution?: string;
      coverageAreas?: Array<{
        bbox: [number, number, number, number];
        zoomMin: number;
        zoomMax: number;
      }>;
    }>) {
      if (p.attribution) {
        providers.push({
          attribution: p.attribution,
          areas: (p.coverageAreas ?? []).map((a) => ({
            south: a.bbox[0] * DEG,
            west: a.bbox[1] * DEG,
            north: a.bbox[2] * DEG,
            east: a.bbox[3] * DEG,
            zoomMin: a.zoomMin,
            zoomMax: a.zoomMax,
          })),
        });
      }
    }
    return new BingImagery(
      `Bing Maps ${mapStyle}`,
      (resource.imageUrl as string).replace("{culture}", ""),
      resource.imageUrlSubdomains ?? [],
      resource.zoomMax ?? 21,
      resource.imageWidth ?? 256,
      attributions,
      providers,
    );
  }

  /**
   * 1.x BingMapsImageryProvider.getTileCredits: providers with a coverage
   * area that intersects the tile, at a zoom within its range (Bing zooms
   * start at 1 where Web Mercator levels start at 0).
   */
  tileCredits(x: number, y: number, level: number): string[] {
    const n = 2 ** level;
    const west = (x / n) * 2 * Math.PI - Math.PI;
    const east = ((x + 1) / n) * 2 * Math.PI - Math.PI;
    const north = mercatorLatitude(y / n);
    const south = mercatorLatitude((y + 1) / n);
    const zoom = level + 1;
    return this.providers
      .filter((p) =>
        p.areas.some(
          (a) =>
            zoom >= a.zoomMin &&
            zoom <= a.zoomMax &&
            a.west <= east &&
            a.east >= west &&
            a.south <= north &&
            a.north >= south,
        ),
      )
      .map((p) => p.attribution);
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
    const url = this.template
      .replace("{quadkey}", quadkey)
      .replace("{subdomain}", s);
    // n=z: Bing answers a tile it has no imagery for with an empty body
    // instead of its "no imagery" placeholder, so the globe uses the
    // parent's (as 1.x asks).
    return `${url}${url.includes("?") ? "&" : "?"}n=z`;
  }
}

const DEG = Math.PI / 180;

/** A Bing imagery provider and where (radians) and at which zooms it is. */
interface BingProvider {
  attribution: string;
  areas: Array<{
    west: number;
    south: number;
    east: number;
    north: number;
    zoomMin: number;
    zoomMax: number;
  }>;
}

/** Latitude (radians) of a Web Mercator y in [0, 1] from the north. */
function mercatorLatitude(y: number): number {
  return Math.atan(Math.sinh(Math.PI * (1 - 2 * y)));
}
