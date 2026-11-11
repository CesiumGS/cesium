/**
 * A glTF's triangles on the CPU, for the application to hand to `MeshCaps`.
 *
 * The engine decodes a model for the GPU and keeps no copy a caller can read
 * (`ModelResource`'s asset is private), so a model that wants caps is read
 * here too. This reads what a plain model has: accessors over buffers
 * (`data:` URIs or files beside it), quantized components, indexed or not,
 * and a node tree of matrices or translation, rotation and scale. No Draco,
 * Meshopt or sparse accessors. Positions come out in the glTF's own axes
 * (Y up) with the nodes' transforms applied.
 */

export interface Triangles {
  /** 3 per vertex. */
  readonly positions: Float32Array;
  /** 3 per triangle. */
  readonly indices: Uint32Array;
}

interface Accessor {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  normalized?: boolean;
  count: number;
  type: string;
}
interface BufferView {
  buffer: number;
  byteOffset?: number;
  byteStride?: number;
}
interface Node {
  mesh?: number;
  children?: number[];
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
}
interface Primitive {
  attributes: Record<string, number>;
  indices?: number;
  mode?: number;
}
interface Gltf {
  accessors: Accessor[];
  bufferViews: BufferView[];
  buffers: Array<{ uri?: string }>;
  nodes: Node[];
  meshes: Array<{ primitives: Primitive[] }>;
  scenes?: Array<{ nodes?: number[] }>;
  scene?: number;
}

const COMPONENTS: Record<number, { bytes: number; max: number }> = {
  5120: { bytes: 1, max: 127 },
  5121: { bytes: 1, max: 255 },
  5122: { bytes: 2, max: 32767 },
  5123: { bytes: 2, max: 65535 },
  5125: { bytes: 4, max: 4294967295 },
  5126: { bytes: 4, max: 1 },
};
const WIDTH: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
};

/** A column-major 4 × 4 from a node's `matrix`, or its translation, rotation and scale. */
function localMatrix(node: Node): Float64Array {
  if (node.matrix) {
    return Float64Array.from(node.matrix);
  }
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const x2 = x! + x!;
  const y2 = y! + y!;
  const z2 = z! + z!;
  return Float64Array.of(
    (1 - (y! * y2 + z! * z2)) * sx!,
    (x! * y2 + w! * z2) * sx!,
    (x! * z2 - w! * y2) * sx!,
    0,
    (x! * y2 - w! * z2) * sy!,
    (1 - (x! * x2 + z! * z2)) * sy!,
    (y! * z2 + w! * x2) * sy!,
    0,
    (x! * z2 + w! * y2) * sz!,
    (y! * z2 - w! * x2) * sz!,
    (1 - (x! * x2 + y! * y2)) * sz!,
    0,
    tx!,
    ty!,
    tz!,
    1,
  );
}

function multiply(a: Float64Array, b: Float64Array): Float64Array {
  const out = new Float64Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[k * 4 + r]! * b[c * 4 + k]!;
      }
      out[c * 4 + r] = sum;
    }
  }
  return out;
}

/** Reads the glTF at `url` and returns the triangles of every mesh in its scene. */
export async function loadGltfTriangles(
  url: string,
  signal?: AbortSignal,
): Promise<Triangles> {
  const base = new URL(url, globalThis.location?.href);
  const response = await fetch(base, { signal: signal ?? null });
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }
  const gltf = (await response.json()) as Gltf;
  const buffers = await Promise.all(
    gltf.buffers.map(async (buffer) => {
      if (buffer.uri === undefined) {
        throw new Error(`${url}: a buffer without a uri (a .glb) isn't read`);
      }
      const got = await fetch(new URL(buffer.uri, base), {
        signal: signal ?? null,
      });
      return new DataView(await got.arrayBuffer());
    }),
  );

  const read = (index: number): Float64Array => {
    const accessor = gltf.accessors[index]!;
    const view = gltf.bufferViews[accessor.bufferView!]!;
    const data = buffers[view.buffer]!;
    const component = COMPONENTS[accessor.componentType];
    const width = WIDTH[accessor.type];
    if (!component || !width) {
      throw new Error(`${url}: accessor ${index} has a type this doesn't read`);
    }
    const stride = view.byteStride ?? component.bytes * width;
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const out = new Float64Array(accessor.count * width);
    for (let i = 0; i < accessor.count; i++) {
      for (let c = 0; c < width; c++) {
        const at = start + i * stride + c * component.bytes;
        let value: number;
        switch (accessor.componentType) {
          case 5120:
            value = data.getInt8(at);
            break;
          case 5121:
            value = data.getUint8(at);
            break;
          case 5122:
            value = data.getInt16(at, true);
            break;
          case 5123:
            value = data.getUint16(at, true);
            break;
          case 5125:
            value = data.getUint32(at, true);
            break;
          default:
            value = data.getFloat32(at, true);
        }
        out[i * width + c] = accessor.normalized
          ? Math.max(value / component.max, -1)
          : value;
      }
    }
    return out;
  };

  const positions: number[] = [];
  const indices: number[] = [];
  const visit = (nodeIndex: number, parent: Float64Array) => {
    const node = gltf.nodes[nodeIndex]!;
    const m = multiply(parent, localMatrix(node));
    if (node.mesh !== undefined) {
      for (const primitive of gltf.meshes[node.mesh]!.primitives) {
        if ((primitive.mode ?? 4) !== 4) {
          continue;
        }
        const at = positions.length / 3;
        const p = read(primitive.attributes.POSITION!);
        for (let i = 0; i < p.length; i += 3) {
          const x = p[i]!;
          const y = p[i + 1]!;
          const z = p[i + 2]!;
          positions.push(
            m[0]! * x + m[4]! * y + m[8]! * z + m[12]!,
            m[1]! * x + m[5]! * y + m[9]! * z + m[13]!,
            m[2]! * x + m[6]! * y + m[10]! * z + m[14]!,
          );
        }
        if (primitive.indices === undefined) {
          for (let i = 0; i < p.length / 3; i++) {
            indices.push(at + i);
          }
        } else {
          for (const i of read(primitive.indices)) {
            indices.push(at + i);
          }
        }
      }
    }
    for (const child of node.children ?? []) {
      visit(child, m);
    }
  };
  const identity = localMatrix({});
  const roots = gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? [0];
  for (const root of roots) {
    visit(root, identity);
  }
  return {
    positions: Float32Array.from(positions),
    indices: Uint32Array.from(indices),
  };
}
