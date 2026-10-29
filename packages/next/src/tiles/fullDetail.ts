/**
 * Full-detail content of a 3D Tiles tileset, without streaming: every leaf
 * content under REPLACE refinement and every content under ADD, with tile
 * transforms accumulated and external tilesets followed. A stand-in for the
 * parity page and the viewer until M2's streaming and tile selection.
 */
import * as m4 from "../math/mat4.ts";
import { resolveUri } from "../io/ion.ts";

/* eslint-disable @typescript-eslint/no-explicit-any -- tileset JSON is untyped */
type Json = any;

export interface TileContent {
  url: string;
  transform: Float64Array;
}

/**
 * Full-detail content of a tileset: leaf contents under REPLACE refinement,
 * every content under ADD, with tile transforms accumulated; external
 * tilesets are followed. Implicit tiling is M2.
 */
export async function collectFullDetailContents(
  url: string,
  headers: Record<string, string> | undefined,
  parent: Float64Array,
  out: TileContent[],
  warnings: Set<string>,
): Promise<void> {
  const response = await fetch(url, headers ? { headers } : undefined);
  if (!response.ok) {
    throw new Error(`${url}: ${response.status}`);
  }
  const tileset: Json = await response.json();
  const up = tileset.asset?.gltfUpAxis;
  if (up && up !== "Y") {
    warnings.add(`gltfUpAxis ${up} not supported (treated as Y)`);
  }
  const walk = async (
    tile: Json,
    parentTransform: Float64Array,
    inherited: string,
  ) => {
    const transform = tile.transform
      ? m4.multiply(
          m4.mat4(),
          parentTransform,
          Float64Array.from(tile.transform),
        )
      : parentTransform;
    const refine: string = tile.refine ?? inherited;
    if (tile.implicitTiling) {
      warnings.add("implicit tiling not supported yet (M2)");
    }
    const children: Json[] = tile.children ?? [];
    const contents: Json[] = tile.content
      ? [tile.content]
      : (tile.contents ?? []);
    for (const content of contents) {
      const uri: string = content.uri ?? content.url;
      const contentUrl = resolveUri(uri, url);
      if (/\.json(\?|$)/i.test(uri)) {
        await collectFullDetailContents(
          contentUrl,
          headers,
          transform,
          out,
          warnings,
        );
      } else if (children.length === 0 || refine === "ADD") {
        out.push({ url: contentUrl, transform });
      }
    }
    for (const child of children) {
      await walk(child, transform, refine);
    }
  };
  await walk(tileset.root, parent, tileset.root.refine ?? "REPLACE");
}
