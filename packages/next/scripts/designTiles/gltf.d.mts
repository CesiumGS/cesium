export interface DesignMesh {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  featureIds: Uint16Array;
  features: readonly { name: string; kind: string }[];
  color: [number, number, number, number];
}
/** A GLB 2.0 of the mesh, with feature IDs and a name/kind property table. */
export function writeGlb(mesh: DesignMesh): Uint8Array;
