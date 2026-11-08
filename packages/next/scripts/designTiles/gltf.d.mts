export interface DesignMesh {
  positions: Float32Array;
  /** Absent: the reader shades flat (glTF's rule). */
  normals?: Float32Array;
  indices: Uint32Array;
  featureIds: Uint16Array;
  features: readonly { name: string; kind: string }[];
  color: [number, number, number, number];
  /** Linear RGBA a vertex in [0, 1], written as COLOR_0 (normalized bytes). */
  colors?: Float32Array;
}
/** A GLB 2.0 of the mesh, with feature IDs, a name/kind property table and, given `colors`, COLOR_0. */
export function writeGlb(mesh: DesignMesh): Uint8Array;
