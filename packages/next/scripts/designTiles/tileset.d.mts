export interface TileNode {
  id: string;
  box: number[];
  geometricError: number;
  transform?: number[];
  content?: string;
  children?: TileNode[];
}
/** A 3D Tiles 1.1 tileset.json object. */
export function tilesetJson(
  root: TileNode,
  options?: { extension?: object; transform?: number[] },
): object;
