import {
  Ellipsoid,
  Matrix4,
  Model,
  ResourceCache,
  GeographicTilingScheme,
  ImageryLayer,
  ImageryLayerCollection,
  TileCoordinatesImageryProvider,
  WebMercatorTilingScheme,
  ModelPrimitiveImagery,
  Cartesian3,
  Transforms,
  HeadingPitchRoll,
  WebMercatorProjection,
} from "../../../index.js";

import createScene from "../../../../../Specs/createScene.js";
import loadAndZoomToModelAsync from "./loadAndZoomToModelAsync.js";
import pollToPromise from "../../../../../Specs/pollToPromise.js";
import Cesium3DTilesTester from "../../../../../Specs/Cesium3DTilesTester.js";
import ModelImageryMapping from "../../../Source/Scene/Model/ModelImageryMapping.js";
import Cartographic from "../../../Source/Core/Cartographic.js";

const unitSquare_fourPrimitives_plain_url =
  "./Data/Models/glTF-2.0/unitSquare/unitSquare_fourPrimitives_plain.glb";

const tileset_unitSquare_fourPrimitives_plain_url =
  "./Data/Models/glTF-2.0/unitSquare/tileset_unitSquare_fourPrimitives_plain.json";

/**
 * Wait until the root tile of the given tileset is loaded
 *
 * @param {Cesium3DTileset} tileset The tileset
 * @param {Scene} scene The scene
 */
async function waitForRootLoaded(tileset, scene) {
  scene.renderForSpecs();
  const root = tileset.root;
  await pollToPromise(() => {
    scene.renderForSpecs();
    return root.contentFailed || root.contentReady;
  });
}

/**
 * Load and return a test tileset that defines an imagery layer,
 * waiting until the root of that tileset is loaded.
 *
 * This means that the resulting <code>tileset.root.content._model._modelImagery</code>
 * (including the <code>ModelPrimitiveImagery</code> instances) will be defined and ready.
 *
 * @param {Scene} scene The scene
 * @returns {Cesium3DTileset} The tileset
 */
async function loadTestTilesetWithImagery(scene) {
  const url = tileset_unitSquare_fourPrimitives_plain_url;
  const tileset = await Cesium3DTilesTester.loadTileset(scene, url);

  // Create a non-trivial transform for the tileset
  const transform = Transforms.eastNorthUpToFixedFrame(
    Cartesian3.fromDegrees(-120.0, 40.0, 1.0),
  );
  tileset.modelMatrix = transform;

  // Set a view that fully shows the tile content
  // (a unit square at the position given above)
  scene.camera.setView({
    destination: new Cartesian3(
      -2446354.452726738,
      -4237211.248955036,
      4077988.0921552004,
    ),
    orientation: new HeadingPitchRoll(Math.PI * 2, -Math.PI / 2, 0),
  });

  const imageryProvider = new TileCoordinatesImageryProvider({
    tilingScheme: new WebMercatorTilingScheme(),
  });
  const imageryLayer = new ImageryLayer(imageryProvider);
  tileset.imageryLayers.add(imageryLayer);

  await waitForRootLoaded(tileset, scene);
  return tileset;
}

describe("Scene/Model/ModelPrimitiveImagery", function () {
  let scene;

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    scene.primitives.removeAll();
    ResourceCache.clearForSpecs();
  });

  it("_computeUniqueEllipsoids throws with undefined argument", function () {
    expect(function () {
      ModelPrimitiveImagery._computeUniqueEllipsoids(undefined);
    }).toThrowDeveloperError();
  });

  it("_computeUniqueEllipsoids computes unique ellipsoids", function () {
    const imageryLayer0 = new ImageryLayer(
      new TileCoordinatesImageryProvider(
        new GeographicTilingScheme({ ellipsoid: Ellipsoid.WGS84 }),
      ),
    );
    const imageryLayer1 = new ImageryLayer(
      new TileCoordinatesImageryProvider(
        new GeographicTilingScheme({ ellipsoid: Ellipsoid.UNIT_SPHERE }),
      ),
    );
    const imageryLayer2 = new ImageryLayer(
      new TileCoordinatesImageryProvider(
        new GeographicTilingScheme({ ellipsoid: Ellipsoid.UNIT_SPHERE }),
      ),
    );
    const imageryLayer3 = new ImageryLayer(
      new TileCoordinatesImageryProvider(
        new GeographicTilingScheme({ ellipsoid: Ellipsoid.MOON }),
      ),
    );
    const imageryLayers = new ImageryLayerCollection();
    imageryLayers.add(imageryLayer0);
    imageryLayers.add(imageryLayer1);
    imageryLayers.add(imageryLayer2);
    imageryLayers.add(imageryLayer3);

    const expectedUniqueEllipsoids = [
      Ellipsoid.WGS84,
      Ellipsoid.UNIT_SPHERE,
      Ellipsoid.MOON,
    ];
    const actualUniqueEllipsoids =
      ModelPrimitiveImagery._computeUniqueEllipsoids(imageryLayers);
    expect(actualUniqueEllipsoids).toEqual(expectedUniqueEllipsoids);
  });

  it("_extractProjections throws with undefined argument", function () {
    expect(function () {
      ModelPrimitiveImagery._extractProjections(undefined);
    }).toThrowDeveloperError();
  });

  it("_extractProjections extracts the projections", function () {
    const tilingScheme0 = new GeographicTilingScheme();
    const tilingScheme1 = new WebMercatorTilingScheme();
    const tilingScheme2 = new GeographicTilingScheme();
    const tilingScheme3 = new WebMercatorTilingScheme();
    const imageryLayer0 = new ImageryLayer(
      new TileCoordinatesImageryProvider({ tilingScheme: tilingScheme0 }),
    );
    const imageryLayer1 = new ImageryLayer(
      new TileCoordinatesImageryProvider({ tilingScheme: tilingScheme1 }),
    );
    const imageryLayer2 = new ImageryLayer(
      new TileCoordinatesImageryProvider({ tilingScheme: tilingScheme2 }),
    );
    const imageryLayer3 = new ImageryLayer(
      new TileCoordinatesImageryProvider({ tilingScheme: tilingScheme3 }),
    );
    const imageryLayers = new ImageryLayerCollection();
    imageryLayers.add(imageryLayer0);
    imageryLayers.add(imageryLayer1);
    imageryLayers.add(imageryLayer2);
    imageryLayers.add(imageryLayer3);

    const expectedProjections = [
      tilingScheme0.projection,
      tilingScheme1.projection,
      tilingScheme2.projection,
      tilingScheme3.projection,
    ];
    const actualProjections =
      ModelPrimitiveImagery._extractProjections(imageryLayers);
    expect(actualProjections).toEqual(expectedProjections);
  });

  it("_computePrimitivePositionTransform throws without model", async function () {
    const url = unitSquare_fourPrimitives_plain_url;
    const model = await loadAndZoomToModelAsync(
      {
        gltf: url,
      },
      scene,
    );
    const runtimeNode = model.sceneGraph._runtimeNodes[0];
    expect(function () {
      ModelPrimitiveImagery._computePrimitivePositionTransform(
        undefined,
        runtimeNode,
      );
    }).toThrowDeveloperError();
  });

  it("_computePrimitivePositionTransform throws without runtimeNode", async function () {
    const url = unitSquare_fourPrimitives_plain_url;
    const model = await Model.fromGltfAsync({
      url: url,
    });
    expect(function () {
      ModelPrimitiveImagery._computePrimitivePositionTransform(
        model,
        undefined,
      );
    }).toThrowDeveloperError();
  });

  it("_computePrimitivePositionTransform computes the transform", async function () {
    const url = unitSquare_fourPrimitives_plain_url;
    const model = await loadAndZoomToModelAsync(
      {
        gltf: url,
      },
      scene,
    );
    const runtimeNode = model.sceneGraph._runtimeNodes[0];

    // Note: This test does not make sense. The function just computes the
    // product of some matrices, and the computation itself has only been
    // reverse engineered from buildDrawCommands. One of the matrices is
    // the model matrix that can be set by the user. The values of the
    // other matrices depend on dozens of factors. One of them is the
    // "axis correction matrix". The other ones are based on the glTF
    // node hierarchy, and they are all the identity matrix here.
    // It should not be necessary to manually compute that product to begin with.
    // It should be possible to access the primitive.getTransform()
    // directly, where this "getTransform" should be covered with dozens
    // of unit tests for all the configurations of modelMatrix, up-axis
    // conventions, and glTF node hierarchy matrices.
    // What is tested here is essentially: "It does not crash", but not more.
    const actualTransform =
      ModelPrimitiveImagery._computePrimitivePositionTransform(
        model,
        runtimeNode,
      );
    // This is Y_UP_TO_Z_U * Z_UP_TO_X_UP, i.e. the axisCorrectionMatrix
    // prettier-ignore
    const expectedTransform = new Matrix4(
      0, 0, 1, 0,
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 0, 1,
    );
    expect(actualTransform).toEqual(expectedTransform);
  });

  it("_obtainPrimitivePositionAttribute throws without primitive", async function () {
    expect(function () {
      ModelPrimitiveImagery._obtainPrimitivePositionAttribute(undefined);
    }).toThrowDeveloperError();
  });

  it("_obtainPrimitivePositionAttribute throws for primitive without POSITION", async function () {
    const url = unitSquare_fourPrimitives_plain_url;
    const model = await loadAndZoomToModelAsync(
      {
        gltf: url,
      },
      scene,
    );
    const primitive = model.sceneGraph.components.nodes[0].primitives[0];
    primitive.attributes.shift();
    expect(function () {
      ModelPrimitiveImagery._obtainPrimitivePositionAttribute(primitive);
    }).toThrowDeveloperError();
  });

  it("_obtainPrimitivePositionAttribute obtains the primitive POSITION attribute", async function () {
    const url = unitSquare_fourPrimitives_plain_url;
    const model = await loadAndZoomToModelAsync(
      {
        gltf: url,
      },
      scene,
    );
    const primitive = model.sceneGraph.components.nodes[0].primitives[0];
    const expectedAttribute = primitive.attributes[0];
    const actualAttribute =
      ModelPrimitiveImagery._obtainPrimitivePositionAttribute(primitive);
    expect(actualAttribute.semantic).toEqual("POSITION");
    expect(actualAttribute).toEqual(expectedAttribute);
  });

  it("properly reports _mappedPositionsNeedUpdate", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const tileset = await loadTestTilesetWithImagery(scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;
    const modelPrimitiveImageries = modelImagery._modelPrimitiveImageries;
    const modelPrimitiveImagery = modelPrimitiveImageries[0];

    // Initially, the mapped positions don't need an update
    expect(modelPrimitiveImagery._mappedPositionsNeedUpdate).toBeFalse();

    // For spec: Brutally set the model matrix to a new value
    model.modelMatrix = Matrix4.clone(Matrix4.IDENTITY);

    // Now, the mapped positions need an update
    expect(modelPrimitiveImagery._mappedPositionsNeedUpdate).toBeTrue();
  });

  it("_computeMappedPositionsPerEllipsoid computes the mapped positions", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const tileset = await loadTestTilesetWithImagery(scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;
    const modelPrimitiveImageries = modelImagery._modelPrimitiveImageries;
    const modelPrimitiveImagery = modelPrimitiveImageries[0];

    const actualMappedPositions =
      modelPrimitiveImagery._computeMappedPositionsPerEllipsoid();

    // Not checking the exact values here. The correctness
    // of these should be covered with other tests. This test
    // only checks that the MappedPositions are created.

    // One ellipsoid, therefore, one MappedPositions object
    expect(actualMappedPositions.length).toBe(1);

    // The primitives consist of 3x3 vertices
    expect(actualMappedPositions[0].numPositions).toBe(9);
  });

  it("_computeImageryTexCoordsAttributesPerProjection computes the attributes", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const tileset = await loadTestTilesetWithImagery(scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;
    const modelPrimitiveImageries = modelImagery._modelPrimitiveImageries;
    const modelPrimitiveImagery = modelPrimitiveImageries[0];

    const actualTexCoordAttributes =
      modelPrimitiveImagery._computeImageryTexCoordsAttributesPerProjection();

    // Not checking the exact values here. The correctness
    // of these should be covered with other tests. This test
    // only checks that the Attributes are created.

    // One projection, therefore, one attribute
    expect(actualTexCoordAttributes.length).toBe(1);

    // The primitives consist of 3x3 vertices
    expect(actualTexCoordAttributes[0].count).toBe(9);
  });

  it("_createImageryTexCoordAttributes computes the attributes", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const tileset = await loadTestTilesetWithImagery(scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;
    const modelPrimitiveImageries = modelImagery._modelPrimitiveImageries;
    const modelPrimitiveImagery = modelPrimitiveImageries[0];

    const uniqueProjections = [new WebMercatorProjection()];
    const actualTexCoordAttributes =
      modelPrimitiveImagery._createImageryTexCoordAttributes(uniqueProjections);

    // Not checking the exact values here. The correctness
    // of these should be covered with other tests. This test
    // only checks that the Attributes are created.

    // One projection, therefore, one attribute
    expect(actualTexCoordAttributes.length).toBe(1);

    // The primitives consist of 3x3 vertices
    expect(actualTexCoordAttributes[0].count).toBe(9);
  });

  it("coveragesForImageryLayer throws for unknown imagery layer", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const tileset = await loadTestTilesetWithImagery(scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;
    const modelPrimitiveImageries = modelImagery._modelPrimitiveImageries;
    const modelPrimitiveImagery = modelPrimitiveImageries[0];

    // Create a new imageryLayer that does not appear in the tileset
    const imageryProvider = new TileCoordinatesImageryProvider({
      tilingScheme: new WebMercatorTilingScheme(),
    });
    const imageryLayer = new ImageryLayer(imageryProvider);

    expect(function () {
      modelPrimitiveImagery.coveragesForImageryLayer(imageryLayer);
    }).toThrowDeveloperError();
  });

  it("coveragesForImageryLayer provides the proper coverages", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const tileset = await loadTestTilesetWithImagery(scene);

    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;
    const modelPrimitiveImageries = modelImagery._modelPrimitiveImageries;
    const modelPrimitiveImagery = modelPrimitiveImageries[0];

    const imageryLayer = tileset.imageryLayers.get(0);
    const actualImageryCoverages =
      modelPrimitiveImagery.coveragesForImageryLayer(imageryLayer);

    // Note: The "correctness" has been verified visually for this
    // configuration, and the proper numbers have been extracted
    // from a debugger run. This may be overly specific, and may
    // have to be adjusted in the future. Right now, it may only
    // prevent certain regressions.
    expect(actualImageryCoverages.length).toBe(1);

    const actualImageryCoverage = actualImageryCoverages[0];
    expect(actualImageryCoverage.x).toBe(5592405);
    expect(actualImageryCoverage.y).toBe(12703008);
    expect(actualImageryCoverage.level).toBe(25);
  });

  it("reference counting for imagery works", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const tileset = await loadTestTilesetWithImagery(scene);
    const root = tileset.root;
    const content = root.content;
    const model = content._model;

    const imageryLayer = tileset.imageryLayers.get(0);

    // Obtain the imageries that should be covered.
    // Note that this will increase their reference
    // count by default...
    const imagery0 = imageryLayer.getImageryFromCache(5592405, 12703007, 25);
    const imagery1 = imageryLayer.getImageryFromCache(5592405, 12703008, 25);
    const imagery2 = imageryLayer.getImageryFromCache(5592406, 12703007, 25);
    const imagery3 = imageryLayer.getImageryFromCache(5592406, 12703008, 25);

    // ... so decrease it here immediately
    imagery0.releaseReference();
    imagery1.releaseReference();
    imagery2.releaseReference();
    imagery3.releaseReference();

    // Check the reference counts that have been found via reverse engineering
    expect(imagery0.referenceCount).toBe(2);
    expect(imagery1.referenceCount).toBe(4);
    expect(imagery2.referenceCount).toBe(1);
    expect(imagery3.referenceCount).toBe(2);

    // Set a model matrix that causes the previous imageries to no longer
    // be covered, and trigger an update
    model.modelMatrix = Matrix4.clone(Matrix4.IDENTITY);
    model.update(scene.frameState);

    // The new reference counters should be all 0 now
    expect(imagery0.referenceCount).toBe(0);
    expect(imagery1.referenceCount).toBe(0);
    expect(imagery2.referenceCount).toBe(0);
    expect(imagery3.referenceCount).toBe(0);
  });

  it("_uploadImageryTexCoordAttributes throws without context", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const tileset = await loadTestTilesetWithImagery(scene);
    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;
    const modelPrimitiveImageries = modelImagery._modelPrimitiveImageries;
    const modelPrimitiveImagery = modelPrimitiveImageries[0];

    expect(function () {
      modelPrimitiveImagery._uploadImageryTexCoordAttributes(undefined);
    }).toThrowDeveloperError();
  });

  it("_uploadImageryTexCoordAttributes uploads attribute data into buffers", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const tileset = await loadTestTilesetWithImagery(scene);
    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;
    const modelPrimitiveImageries = modelImagery._modelPrimitiveImageries;
    const modelPrimitiveImagery = modelPrimitiveImageries[0];

    // For specs: Delete the buffers that already exist
    const attributes =
      modelPrimitiveImagery._imageryTexCoordAttributesPerProjection;
    for (const attribute of attributes) {
      delete attribute.buffer;
    }

    modelPrimitiveImagery._uploadImageryTexCoordAttributes(scene.context);

    // Expect the new buffers to be present now
    for (const attribute of attributes) {
      expect(attribute.buffer).toBeDefined();
    }
  });

  it("_destroyImageryTexCoordAttributes destroys the attributes and their buffers", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const tileset = await loadTestTilesetWithImagery(scene);
    const root = tileset.root;
    const content = root.content;
    const model = content._model;
    const modelImagery = model._modelImagery;
    const modelPrimitiveImageries = modelImagery._modelPrimitiveImageries;
    const modelPrimitiveImagery = modelPrimitiveImageries[0];

    // Prepare the "buffer.destroy" call expectations for all attributes
    const attributes =
      modelPrimitiveImagery._imageryTexCoordAttributesPerProjection;
    const bufferDestroyCalls = [];
    for (const attribute of attributes) {
      const buffer = attribute.buffer;
      const bufferDestroyCall = spyOn(buffer, "destroy").and.callThrough();
      bufferDestroyCalls.push(bufferDestroyCall);
    }

    modelPrimitiveImagery._destroyImageryTexCoordAttributes();

    // Expect the destroy function of all buffers to have been called
    for (const bufferDestroyCall of bufferDestroyCalls) {
      expect(bufferDestroyCall).toHaveBeenCalled();
    }
    expect(
      modelPrimitiveImagery._imageryTexCoordAttributesPerProjection,
    ).toBeUndefined();
  });

  // Note: The following tests would rather belong into ModelImageryMappingSpec,
  // but require primitive attributes that are only available after loading the
  // tileset in a scene, so they are added here

  it("ModelImageryMapping createCartographicPositions throws without primitivePositionAttribute", async function () {
    if (!scene.context.webgl2) {
      return;
    }
    const primitivePositionAttribute = undefined;
    const primitivePositionTransform = Matrix4.IDENTITY;
    const ellipsoid = Ellipsoid.WGS84;

    expect(function () {
      ModelImageryMapping.createCartographicPositions(
        primitivePositionAttribute,
        primitivePositionTransform,
        ellipsoid,
      );
    }).toThrowDeveloperError();
  });

  it("ModelImageryMapping createCartographicPositions throws without primitivePositionTransform", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const tileset = await loadTestTilesetWithImagery(scene);
    const root = tileset.root;
    const content = root.content;
    const model = content._model;

    const primitivePositionAttribute =
      model.sceneGraph.components.nodes[0].primitives[0].attributes[0];
    const primitivePositionTransform = undefined;
    const ellipsoid = Ellipsoid.WGS84;

    expect(function () {
      ModelImageryMapping.createCartographicPositions(
        primitivePositionAttribute,
        primitivePositionTransform,
        ellipsoid,
      );
    }).toThrowDeveloperError();
  });

  it("ModelImageryMapping createCartographicPositions throws without ellipsoid", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const tileset = await loadTestTilesetWithImagery(scene);
    const root = tileset.root;
    const content = root.content;
    const model = content._model;

    const primitivePositionAttribute =
      model.sceneGraph.components.nodes[0].primitives[0].attributes[0];
    const primitivePositionTransform = Matrix4.IDENTITY;
    const ellipsoid = undefined;

    expect(function () {
      ModelImageryMapping.createCartographicPositions(
        primitivePositionAttribute,
        primitivePositionTransform,
        ellipsoid,
      );
    }).toThrowDeveloperError();
  });

  it("ModelImageryMapping createCartographicPositions creates cartographic positions", async function () {
    if (!scene.context.webgl2) {
      return;
    }

    const tileset = await loadTestTilesetWithImagery(scene);
    const root = tileset.root;
    const content = root.content;
    const model = content._model;

    const primitivePositionAttribute =
      model.sceneGraph.components.nodes[0].primitives[0].attributes[0];
    const primitivePositionTransform = Matrix4.IDENTITY;
    const ellipsoid = Ellipsoid.WGS84;

    const cartographicPositions =
      ModelImageryMapping.createCartographicPositions(
        primitivePositionAttribute,
        primitivePositionTransform,
        ellipsoid,
      );
    const actualCartographicPositions = [
      ...ModelImageryMapping.map(cartographicPositions, (c) =>
        Cartographic.clone(c),
      ),
    ];
    expect(actualCartographicPositions.length).toBe(9);
  });
});
