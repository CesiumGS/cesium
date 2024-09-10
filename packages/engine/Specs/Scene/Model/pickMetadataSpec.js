import {
  Cartesian2,
  Cartesian3,
  JulianDate,
  Math as CesiumMath,
  Model,
  ResourceCache,
  Cartesian4,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import createCanvas from "../../../../../Specs/createCanvas.js";
import pollToPromise from "../../../../../Specs/pollToPromise.js";

// The size of the property texture
const textureSizeX = 16;
const textureSizeY = 16;

// A scaling factor (to be applied to the texture size) for
// determining the size of the ("debug") canvas that shows
// the scene where the picking takes place
const canvasScaling = 32;

// The 'toEqualEpsilon' matcher (which is which is defined
// in `Specs/addDefaultMatchers.js`, by the way...) uses
// the epsilon as a relative epsilon, and there is no way
// to pass in an absolute epsilon. For comparing the elements
// of a Cartesian2 that stores UINT8 values, an absolute
// epsilon of 1.0 would be handy. But... here we go:
const propertyValueEpsilon = 0.01;

/**
 * Creates an embedded glTF asset with a property texture.
 *
 * This creates an assed that represents a unit square and uses
 * the `EXT_structural_metadata` extension to assign a single
 * property texture to this square.
 *
 * @param {object} schema The metadata schema
 * @param {object} propertyTextureProperties The property texture properties
 * @returns The gltf
 */
function createEmbeddedGltfWithPropertyTexture(
  schema,
  propertyTextureProperties
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
        // A 16x16 pixels image that contains all combinations of
        // (0, 127, 255) in its upper-left 9x9 pixels
        uri:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAi0lEQVR42u2RUQ6AMAhDd3OO/qQt8VP8NRHjNpf0leI5ruqXbNVL4c9Dn+E8ljV+iLaXaoAY1YDaADaynBg2gFZLR1+wAdJEWZpW1AIVqmjCruqybw4qnEJbbQBHdWoS2XIUXdp+F8DNUOpM0tIZCusQJrzHNTnsOy2pFTZ7xpKhYFUu4M1v+OvrdQGABqEpS2kSLgAAAABJRU5ErkJggg==",
        mimeType: "image/png",
      },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [1.0, 1.0, 1.0, 1.0],
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
 * Create an embedded glTF with the default property texture,
 * and the given schema and property texture properties.
 *
 * @param {object} schema The JSON form of the metadata schema
 * @param {object[]} properties The JSON form of the property texture properties
 * @returns The glTF
 */
function createPropertyTextureGltf(schema, properties) {
  const gltf = createEmbeddedGltfWithPropertyTexture(schema, properties);
  /*/
  // Copy-and-paste this into a file to have the actual glTF:
  console.log("SPEC GLTF:");
  console.log("-".repeat(80));
  console.log(JSON.stringify(gltf, null, 2));
  console.log("-".repeat(80));
  //*/
  return gltf;
}

/**
 * Creates the glTF for the 'scalar' test case
 *
 * @returns The glTF
 */
function createPropertyTextureGltfScalar() {
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
  return createPropertyTextureGltf(schema, properties);
}

/**
 * Creates the glTF for the 'scalar array' test case
 *
 * @returns The glTF
 */
function createPropertyTextureGltfScalarArray() {
  const schema = {
    id: "ExampleSchema",
    classes: {
      exampleClass: {
        name: "Example class",
        properties: {
          example_fixed_length_UINT8_SCALAR_array: {
            name:
              "Example fixed-length SCALAR array property with UINT8 components",
            type: "SCALAR",
            componentType: "UINT8",
            array: true,
            count: 3,
          },
        },
      },
    },
  };
  const properties = {
    example_fixed_length_UINT8_SCALAR_array: {
      index: 0,
      texCoord: 0,
      channels: [0, 1, 2],
    },
  };
  return createPropertyTextureGltf(schema, properties);
}

/**
 * Creates the glTF for the 'vec2' test case
 *
 * @returns The glTF
 */
function createPropertyTextureGltfVec2() {
  const schema = {
    id: "ExampleSchema",
    classes: {
      exampleClass: {
        name: "Example class",
        properties: {
          example_UINT8_VEC2: {
            name: "Example VEC2 property with UINT8 components",
            type: "VEC2",
            componentType: "UINT8",
          },
        },
      },
    },
  };
  const properties = {
    example_UINT8_VEC2: {
      index: 0,
      texCoord: 0,
      channels: [0, 1],
    },
  };
  return createPropertyTextureGltf(schema, properties);
}

/**
 * Creates the glTF for the normalized 'vec2' test case
 *
 * @returns The glTF
 */
function createPropertyTextureGltfNormalizedVec2() {
  const schema = {
    id: "ExampleSchema",
    classes: {
      exampleClass: {
        name: "Example class",
        properties: {
          example_normalized_UINT8_VEC2: {
            name: "Example VEC2 property with normalized UINT8 components",
            type: "VEC2",
            componentType: "UINT8",
            normalized: true,
          },
        },
      },
    },
  };
  const properties = {
    example_normalized_UINT8_VEC2: {
      index: 0,
      texCoord: 0,
      channels: [0, 1],
    },
  };
  return createPropertyTextureGltf(schema, properties);
}

/**
 * Creates the glTF for the 'vec3' test case
 *
 * @returns The glTF
 */
function createPropertyTextureGltfVec3() {
  const schema = {
    id: "ExampleSchema",
    classes: {
      exampleClass: {
        name: "Example class",
        properties: {
          example_UINT8_VEC3: {
            name: "Example VEC3 property with UINT8 components",
            type: "VEC3",
            componentType: "UINT8",
          },
        },
      },
    },
  };
  const properties = {
    example_UINT8_VEC3: {
      index: 0,
      texCoord: 0,
      channels: [0, 1, 2],
    },
  };
  return createPropertyTextureGltf(schema, properties);
}

/**
 * Creates the glTF for the 'vec4' test case
 *
 * @returns The glTF
 */
function createPropertyTextureGltfVec4() {
  const schema = {
    id: "ExampleSchema",
    classes: {
      exampleClass: {
        name: "Example class",
        properties: {
          example_UINT8_VEC4: {
            name: "Example VEC4 property with UINT8 components",
            type: "VEC4",
            componentType: "UINT8",
          },
        },
      },
    },
  };
  const properties = {
    example_UINT8_VEC4: {
      index: 0,
      texCoord: 0,
      channels: [0, 1, 2, 3],
    },
  };
  return createPropertyTextureGltf(schema, properties);
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

describe("Scene/pickMetadata", function () {
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

  it("throws without windowPosition", async function () {
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

  it("throws without className", async function () {
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

  it("throws without propertyName", async function () {
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

  it("returns undefined for class name that does not exist", async function () {
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

  it("returns undefined when there is no object with metadata", async function () {
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

  it("pickMetadataSchema returns undefined when there is no object with metadata", async function () {
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
    const metadataSchema = scene.pickMetadataSchema(windowPosition);

    expect(metadataSchema).toBeUndefined();
  });

  it("pickMetadataSchema picks the metadata schema object", async function () {
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

    const windowPosition = new Cartesian2(
      Math.floor(canvasSizeX / 2),
      Math.floor(canvasSizeY / 2)
    );

    // The pickMetadataSchema call should return the schema that
    // was defined in createPropertyTextureGltfScalar
    const metadataSchema = scene.pickMetadataSchema(windowPosition);

    expect(metadataSchema).toBeDefined();
    expect(metadataSchema.id).toEqual("ExampleSchema");
    expect(metadataSchema.classes).toBeDefined();
  });

  it("picks UINT8 SCALAR from a property texture", async function () {
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
      0
    );
    const actualMetadataValue1 = pickMetadataAt(
      scene,
      schemaId,
      className,
      propertyName,
      0,
      1
    );
    const actualMetadataValue2 = pickMetadataAt(
      scene,
      schemaId,
      className,
      propertyName,
      0,
      2
    );
    const expectedMetadataValue0 = 0;
    const expectedMetadataValue1 = 127;
    const expectedMetadataValue2 = 255;

    expect(actualMetadataValue0).toEqualEpsilon(
      expectedMetadataValue0,
      propertyValueEpsilon
    );
    expect(actualMetadataValue1).toEqualEpsilon(
      expectedMetadataValue1,
      propertyValueEpsilon
    );
    expect(actualMetadataValue2).toEqualEpsilon(
      expectedMetadataValue2,
      propertyValueEpsilon
    );
  });

  it("picks normalized UINT8 SCALAR from a property texture", async function () {
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
      0
    );
    const actualMetadataValue1 = pickMetadataAt(
      scene,
      schemaId,
      className,
      propertyName,
      3,
      0
    );
    const actualMetadataValue2 = pickMetadataAt(
      scene,
      schemaId,
      className,
      propertyName,
      6,
      0
    );
    const expectedMetadataValue0 = 0.0;
    const expectedMetadataValue1 = 0.5;
    const expectedMetadataValue2 = 1.0;

    expect(actualMetadataValue0).toEqualEpsilon(
      expectedMetadataValue0,
      propertyValueEpsilon
    );
    expect(actualMetadataValue1).toEqualEpsilon(
      expectedMetadataValue1,
      propertyValueEpsilon
    );
    expect(actualMetadataValue2).toEqualEpsilon(
      expectedMetadataValue2,
      propertyValueEpsilon
    );
  });

  it("picks fixed length UINT8 SCALAR array from a property texture", async function () {
    const schemaId = undefined;
    const className = "exampleClass";
    const propertyName = "example_fixed_length_UINT8_SCALAR_array";
    const gltf = createPropertyTextureGltfScalarArray();

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
      0
    );
    const actualMetadataValue1 = pickMetadataAt(
      scene,
      schemaId,
      className,
      propertyName,
      1,
      1
    );
    const actualMetadataValue2 = pickMetadataAt(
      scene,
      schemaId,
      className,
      propertyName,
      2,
      2
    );
    const expectedMetadataValue0 = [0, 0, 0];
    const expectedMetadataValue1 = [127, 0, 127];
    const expectedMetadataValue2 = [255, 0, 255];

    expect(actualMetadataValue0).toEqualEpsilon(
      expectedMetadataValue0,
      propertyValueEpsilon
    );
    expect(actualMetadataValue1).toEqualEpsilon(
      expectedMetadataValue1,
      propertyValueEpsilon
    );
    expect(actualMetadataValue2).toEqualEpsilon(
      expectedMetadataValue2,
      propertyValueEpsilon
    );
  });

  it("picks UINT8 VEC2 from a property texture", async function () {
    const schemaId = undefined;
    const className = "exampleClass";
    const propertyName = "example_UINT8_VEC2";
    const gltf = createPropertyTextureGltfVec2();

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
      0
    );
    const actualMetadataValue1 = pickMetadataAt(
      scene,
      schemaId,
      className,
      propertyName,
      1,
      1
    );
    const actualMetadataValue2 = pickMetadataAt(
      scene,
      schemaId,
      className,
      propertyName,
      2,
      2
    );
    const expectedMetadataValue0 = new Cartesian2(0, 0);
    const expectedMetadataValue1 = new Cartesian2(127, 0);
    const expectedMetadataValue2 = new Cartesian2(255, 0);

    expect(actualMetadataValue0).toEqualEpsilon(
      expectedMetadataValue0,
      propertyValueEpsilon
    );
    expect(actualMetadataValue1).toEqualEpsilon(
      expectedMetadataValue1,
      propertyValueEpsilon
    );
    expect(actualMetadataValue2).toEqualEpsilon(
      expectedMetadataValue2,
      propertyValueEpsilon
    );
  });

  it("picks normalized UINT8 VEC2 from a property texture", async function () {
    const schemaId = undefined;
    const className = "exampleClass";
    const propertyName = "example_normalized_UINT8_VEC2";
    const gltf = createPropertyTextureGltfNormalizedVec2();

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
      0
    );
    const actualMetadataValue1 = pickMetadataAt(
      scene,
      schemaId,
      className,
      propertyName,
      1,
      1
    );
    const actualMetadataValue2 = pickMetadataAt(
      scene,
      schemaId,
      className,
      propertyName,
      2,
      2
    );

    const expectedMetadataValue0 = new Cartesian2(0.0, 0.0);
    const expectedMetadataValue1 = new Cartesian2(0.5, 0.0);
    const expectedMetadataValue2 = new Cartesian2(1.0, 0.0);

    expect(actualMetadataValue0).toEqualEpsilon(
      expectedMetadataValue0,
      propertyValueEpsilon
    );
    expect(actualMetadataValue1).toEqualEpsilon(
      expectedMetadataValue1,
      propertyValueEpsilon
    );
    expect(actualMetadataValue2).toEqualEpsilon(
      expectedMetadataValue2,
      propertyValueEpsilon
    );
  });

  it("picks UINT8 VEC3 from a property texture", async function () {
    const schemaId = undefined;
    const className = "exampleClass";
    const propertyName = "example_UINT8_VEC3";
    const gltf = createPropertyTextureGltfVec3();

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
      0
    );
    const actualMetadataValue1 = pickMetadataAt(
      scene,
      schemaId,
      className,
      propertyName,
      1,
      1
    );
    const actualMetadataValue2 = pickMetadataAt(
      scene,
      schemaId,
      className,
      propertyName,
      2,
      2
    );
    const expectedMetadataValue0 = new Cartesian3(0, 0, 0);
    const expectedMetadataValue1 = new Cartesian3(127, 0, 127);
    const expectedMetadataValue2 = new Cartesian3(255, 0, 255);

    expect(actualMetadataValue0).toEqualEpsilon(
      expectedMetadataValue0,
      propertyValueEpsilon
    );
    expect(actualMetadataValue1).toEqualEpsilon(
      expectedMetadataValue1,
      propertyValueEpsilon
    );
    expect(actualMetadataValue2).toEqualEpsilon(
      expectedMetadataValue2,
      propertyValueEpsilon
    );
  });

  it("picks UINT8 VEC4 from a property texture", async function () {
    const schemaId = undefined;
    const className = "exampleClass";
    const propertyName = "example_UINT8_VEC4";
    const gltf = createPropertyTextureGltfVec4();

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
      0
    );
    const actualMetadataValue1 = pickMetadataAt(
      scene,
      schemaId,
      className,
      propertyName,
      1,
      1
    );
    const actualMetadataValue2 = pickMetadataAt(
      scene,
      schemaId,
      className,
      propertyName,
      2,
      2
    );

    const expectedMetadataValue0 = new Cartesian4(0, 0, 0, 0);
    const expectedMetadataValue1 = new Cartesian4(127, 0, 127, 0);
    const expectedMetadataValue2 = new Cartesian4(255, 0, 255, 0);

    expect(actualMetadataValue0).toEqualEpsilon(
      expectedMetadataValue0,
      propertyValueEpsilon
    );
    expect(actualMetadataValue1).toEqualEpsilon(
      expectedMetadataValue1,
      propertyValueEpsilon
    );
    expect(actualMetadataValue2).toEqualEpsilon(
      expectedMetadataValue2,
      propertyValueEpsilon
    );
  });
});
