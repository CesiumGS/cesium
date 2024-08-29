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

const propertyTextureSizeX = 16;
const propertyTextureSizeY = 16;

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
  const sizeX = propertyTextureSizeX;
  const sizeY = propertyTextureSizeY;
  const pixelsRgbaBytes = Array(sizeX * sizeY * 4);
  for (let y = 0; y < sizeY; y++) {
    for (let x = 0; x < sizeX; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

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

      //r = 255;
      //g = 255;
      //b = 0;
      //a = 255;

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
 * Create the PNG data URI for the property texture image used in the specs
 * @returns The data URI
 */
function createExamplePropertyTexturePngDataUri() {
  const pixelsRgbaBytes = createExamplePropertyTexturePixelsRgbaBytes();
  const dataUri = createPngDataUri(
    propertyTextureSizeX,
    propertyTextureSizeY,
    pixelsRgbaBytes
  );
  return dataUri;
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
 * @returns The gltf
 */
function createEmbeddedGltfWithPropertyTexture(
  schema,
  propertyTextureProperties,
  propertyTexturePngDataUri
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
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [1.0, 1.0, 1.0, 1.0],
          baseColorTexture: {
            index: 0,
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
    ],
  };
  return result;
}

function createPropertyTextureGltfScalar() {
  const schema = createExampleSchemaScalar();
  const properties = createPropertyTexturePropertiesScalar();
  const imageDataUri = createExamplePropertyTexturePngDataUri();
  const gltf = createEmbeddedGltfWithPropertyTexture(
    schema,
    properties,
    imageDataUri
  );
  //*/
  console.log("SPEC GLTF:");
  console.log("-".repeat(80));
  console.log(JSON.stringify(gltf, null, 2));
  console.log("-".repeat(80));
  //*/
  return gltf;
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

    // eslint-disable-next-line no-restricted-globals
    fit("picks metadata from a property texture", async function () {
      // Create the gltf with the metadata that is about to be picked
      const schemaId = undefined;
      const className = "exampleClass";
      const propertyName = "example_UINT8_SCALAR";
      const gltf = createPropertyTextureGltfScalar();

      const scaling = 32;
      const canvasSizeX = propertyTextureSizeX * scaling;
      const canvasSizeY = propertyTextureSizeY * scaling;
      scene = createScene({
        canvas: createCanvas(canvasSizeX, canvasSizeY),
      });

      // Create the model and wait until it is ready
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

      scene.camera.flyToBoundingSphere(model.boundingSphere, {
        duration: 0,
      });

      // Move the camera so that the unit square exactly
      // fills the canvas
      const camera = scene.camera;
      const fov = CesiumMath.PI_OVER_THREE;
      camera.frustum.fov = fov;
      camera.frustum.near = 0.01;
      camera.frustum.far = 100.0;
      const distance = 1.0 / (2.0 * Math.tan(fov * 0.5));
      camera.position = new Cartesian3(distance, 0.5, 0.5);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
      camera.right = Cartesian3.clone(Cartesian3.UNIT_Y);

      scene.initializeFrame();
      scene.render(defaultDate);

      console.log("position ", camera.position);
      console.log("direction ", camera.direction);
      console.log("up ", camera.up);
      console.log("right ", camera.right);

      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const screenX = Math.floor(x * scaling + scaling / 2);
          const screenY = Math.floor(y * scaling + scaling / 2);
          const screenPosition = new Cartesian2(screenX, screenY);
          const actualMetadataValue = scene.pickMetadata(
            screenPosition,
            schemaId,
            className,
            propertyName
          );
          console.log(
            `actualMetadataValue at ${x} ${y} screen ${screenPosition} is `,
            actualMetadataValue
          );
        }
      }
      console.log("done");
    });
  },
  "WebGL"
);
