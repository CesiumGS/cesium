/* eslint-disable no-restricted-globals */
import {
  Cartesian2,
  Cartesian3,
  JulianDate,
  Math as CesiumMath,
  Model,
  ResourceCache,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import createCanvas from "../../../../../Specs/createCanvas.js";
import pollToPromise from "../../../../../Specs/pollToPromise.js";

const textureSizeX = 16;
const textureSizeY = 16;
const canvasScaling = 32;

/**
 * Creates the RGBA bytes of a property texture image for the specs.
 *
 * The result will be the RGBA bytes of a 16x16 texture, with
 * the upper 9x9 pixels filled with the pattern that contains
 * all combinations of (0, 127, 255) for the RGBA components.
 *
 * @returns The pixels
 */
function createExamplePropertyTexturePixelsRgbaBytes() {
  const sizeX = textureSizeX;
  const sizeY = textureSizeY;
  const pixelsRgbaBytes = Array(sizeX * sizeY * 4);
  for (let y = 0; y < sizeY; y++) {
    for (let x = 0; x < sizeX; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      /*
      if (x > 8 || y > 8) {
        continue;
      }

      const lox = x % 3;
      const hix = Math.floor(x / 3);
      const loy = y % 3;
      const hiy = Math.floor(y / 3);

      if ((lox & 0x1) !== 0) {
        b = 127;
      }
      if ((lox & 0x2) !== 0) {
        b = 255;
      }
      if ((hix & 0x1) !== 0) {
        g = 127;
      }
      if ((hix & 0x2) !== 0) {
        g = 255;
      }

      if ((loy & 0x1) !== 0) {
        r = 127;
      }
      if ((loy & 0x2) !== 0) {
        r = 255;
      }
      if ((hiy & 0x1) !== 0) {
        a = 127;
      }
      if ((hiy & 0x2) !== 0) {
        a = 255;
      }
      */

      r = 255;
      g = 255;
      b = 255;
      if (y >= 4) {
        a = 64;
      }
      if (y >= 8) {
        a = 128;
      }
      if (y >= 12) {
        a = 255;
      }

      const index = y * sizeX + x;
      pixelsRgbaBytes[index * 4 + 0] = r;
      pixelsRgbaBytes[index * 4 + 1] = g;
      pixelsRgbaBytes[index * 4 + 2] = b;
      pixelsRgbaBytes[index * 4 + 3] = a;
    }
  }
  return pixelsRgbaBytes;
}

/**
 * Creates the RGBA bytes of a base color texture for the specs.
 *
 * The result will be the the same as for createExamplePropertyTexturePixelsRgbaBytes,
 * but with all alpha component bytes being 255.
 *
 * @returns The pixels
 */
function createExampleBaseColorTexturePixelsRgbaBytes() {
  const sizeX = textureSizeX;
  const sizeY = textureSizeY;
  const pixelsRgbaBytes = createExamplePropertyTexturePixelsRgbaBytes();
  for (let y = 0; y < sizeY; y++) {
    for (let x = 0; x < sizeX; x++) {
      const index = y * sizeX + x;
      pixelsRgbaBytes[index * 4 + 3] = 255;
    }
  }
  return pixelsRgbaBytes;
}

/**
 * Creates a data URI for a PNG image with the given pixels.
 *
 * @param {number} sizeX The size in x-direction
 * @param {number} sizeY The size in y-direction
 * @param {number[]} pixelsRgbaBytes The RGBA pixel bytes
 * @returns The PNG data URI
 */
function createPngDataUri(sizeX, sizeY, pixelsRgbaBytes) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = sizeX;
  canvas.height = sizeY;
  const dataArray = new Uint8ClampedArray(pixelsRgbaBytes);
  const imageData = new ImageData(dataArray, sizeX, sizeY);
  context.putImageData(imageData, 0, 0);
  const dataUri = canvas.toDataURL("image/png");
  return dataUri;
}

/**
 * Creates an embedded glTF asset with a property texture.
 *
 * This creates an assed that represents a unit square and uses
 * the `EXT_structural_metadata` extension to assign a single
 * property texture to this square.
 *
 * @param {object} schema The metadata schema
 * @param {object} propertyTextureProperties The property texture properties
 * @param {string} propertyTexturePngDataUri The PNG data URI of the property texture
 * @param {string} baseColorTexturePngDataUri The PNG data URI of the base color texture
 * @returns The gltf
 */
function createEmbeddedGltfWithPropertyTexture(
  schema,
  propertyTextureProperties,
  propertyTexturePngDataUri,
  baseColorTexturePngDataUri
) {
  const result = {
    extensions: {
      EXT_structural_metadata: {
        schema: schema,
        propertyTextures: [
          {
            class: "exampleClass",
            properties: propertyTextureProperties,
          },
        ],
      },
    },
    extensionsUsed: ["EXT_structural_metadata"],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5123,
        count: 6,
        type: "SCALAR",
        max: [3],
        min: [0],
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126,
        count: 4,
        type: "VEC3",
        max: [1.0, 1.0, 0.0],
        min: [0.0, 0.0, 0.0],
      },
      {
        bufferView: 1,
        byteOffset: 48,
        componentType: 5126,
        count: 4,
        type: "VEC3",
        max: [0.0, 0.0, 1.0],
        min: [0.0, 0.0, 1.0],
      },
      {
        bufferView: 1,
        byteOffset: 96,
        componentType: 5126,
        count: 4,
        type: "VEC2",
        max: [1.0, 1.0],
        min: [0.0, 0.0],
      },
    ],
    asset: {
      generator: "JglTF from https://github.com/javagl/JglTF",
      version: "2.0",
    },
    buffers: [
      {
        uri:
          "data:application/gltf-buffer;base64,AAABAAIAAQADAAIAAAAAAAAAAAAAAAAAAACAPwAAAAAAAAAAAAAAAAAAgD8AAAAAAACAPwAAgD8AAAAAAAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAAAAAAIA/AAAAAAAAgD8AAAAAAACAPwAAgD8AAAAAAAAAAAAAAAAAAAAAAACAPwAAAAAAAAAA",
        byteLength: 156,
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: 12,
        target: 34963,
      },
      {
        buffer: 0,
        byteOffset: 12,
        byteLength: 144,
        byteStride: 12,
        target: 34962,
      },
    ],
    images: [
      {
        uri: propertyTexturePngDataUri,
        mimeType: "image/png",
      },
      {
        uri: baseColorTexturePngDataUri,
        mimeType: "image/png",
      },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [1.0, 1.0, 1.0, 1.0],
          baseColorTexture: {
            index: 1,
            texCoord: 0,
          },
          metallicFactor: 0.0,
          roughnessFactor: 1.0,
        },
        alphaMode: "OPAQUE",
        doubleSided: true,
      },
    ],
    meshes: [
      {
        primitives: [
          {
            extensions: {
              EXT_structural_metadata: {
                propertyTextures: [0],
              },
            },
            attributes: {
              POSITION: 1,
              NORMAL: 2,
              TEXCOORD_0: 3,
            },
            indices: 0,
            material: 0,
            mode: 4,
          },
        ],
      },
    ],
    nodes: [
      {
        mesh: 0,
      },
    ],
    samplers: [
      {
        magFilter: 9728,
        minFilter: 9728,
      },
    ],
    scene: 0,
    scenes: [
      {
        nodes: [0],
      },
    ],
    textures: [
      {
        sampler: 0,
        source: 0,
      },
      {
        sampler: 0,
        source: 1,
      },
    ],
  };
  return result;
}

/**
 * Creates a metadata schema for the metadata property texture picking specs.
 *
 * This is for the 'scalar' test case
 *
 * @returns The schema
 */
function createExampleSchemaScalar() {
  const schema = {
    id: "ExampleSchema",
    classes: {
      exampleClass: {
        name: "Example class",
        properties: {
          example_UINT8_SCALAR: {
            name: "Example SCALAR property with UINT8 components",
            type: "SCALAR",
            componentType: "UINT8",
          },
          example_normalized_UINT8_SCALAR: {
            name: "Example SCALAR property with normalized UINT8 components",
            type: "SCALAR",
            componentType: "UINT8",
            normalized: true,
          },
        },
      },
    },
  };
  return schema;
}

/**
 * Creates the property texture properties definition for the
 * metadata property texture picking specs.
 *
 * This is for the 'scalar' test case
 *
 * @returns The properties
 */
function createPropertyTexturePropertiesScalar() {
  const properties = {
    example_UINT8_SCALAR: {
      index: 0,
      texCoord: 0,
      channels: [0],
    },
    example_normalized_UINT8_SCALAR: {
      index: 0,
      texCoord: 0,
      channels: [1],
    },
  };
  return properties;
}

function createPropertyTextureGltfScalar() {
  const schema = createExampleSchemaScalar();
  const properties = createPropertyTexturePropertiesScalar();

  const propertyTexturePixelsRgbaBytes = createExamplePropertyTexturePixelsRgbaBytes();
  const propertyTextureDataUri = createPngDataUri(
    textureSizeX,
    textureSizeY,
    propertyTexturePixelsRgbaBytes
  );
  const baseColorTexturePixelsRgbaBytes = createExampleBaseColorTexturePixelsRgbaBytes();
  const baseColorTextureDataUri = createPngDataUri(
    textureSizeX,
    textureSizeY,
    baseColorTexturePixelsRgbaBytes
  );

  const gltf = createEmbeddedGltfWithPropertyTexture(
    schema,
    properties,
    propertyTextureDataUri,
    baseColorTextureDataUri
  );
  //*/
  console.log("SPEC GLTF:");
  console.log("-".repeat(80));
  console.log(JSON.stringify(gltf, null, 2));
  console.log("-".repeat(80));
  //*/
  return gltf;
}

/**
 * Create a model from the given glTF, add it as a primitive
 * to the given scene, and wait until it is fully loaded.
 *
 * @param {Scene} scene The scene
 * @param {object} gltf The gltf
 */
async function loadAsModel(scene, gltf) {
  const basePath = "SPEC_BASE_PATH";
  const model = await Model.fromGltfAsync({
    gltf: gltf,
    basePath: basePath,
    // This is important to make sure that the property
    // texture is fully loaded when the model is rendered!
    incrementallyLoadTextures: false,
  });
  scene.primitives.add(model);

  await pollToPromise(
    function () {
      scene.renderForSpecs();
      return model.ready;
    },
    { timeout: 10000 }
  );
}

/**
 * Move the camera to exactly look at the unit square along -X
 *
 * @param {Camera} camera
 */
function fitCameraToUnitSquare(camera) {
  const fov = CesiumMath.PI_OVER_THREE;
  camera.frustum.fov = fov;
  camera.frustum.near = 0.01;
  camera.frustum.far = 100.0;
  const distance = 1.0 / (2.0 * Math.tan(fov * 0.5));
  camera.position = new Cartesian3(distance, 0.5, 0.5);
  camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
  camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
  camera.right = Cartesian3.clone(Cartesian3.UNIT_Y);
}

/**
 * Pick the specified metadata value from the screen that is contained in
 * the property texture at the given coordinates.
 *
 * (This assumes that the property texture is on a unit square, and
 * fitCameraToUnitSquare was called)
 *
 * @param {Scene} scene The scene
 * @param {string|undefined} schemaId The schema ID
 * @param {string} className The class name
 * @param {string} propertyName The property name
 * @param {number} x The x-coordinate in the texture
 * @param {number} y The y-coordinate in the texture
 * @returns The metadata value
 */
function pickMetadataAt(scene, schemaId, className, propertyName, x, y) {
  const screenX = Math.floor(x * canvasScaling + canvasScaling / 2);
  const screenY = Math.floor(y * canvasScaling + canvasScaling / 2);
  const screenPosition = new Cartesian2(screenX, screenY);
  const metadataValue = scene.pickMetadata(
    screenPosition,
    schemaId,
    className,
    propertyName
  );
  return metadataValue;
}

describe(
  "Scene/pickMetadata",
  function () {
    const defaultDate = JulianDate.fromDate(
      new Date("January 1, 2014 12:00:00 UTC")
    );

    let scene;
    let scene2D;
    let sceneCV;

    beforeAll(function () {
      scene = createScene();

      scene2D = createScene();
      scene2D.morphTo2D(0.0);

      sceneCV = createScene();
      sceneCV.morphToColumbusView(0.0);
    });

    afterAll(function () {
      scene.destroyForSpecs();
      scene2D.destroyForSpecs();
      sceneCV.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      scene2D.primitives.removeAll();
      sceneCV.primitives.removeAll();
      scene.verticalExaggeration = 1.0;
      ResourceCache.clearForSpecs();
    });

    fit("throws without windowPosition", async function () {
      const windowPosition = undefined; // For spec
      const schemaId = undefined;
      const className = "exampleClass";
      const propertyName = "example_UINT8_SCALAR";
      scene.initializeFrame();
      scene.render(defaultDate);
      expect(() => {
        scene.pickMetadata(windowPosition, schemaId, className, propertyName);
      }).toThrowDeveloperError();
    });

    fit("throws without className", async function () {
      const windowPosition = new Cartesian2();
      const schemaId = undefined;
      const className = undefined; // For spec
      const propertyName = "example_UINT8_SCALAR";
      scene.initializeFrame();
      scene.render(defaultDate);
      expect(() => {
        scene.pickMetadata(windowPosition, schemaId, className, propertyName);
      }).toThrowDeveloperError();
    });

    fit("throws without propertyName", async function () {
      const windowPosition = new Cartesian2();
      const schemaId = undefined;
      const className = "exampleClass";
      const propertyName = undefined; // For spec
      scene.initializeFrame();
      scene.render(defaultDate);
      expect(() => {
        scene.pickMetadata(windowPosition, schemaId, className, propertyName);
      }).toThrowDeveloperError();
    });

    fit("returns undefined for class name that does not exist", async function () {
      const schemaId = undefined;
      const className = "exampleClass_THAT_DOES_NOT_EXIST"; // For spec
      const propertyName = "example_UINT8_SCALAR";
      const gltf = createPropertyTextureGltfScalar();

      const canvasSizeX = textureSizeX * canvasScaling;
      const canvasSizeY = textureSizeY * canvasScaling;
      scene = createScene({
        canvas: createCanvas(canvasSizeX, canvasSizeY),
      });

      await loadAsModel(scene, gltf);
      fitCameraToUnitSquare(scene.camera);

      const windowPosition = new Cartesian2(
        Math.floor(canvasSizeX / 2),
        Math.floor(canvasSizeY / 2)
      );
      const actualMetadataValue = scene.pickMetadata(
        windowPosition,
        schemaId,
        className,
        propertyName
      );
      expect(actualMetadataValue).toBeUndefined();
    });

    fit("returns undefined when there is no object with metadata", async function () {
      const schemaId = undefined;
      const className = "exampleClass";
      const propertyName = "example_UINT8_SCALAR";

      const canvasSizeX = textureSizeX * canvasScaling;
      const canvasSizeY = textureSizeY * canvasScaling;
      scene = createScene({
        canvas: createCanvas(canvasSizeX, canvasSizeY),
      });

      fitCameraToUnitSquare(scene.camera);

      const windowPosition = new Cartesian2(
        Math.floor(canvasSizeX / 2),
        Math.floor(canvasSizeY / 2)
      );
      const actualMetadataValue = scene.pickMetadata(
        windowPosition,
        schemaId,
        className,
        propertyName
      );
      expect(actualMetadataValue).toBeUndefined();
    });

    fit("picks UINT8 SCALAR from a property texture", async function () {
      const schemaId = undefined;
      const className = "exampleClass";
      const propertyName = "example_UINT8_SCALAR";
      const gltf = createPropertyTextureGltfScalar();

      const canvasSizeX = textureSizeX * canvasScaling;
      const canvasSizeY = textureSizeY * canvasScaling;
      scene = createScene({
        canvas: createCanvas(canvasSizeX, canvasSizeY),
      });

      await loadAsModel(scene, gltf);
      fitCameraToUnitSquare(scene.camera);

      scene.initializeFrame();
      scene.render(defaultDate);

      const actualMetadataValue0 = pickMetadataAt(
        scene,
        schemaId,
        className,
        propertyName,
        0,
        3
      );
      const actualMetadataValue1 = pickMetadataAt(
        scene,
        schemaId,
        className,
        propertyName,
        0,
        4
      );
      const actualMetadataValue2 = pickMetadataAt(
        scene,
        schemaId,
        className,
        propertyName,
        0,
        5
      );
      const expectedMetadataValue0 = 0;
      const expectedMetadataValue1 = 127;
      const expectedMetadataValue2 = 255;

      expect(
        CesiumMath.equalsEpsilon(
          actualMetadataValue0,
          expectedMetadataValue0,
          0.0,
          1.0
        )
      ).toBe(true);
      expect(
        CesiumMath.equalsEpsilon(
          actualMetadataValue1,
          expectedMetadataValue1,
          0.0,
          1.0
        )
      ).toBe(true);
      expect(
        CesiumMath.equalsEpsilon(
          actualMetadataValue2,
          expectedMetadataValue2,
          0.0,
          1.0
        )
      ).toBe(true);
    });

    // eslint-disable-next-line no-restricted-globals
    fit("picks normalized UINT8 SCALAR from a property texture", async function () {
      const schemaId = undefined;
      const className = "exampleClass";
      const propertyName = "example_normalized_UINT8_SCALAR";
      const gltf = createPropertyTextureGltfScalar();

      const canvasSizeX = textureSizeX * canvasScaling;
      const canvasSizeY = textureSizeY * canvasScaling;
      scene = createScene({
        canvas: createCanvas(canvasSizeX, canvasSizeY),
      });

      await loadAsModel(scene, gltf);
      fitCameraToUnitSquare(scene.camera);

      scene.initializeFrame();
      scene.render(defaultDate);

      const actualMetadataValue0 = pickMetadataAt(
        scene,
        schemaId,
        className,
        propertyName,
        0,
        3
      );
      const actualMetadataValue1 = pickMetadataAt(
        scene,
        schemaId,
        className,
        propertyName,
        3,
        3
      );
      const actualMetadataValue2 = pickMetadataAt(
        scene,
        schemaId,
        className,
        propertyName,
        6,
        3
      );
      const expectedMetadataValue0 = 0.0;
      const expectedMetadataValue1 = 0.5;
      const expectedMetadataValue2 = 1.0;

      expect(
        CesiumMath.equalsEpsilon(
          actualMetadataValue0,
          expectedMetadataValue0,
          0.0,
          0.01
        )
      ).toBe(true);
      expect(
        CesiumMath.equalsEpsilon(
          actualMetadataValue1,
          expectedMetadataValue1,
          0.0,
          0.01
        )
      ).toBe(true);
      expect(
        CesiumMath.equalsEpsilon(
          actualMetadataValue2,
          expectedMetadataValue2,
          0.0,
          0.01
        )
      ).toBe(true);

      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const actualMetadataValue = pickMetadataAt(
            scene,
            schemaId,
            className,
            propertyName,
            x,
            y
          );

          console.log(
            `actualMetadataValue at ${x} ${y}  is `,
            actualMetadataValue
          );
        }
      }
      console.log("done");
    });

    // eslint-disable-next-line no-restricted-globals
    fit("picks metadata from a property texture quarry", async function () {
      // Create the gltf with the metadata that is about to be picked
      const schemaId = undefined;
      const className = "exampleClass";
      const propertyName = "example_UINT8_SCALAR";
      const gltf = createPropertyTextureGltfScalar();

      const canvasSizeX = textureSizeX * canvasScaling;
      const canvasSizeY = textureSizeY * canvasScaling;
      scene = createScene({
        canvas: createCanvas(canvasSizeX, canvasSizeY),
      });

      await loadAsModel(scene, gltf);
      fitCameraToUnitSquare(scene.camera);

      scene.initializeFrame();
      scene.render(defaultDate);

      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const actualMetadataValue = pickMetadataAt(
            scene,
            schemaId,
            className,
            propertyName,
            x,
            y
          );

          console.log(
            `actualMetadataValue at ${x} ${y}  is `,
            actualMetadataValue
          );
        }
      }
      console.log("done");
    });
  },
  "WebGL"
);
