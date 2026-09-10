import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  ClippingPolygon,
  ClippingPolygonCollection,
  Math as CesiumMath,
  Model,
  ModelClippingPolygonsPipelineStage,
  Rectangle,
  ShaderBuilder,
} from "../../../index.js";

describe("Scene/Model/ModelClippingPolygonsPipelineStage", function () {
  const positions = Cartesian3.fromRadiansArray([
    -1.3194369277314022, 0.6988062530900625, -1.31941, 0.69879,
    -1.3193931220959367, 0.698743632490865,
  ]);

  // The stage reads the vector-based clipping data that is normally produced
  // during Model update; provide the pieces it consumes, then run the stage.
  function processWithRectangle(rectangle) {
    const model = new Model({ loader: {}, resource: {} });
    model.clippingPolygons = new ClippingPolygonCollection({
      polygons: [new ClippingPolygon({ positions })],
    });
    model._clippingPolygonData = { rectangle };

    const renderResources = {
      shaderBuilder: new ShaderBuilder(),
      uniformMap: {},
      model: model,
    };
    const frameState = {
      camera: { positionCartographic: new Cartographic() },
      context: { defaultTexture: {} },
    };

    ModelClippingPolygonsPipelineStage.process(
      renderResources,
      model,
      frameState,
    );

    return { renderResources, frameState };
  }

  it("maps the camera position to its uv within the clipping rectangle", function () {
    const rectangle = Rectangle.fromDegrees(-10.0, -20.0, 10.0, 20.0);
    const { renderResources, frameState } = processWithRectangle(rectangle);

    frameState.camera.positionCartographic = Cartographic.fromDegrees(
      5.0,
      10.0,
    );
    const uv = renderResources.uniformMap.u_clippingCameraUv();

    // west=-10, width=20  -> u = (5 - (-10)) / 20 = 0.75
    // south=-20, height=40 -> v = (10 - (-20)) / 40 = 0.75
    expect(uv).toEqualEpsilon(new Cartesian2(0.75, 0.75), CesiumMath.EPSILON7);
  });

  it("wraps longitude for clipping rectangles that cross the antimeridian", function () {
    const rectangle = Rectangle.fromDegrees(170.0, -10.0, -170.0, 10.0);
    const { renderResources, frameState } = processWithRectangle(rectangle);

    // A camera at 185 degrees longitude, expressed in [-180, 180] as -175.
    frameState.camera.positionCartographic = Cartographic.fromDegrees(
      -175.0,
      0.0,
    );
    const uv = renderResources.uniformMap.u_clippingCameraUv();

    // The rectangle spans 170 -> 190; the camera sits 15 degrees in -> u = 0.75.
    expect(uv).toEqualEpsilon(new Cartesian2(0.75, 0.5), CesiumMath.EPSILON7);
  });
});
