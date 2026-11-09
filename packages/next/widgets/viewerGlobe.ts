// The Viewer's content: its globe and the tilesets added to it.
import type { Viewer, GlobeKind, TilesetSource } from "./Viewer.ts";
import {
  type ImageryProvider,
  resolveIonAsset,
  BingImagery,
  type Globe,
  type Attribution,
  type TilesetOptions,
  type Tileset3D,
} from "@cesium/next";

export function tokenOptions(viewer: Viewer): { accessToken?: string } {
  return viewer.state.accessToken
    ? { accessToken: viewer.state.accessToken }
    : {};
}

export async function buildGlobe(
  viewer: Viewer,
  imagery: ImageryProvider | boolean,
): Promise<void> {
  if (imagery === true) {
    // Imagery and the terrain endpoint at once, not one after the other;
    // the globe's tiles load while the imagery resolves (1.x starts
    // terrain without waiting for it).
    if (viewer.state.globeKind === "terrain") {
      viewer.state.early.terrain ??= resolveIonAsset(1, tokenOptions(viewer));
    }
    viewer.state.imageryLoading = (
      viewer.state.early.imagery ?? BingImagery.fromIon(2, tokenOptions(viewer))
    ).then((provider) => (viewer.state.imagery = provider));
    viewer.state.imageryLoading.catch(() => {}); // surfaces through `ready`
  } else if (imagery) {
    viewer.state.imagery = imagery;
  }
  await viewer.setGlobe(viewer.state.globeKind);
  await viewer.state.imageryLoading;
}

export async function setGlobe(viewer: Viewer, kind: GlobeKind): Promise<void> {
  const token = ++viewer.state.globeToken;
  viewer.state.globeKind = kind;
  let next: Globe | undefined;
  let attributions: Attribution[] = [];
  const imagery = viewer.state.imagery ?? viewer.state.imageryLoading;
  const options = {
    policy: viewer.policy,
    ...(imagery ? { imagery } : {}),
    ...(viewer.state.lightsProvider
      ? { lights: viewer.state.lightsProvider }
      : {}),
  };
  if (kind === "terrain") {
    const ion = await (viewer.state.early.terrain ??
      resolveIonAsset(1, tokenOptions(viewer)));
    viewer.state.early.terrain = undefined; // used once: later switches resolve anew
    next = await viewer.engine.addTerrain(viewer.world, ion.url, {
      headers: ion.headers,
      ...options,
    });
    attributions = ion.attributions;
  } else if (kind === "ellipsoid") {
    next = viewer.engine.addEllipsoid(viewer.world, options);
  }
  if (token !== viewer.state.globeToken || viewer.state.destroyed) {
    if (next) {
      viewer.engine.removeTileset(next);
    }
    return;
  }
  if (next) {
    next.show = viewer.state.globeShown;
  }
  if (viewer.state.globe_) {
    viewer.engine.removeTileset(viewer.state.globe_);
  }
  viewer.state.globe_ = next;
  viewer.state.terrainAttributions = attributions;
}

export async function addTileset(
  viewer: Viewer,
  source: TilesetSource,
  options: TilesetOptions = {},
): Promise<Tileset3D> {
  let url: string | URL;
  let headers: Record<string, string> | undefined;
  let attributions: Attribution[] = [];
  if (typeof source === "object" && "ion" in source) {
    const ion = await resolveIonAsset(source.ion, {
      ...tokenOptions(viewer),
      ...(source.accessToken ? { accessToken: source.accessToken } : {}),
    });
    if (ion.type !== "3DTILES") {
      throw new Error(
        `ion asset ${source.ion} is ${ion.type.toLowerCase()}, not 3D Tiles`,
      );
    }
    url = ion.url;
    headers = ion.headers;
    attributions = ion.attributions;
  } else {
    url = source;
  }
  const tileset = await viewer.engine.addTileset(viewer.world, url, {
    policy: viewer.policy,
    ...(headers ? { headers } : {}),
    ...(attributions.length > 0 ? { attributions } : {}),
    ...options,
  });
  viewer.state.tilesets.add(tileset);
  return tileset;
}
