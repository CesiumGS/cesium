// Reads a tileset's extension for two positions per vertex.

/**
 * The tileset-level extension that states the tiles' second position. Its
 * content is `{ "position": <attribute name>, "maxDistance": <number> }`: each
 * mesh's named attribute (3 components, in the mesh's own model space) holds
 * the vertex's second position, and no vertex is farther from it than
 * `maxDistance` model units. The engine reads it at load; a `SceneItem`
 * chooses between the positions by its placement alone.
 */
export const DUAL_POSITION_EXTENSION = "CESIUM_dual_position";

/** What `DUAL_POSITION_EXTENSION` states, once read and checked. */
export interface DualDeclaration {
  readonly semantic: string;
  readonly maxDistance: number;
}

/** The declaration in `extensions`, or undefined; warns of one it refuses. */
export function readDualPosition(
  extensions: Readonly<Record<string, unknown>>,
  warn: (message: string) => void,
): DualDeclaration | undefined {
  const declared = extensions[DUAL_POSITION_EXTENSION] as
    { position?: unknown; maxDistance?: unknown } | undefined;
  if (declared === undefined) {
    return undefined;
  }
  const { position, maxDistance } = declared ?? {};
  if (
    typeof position !== "string" ||
    position === "" ||
    typeof maxDistance !== "number" ||
    !Number.isFinite(Math.fround(maxDistance)) ||
    maxDistance < 0
  ) {
    warn(
      `${DUAL_POSITION_EXTENSION}: it needs a position (an attribute name) and a maxDistance (a distance, not negative); its second position is ignored`,
    );
    return undefined;
  }
  return { semantic: position, maxDistance };
}
