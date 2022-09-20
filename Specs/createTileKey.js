import { defined, DeveloperError } from "../packages/engine/index.js";

function createTileKey(xOrTile, y, level) {
  if (!defined(xOrTile)) {
    throw new DeveloperError("xOrTile is required");
  }

  if (typeof xOrTile === "object") {
    const tile = xOrTile;
    xOrTile = tile.x;
    y = tile.y;
    level = tile.level;
  }
  return `L${level}X${xOrTile}Y${y}`;
}
export default createTileKey;
