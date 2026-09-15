import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";
import process from "node:process";
import { MeshoptEncoder } from "meshoptimizer/encoder";
import Axis from "../../../../packages/engine/Source/Scene/Axis.js";
import Cartesian3 from "../../../../packages/engine/Source/Core/Cartesian3.js";
import Cartographic from "../../../../packages/engine/Source/Core/Cartographic.js";
import GeographicTilingScheme from "../../../../packages/engine/Source/Core/GeographicTilingScheme.js";
import Matrix4 from "../../../../packages/engine/Source/Core/Matrix4.js";
import Rectangle from "../../../../packages/engine/Source/Core/Rectangle.js";
import Transforms from "../../../../packages/engine/Source/Core/Transforms.js";

const output = process.argv[2];
if (!output) {
  throw new Error("Usage: node generateMeshoptTerrain.js <output.glb>");
}

const tilingScheme = new GeographicTilingScheme();
const ellipsoid = tilingScheme.ellipsoid;
const rectangle = tilingScheme.tileXYToRectangle(0, 0, 0);
const corners = [
  new Cartographic(rectangle.west, rectangle.south, 0),
  new Cartographic(rectangle.west, rectangle.north, 1),
  new Cartographic(rectangle.east, rectangle.south, 2),
  new Cartographic(rectangle.east, rectangle.north, 3),
];
const center = Rectangle.center(rectangle);
center.height = 1.5;

const transform = Transforms.eastNorthUpToFixedFrame(
  ellipsoid.cartographicToCartesian(center),
  ellipsoid,
);
const inverse = Matrix4.inverseTransformation(transform, new Matrix4());
const positions = ellipsoid
  .cartographicArrayToCartesianArray(corners)
  .map((position) =>
    Matrix4.multiplyByPoint(inverse, position, new Cartesian3()),
  );
const minimum = new Cartesian3(Infinity, Infinity, Infinity);
const maximum = new Cartesian3(-Infinity, -Infinity, -Infinity);

for (const position of positions) {
  Cartesian3.minimumByComponent(position, minimum, minimum);
  Cartesian3.maximumByComponent(position, maximum, maximum);
}

const indices = new Uint16Array([0, 3, 1, 0, 2, 3]);
const arrays = [
  Cartesian3.packArray(positions, new Float32Array(12)),
  new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0]),
  indices,
  new Uint16Array([0, 1]),
  new Uint16Array([2, 0]),
  new Uint16Array([3, 2]),
  new Uint16Array([1, 3]),
];
const align = (length) => Math.ceil(length / 4) * 4;
let byteOffset = 0;
const bufferViews = arrays.map((array) => {
  const view = { buffer: 0, byteOffset, byteLength: array.byteLength };
  byteOffset += align(array.byteLength);
  return view;
});

await MeshoptEncoder.ready;
const encoded = MeshoptEncoder.encodeIndexBuffer(
  new Uint8Array(indices.buffer),
  indices.length,
  indices.BYTES_PER_ELEMENT,
);

bufferViews[2].extensions = {
  EXT_meshopt_compression: {
    buffer: 0,
    byteOffset,
    byteLength: encoded.byteLength,
    byteStride: indices.BYTES_PER_ELEMENT,
    count: indices.length,
    mode: "TRIANGLES",
  },
};

const binary = Buffer.alloc(align(byteOffset + encoded.byteLength));

arrays.forEach((array, index) => {
  binary.set(new Uint8Array(array.buffer), bufferViews[index].byteOffset);
});
binary.set(encoded, byteOffset);

const gltf = {
  asset: { version: "2.0" },
  buffers: [{ byteLength: binary.byteLength }],
  bufferViews,
  accessors: [
    {
      bufferView: 0,
      componentType: 5126,
      type: "VEC3",
      min: Cartesian3.pack(minimum, []),
      max: Cartesian3.pack(maximum, []),
      count: 4,
    },
    { bufferView: 1, componentType: 5126, type: "VEC3", count: 4 },
    ...arrays.slice(2).map((array, index) => ({
      bufferView: index + 2,
      componentType: 5123,
      type: "SCALAR",
      count: array.length,
    })),
  ],
  meshes: [
    {
      primitives: [
        {
          attributes: { POSITION: 0, NORMAL: 1 },
          indices: 2,
          extensions: {
            CESIUM_tile_edges: { left: 3, bottom: 4, right: 5, top: 6 },
          },
        },
      ],
    },
  ],
  nodes: [
    {
      mesh: 0,
      matrix: Matrix4.pack(
        Matrix4.multiply(Axis.Z_UP_TO_Y_UP, transform, new Matrix4()),
        [],
      ),
    },
  ],
  scene: 0,
  scenes: [{ nodes: [0] }],
  extensionsUsed: ["CESIUM_tile_edges", "EXT_meshopt_compression"],
  // Preserve the metadata left by parseGlb in the original test sample.
  extras: { _pipeline: {} },
  extensionsRequired: ["EXT_meshopt_compression"],
};

const json = Buffer.from(JSON.stringify(gltf));
const jsonLength = align(json.length);
const binaryHeaderOffset = 20 + jsonLength;
const glb = Buffer.alloc(binaryHeaderOffset + 8 + binary.length);

glb.writeUInt32LE(0x46546c67, 0);
glb.writeUInt32LE(2, 4);
glb.writeUInt32LE(glb.length, 8);
glb.writeUInt32LE(jsonLength, 12);
glb.writeUInt32LE(0x4e4f534a, 16);
glb.fill(0x20, 20, binaryHeaderOffset);
glb.set(json, 20);
glb.writeUInt32LE(binary.length, binaryHeaderOffset);
glb.writeUInt32LE(0x004e4942, binaryHeaderOffset + 4);
glb.set(binary, binaryHeaderOffset + 8);

await writeFile(output, glb);
