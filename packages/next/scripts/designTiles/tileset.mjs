// A 3D Tiles 1.1 tileset.json writer for the generated design tiles (plan 4b
// task 13). Plain Node, no dependencies. Numbers are written as given: JSON
// keeps a double's every digit, and nothing here rounds.

/**
 * @typedef {{
 *   id: string, box: number[], geometricError: number, transform?: number[],
 *   content?: string, children?: TileNode[],
 * }} TileNode
 */

const finite = (list, length, what) => {
  if (
    !Array.isArray(list) ||
    list.length !== length ||
    !list.every((v) => typeof v === "number" && Number.isFinite(v))
  ) {
    throw new Error(`tilesetJson: ${what} is ${length} finite numbers`);
  }
  return list;
};

function tile(node, transform, seen) {
  if (seen.has(node.id)) {
    throw new Error(`tilesetJson: duplicate tile id ${node.id}`);
  }
  seen.add(node.id);
  if (!Number.isFinite(node.geometricError) || node.geometricError < 0) {
    throw new Error(`tilesetJson: ${node.id}: geometricError is not >= 0`);
  }
  const json = {
    boundingVolume: { box: [...finite(node.box, 12, `${node.id}: box`)] },
    geometricError: node.geometricError,
    refine: "REPLACE",
  };
  if (transform) {
    json.transform = [...finite(transform, 16, `${node.id}: transform`)];
  }
  if (node.content !== undefined) {
    json.content = { uri: node.content };
  }
  if (node.children?.length) {
    json.children = node.children.map((child) =>
      tile(child, child.transform, seen),
    );
  }
  return json;
}

/**
 * @param {TileNode} root
 * @param {{ extension?: object, transform?: number[] }} options `transform`
 *   is the root tile's transform (a rigid placement's matrix) and
 *   `extension` the `EXT_engineering_frame` declaration.
 * @returns {object}
 */
export function tilesetJson(root, options = {}) {
  const { extension, transform } = options;
  if (
    transform !== undefined &&
    root.transform !== undefined &&
    (root.transform.length !== transform.length ||
      root.transform.some((v, i) => v !== transform[i]))
  ) {
    throw new Error("tilesetJson: the root has two different transforms");
  }
  const json = {
    asset: { version: "1.1" },
    geometricError: root.geometricError,
    root: tile(root, transform ?? root.transform, new Set()),
  };
  if (extension !== undefined) {
    json.extensionsUsed = ["EXT_engineering_frame"];
    json.extensions = { EXT_engineering_frame: extension };
  }
  return json;
}
