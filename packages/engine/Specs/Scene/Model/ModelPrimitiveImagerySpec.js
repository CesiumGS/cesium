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
} from "../../../index.js";

import createScene from "../../../../../Specs/createScene.js";
import loadAndZoomToModelAsync from "./loadAndZoomToModelAsync.js";

const unitSquare_fourPrimitives_plain_url =
  "./Data/Models/glTF-2.0/unitSquare/unitSquare_fourPrimitives_plain.glb";

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
});
