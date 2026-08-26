import {
  Cartesian3,
  Cartesian4,
  Ion,
  IonSnapGeometryType,
  IonSnapHeat,
  IonSnapMode,
  IonSnapParentGeometryType,
  IonSnapService,
  Math as CesiumMath,
  Matrix4,
  RequestErrorEvent,
  Resource,
  RuntimeError,
} from "../../index.js";

describe("Core/IonSnapService", function () {
  const assetId = 123456;

  // Row-major iModel-spatial -> ECEF transform, as returned by the ecef endpoint.
  const ecefTransformRows = [
    [1, 0, 0, 100],
    [0, 1, 0, 200],
    [0, 0, 1, 300],
    [0, 0, 0, 1],
  ];

  let previousDefaultAccessToken;
  let previousDefaultServer;

  beforeEach(function () {
    previousDefaultAccessToken = Ion.defaultAccessToken;
    previousDefaultServer = Ion.defaultServer;
  });

  afterEach(function () {
    Ion.defaultAccessToken = previousDefaultAccessToken;
    Ion.defaultServer = previousDefaultServer;
  });

  function makeSnapper(options) {
    options = options ?? {};
    return new IonSnapService({
      assetId: assetId,
      resource: new Resource({
        url: `https://example.com/assets/${assetId}/`,
      }),
      ecefTransform: options.ecefTransform ?? Matrix4.clone(Matrix4.IDENTITY),
    });
  }

  function mockCamera(options) {
    options = options ?? {};
    return {
      viewMatrix: options.viewMatrix ?? Matrix4.clone(Matrix4.IDENTITY),
      frustum: {
        projectionMatrix:
          options.projectionMatrix ?? Matrix4.clone(Matrix4.IDENTITY),
      },
    };
  }

  // Required view options for snap() calls that aren't exercising the view.
  function viewOptions() {
    return {
      camera: mockCamera(),
      canvasWidth: 800,
      canvasHeight: 600,
    };
  }

  describe("fromAssetId", function () {
    it("throws without assetId", async function () {
      await expectAsync(
        IonSnapService.fromAssetId(),
      ).toBeRejectedWithDeveloperError();
    });

    it("fetches the ecef transform and constructs a snapper", async function () {
      let fetchedResource;
      spyOn(Resource.prototype, "fetchJson").and.callFake(function () {
        fetchedResource = this;
        return Promise.resolve({ ecefTransform: ecefTransformRows });
      });

      const snapper = await IonSnapService.fromAssetId(assetId, {
        accessToken: "not_a_real_token",
        server: "https://example.com/api",
      });

      expect(fetchedResource.url).toContain(
        `https://example.com/api/assets/${assetId}/ecef`,
      );
      expect(fetchedResource.queryParameters.access_token).toBe(
        "not_a_real_token",
      );
      expect(fetchedResource.headers["X-Cesium-Client"]).toBe("CesiumJS");

      expect(snapper.assetId).toBe(assetId);
      expect(snapper.ecefTransform).toEqual(
        Matrix4.fromRowMajorArray(ecefTransformRows.flat()),
      );
    });

    it("uses Ion defaults for accessToken and server", async function () {
      Ion.defaultAccessToken = "default_token";
      Ion.defaultServer = new Resource({ url: "https://example.com/" });

      let fetchedResource;
      spyOn(Resource.prototype, "fetchJson").and.callFake(function () {
        fetchedResource = this;
        return Promise.resolve({ ecefTransform: ecefTransformRows });
      });

      await IonSnapService.fromAssetId(assetId);

      expect(fetchedResource.url).toContain(
        `https://example.com/assets/${assetId}/ecef`,
      );
      expect(fetchedResource.queryParameters.access_token).toBe(
        "default_token",
      );
    });

    it("rejects with RuntimeError when the asset is not geolocated", async function () {
      spyOn(Resource.prototype, "fetchJson").and.returnValue(
        Promise.resolve({ ecefTransform: null }),
      );

      await expectAsync(
        IonSnapService.fromAssetId(assetId, {
          accessToken: "not_a_real_token",
          server: "https://example.com/",
        }),
      ).toBeRejectedWithError(RuntimeError, /not geolocated/);
    });
  });

  describe("_computeWorldToView", function () {
    it("throws without camera or dimensions", function () {
      const snapper = makeSnapper();
      expect(function () {
        snapper._computeWorldToView();
      }).toThrowDeveloperError();
      expect(function () {
        snapper._computeWorldToView(mockCamera());
      }).toThrowDeveloperError();
      expect(function () {
        snapper._computeWorldToView(mockCamera(), 800);
      }).toThrowDeveloperError();
    });

    it("maps NDC to CSS pixels with identity view and projection", function () {
      const snapper = makeSnapper();
      const worldToView = snapper._computeWorldToView(mockCamera(), 800, 600);

      const center = Matrix4.multiplyByVector(
        worldToView,
        new Cartesian4(0, 0, 0, 1),
        new Cartesian4(),
      );
      expect(center.x).toEqualEpsilon(400, CesiumMath.EPSILON10);
      expect(center.y).toEqualEpsilon(300, CesiumMath.EPSILON10);
      expect(center.z).toEqualEpsilon(0.5, CesiumMath.EPSILON10);

      // NDC (1, 1) is the top-right corner: pixel (width, 0), y-down.
      const topRight = Matrix4.multiplyByVector(
        worldToView,
        new Cartesian4(1, 1, 0, 1),
        new Cartesian4(),
      );
      expect(topRight.x).toEqualEpsilon(800, CesiumMath.EPSILON10);
      expect(topRight.y).toEqualEpsilon(0, CesiumMath.EPSILON10);

      const bottomLeft = Matrix4.multiplyByVector(
        worldToView,
        new Cartesian4(-1, -1, 0, 1),
        new Cartesian4(),
      );
      expect(bottomLeft.x).toEqualEpsilon(0, CesiumMath.EPSILON10);
      expect(bottomLeft.y).toEqualEpsilon(600, CesiumMath.EPSILON10);
    });

    it("composes V * P * Vm * E in the correct order", function () {
      const ecefTransform = Matrix4.fromTranslation(new Cartesian3(10, 20, 30));
      const viewMatrix = Matrix4.fromTranslation(new Cartesian3(-5, 0, -100));
      const projectionMatrix = Matrix4.fromUniformScale(2);
      const snapper = makeSnapper({ ecefTransform: ecefTransform });
      const camera = mockCamera({
        viewMatrix: viewMatrix,
        projectionMatrix: projectionMatrix,
      });

      const worldToView = snapper._computeWorldToView(camera, 800, 600);

      const V = Matrix4.fromRowMajorArray(
        // prettier-ignore
        [
          400, 0, 0, 400,
          0, -300, 0, 300,
          0, 0, 0.5, 0.5,
          0, 0, 0, 1,
        ],
      );
      let expected = Matrix4.multiply(viewMatrix, ecefTransform, new Matrix4());
      expected = Matrix4.multiply(projectionMatrix, expected, expected);
      expected = Matrix4.multiply(V, expected, expected);
      expect(worldToView).toEqualEpsilon(expected, CesiumMath.EPSILON10);
    });

    it("scales the viewport from the provided dimensions", function () {
      const snapper = makeSnapper();
      const worldToView = snapper._computeWorldToView(mockCamera(), 800, 600);

      expect(worldToView[Matrix4.COLUMN0ROW0]).toEqualEpsilon(
        400,
        CesiumMath.EPSILON10,
      );
      expect(worldToView[Matrix4.COLUMN1ROW1]).toEqualEpsilon(
        -300,
        CesiumMath.EPSILON10,
      );
    });

    it("projects a point on the view axis to the canvas center", function () {
      // Symmetric perspective projection; any point straight down the view
      // axis must land at the exact center of the canvas.
      const near = 1;
      const far = 1000;
      const projectionMatrix = Matrix4.computePerspectiveFieldOfView(
        CesiumMath.PI_OVER_THREE,
        800 / 600,
        near,
        far,
        new Matrix4(),
      );
      const snapper = makeSnapper();
      const camera = mockCamera({ projectionMatrix: projectionMatrix });

      const worldToView = snapper._computeWorldToView(camera, 800, 600);
      const projected = Matrix4.multiplyByVector(
        worldToView,
        new Cartesian4(0, 0, -10, 1),
        new Cartesian4(),
      );
      const px = projected.x / projected.w;
      const py = projected.y / projected.w;
      expect(px).toEqualEpsilon(400, CesiumMath.EPSILON7);
      expect(py).toEqualEpsilon(300, CesiumMath.EPSILON7);
    });

    it("stores the result in the provided matrix", function () {
      const snapper = makeSnapper();
      const result = new Matrix4();
      const returned = snapper._computeWorldToView(
        mockCamera(),
        800,
        600,
        result,
      );
      expect(returned).toBe(result);
    });
  });

  describe("snap", function () {
    const testPoint = Cartesian3.fromDegrees(151.092843, -33.8143919, 56.281);

    function spyOnPost(response) {
      const captured = {};
      spyOn(Resource.prototype, "post").and.callFake(function (body, options) {
        captured.resource = this;
        captured.body = JSON.parse(body);
        captured.options = options;
        return Promise.resolve(response);
      });
      return captured;
    }

    it("throws without required options", async function () {
      const snapper = makeSnapper();
      await expectAsync(snapper.snap()).toBeRejectedWithDeveloperError();
      await expectAsync(
        snapper.snap({ elementId: "0x1", ...viewOptions() }),
      ).toBeRejectedWithDeveloperError();
      await expectAsync(
        snapper.snap({ testPoint: testPoint, ...viewOptions() }),
      ).toBeRejectedWithDeveloperError();
      await expectAsync(
        snapper.snap({
          elementId: "0x1",
          testPoint: testPoint,
        }),
      ).toBeRejectedWithDeveloperError();
      await expectAsync(
        snapper.snap({
          elementId: "0x1",
          testPoint: testPoint,
          camera: mockCamera(),
        }),
      ).toBeRejectedWithDeveloperError();
      await expectAsync(
        snapper.snap({
          elementId: "0x1",
          testPoint: testPoint,
          camera: mockCamera(),
          canvasWidth: 800,
        }),
      ).toBeRejectedWithDeveloperError();
    });

    it("posts to the element snap endpoint with a WGS84 testPoint", async function () {
      const captured = spyOnPost({ status: 0 });
      const snapper = makeSnapper();

      await snapper.snap({
        elementId: "0x30000000df2",
        testPoint: testPoint,
        ...viewOptions(),
      });

      expect(captured.resource.url).toContain(
        `https://example.com/assets/${assetId}/elements/0x30000000df2/snap`,
      );
      expect(captured.options.headers["Content-Type"]).toBe("application/json");

      const body = captured.body;
      expect(body.testPoint.longitude).toEqualEpsilon(
        151.092843,
        CesiumMath.EPSILON8,
      );
      expect(body.testPoint.latitude).toEqualEpsilon(
        -33.8143919,
        CesiumMath.EPSILON8,
      );
      expect(body.testPoint.height).toEqualEpsilon(56.281, CesiumMath.EPSILON6);

      // Defaults are sent explicitly so behavior does not depend on the
      // server's defaults. worldToView is always composed and sent.
      expect(body.closePoint).toEqual(body.testPoint);
      expect(body.worldToView.length).toBe(4);
      expect(body.snapAperture).toBe(IonSnapService.DEFAULT_SNAP_APERTURE);
      expect(body.snapMode).toBe(IonSnapMode.NEAREST);
    });

    it("forwards optional closePoint, snapAperture, and snapMode", async function () {
      const captured = spyOnPost({ status: 0 });
      const snapper = makeSnapper();
      const closePoint = Cartesian3.fromDegrees(151.1, -33.8, 60.0);

      await snapper.snap({
        elementId: "0x1",
        testPoint: testPoint,
        closePoint: closePoint,
        snapAperture: 24,
        snapMode: IonSnapMode.CENTER,
        ...viewOptions(),
      });

      const body = captured.body;
      expect(body.closePoint.longitude).toEqualEpsilon(
        151.1,
        CesiumMath.EPSILON8,
      );
      expect(body.closePoint.latitude).toEqualEpsilon(
        -33.8,
        CesiumMath.EPSILON8,
      );
      expect(body.snapAperture).toBe(24);
      expect(body.snapMode).toBe(IonSnapMode.CENTER);
    });

    it("composes worldToView from the camera and canvas dimensions", async function () {
      const captured = spyOnPost({ status: 0 });
      const snapper = makeSnapper();
      const camera = mockCamera();

      await snapper.snap({
        elementId: "0x1",
        testPoint: testPoint,
        camera: camera,
        canvasWidth: 800,
        canvasHeight: 600,
      });

      const expected = snapper._computeWorldToView(camera, 800, 600);
      expect(
        Matrix4.fromRowMajorArray(captured.body.worldToView.flat()),
      ).toEqualEpsilon(expected, CesiumMath.EPSILON10);
    });

    it("converts response snapPoint and hitPoint to Cartesian3", async function () {
      spyOnPost({
        status: 0,
        snapMode: 1,
        heat: 2,
        geomType: 2,
        parentGeomType: 4,
        snapPoint: { longitude: 151.09, latitude: -33.81, height: 56.0 },
        hitPoint: { longitude: 151.091, latitude: -33.811, height: 57.0 },
        normal: [0.94, -0.33, 0],
      });
      const snapper = makeSnapper();

      const result = await snapper.snap({
        elementId: "0x1",
        testPoint: testPoint,
        ...viewOptions(),
      });

      expect(result.snapMode).toBeUndefined();
      expect(result.heat).toBe(2);
      expect(result.geometryType).toBe(2);
      expect(result.parentGeometryType).toBe(4);
      expect(result.normal).toEqual([0.94, -0.33, 0]);
      expect(result.snapPoint).toEqualEpsilon(
        Cartesian3.fromDegrees(151.09, -33.81, 56.0),
        CesiumMath.EPSILON7,
      );
      expect(result.hitPoint).toEqualEpsilon(
        Cartesian3.fromDegrees(151.091, -33.811, 57.0),
        CesiumMath.EPSILON7,
      );
    });

    it("returns undefined snapPoint and hitPoint when absent from the response", async function () {
      spyOnPost({ status: 0 });
      const snapper = makeSnapper();

      const result = await snapper.snap({
        elementId: "0x1",
        testPoint: testPoint,
        ...viewOptions(),
      });

      expect(result.snapPoint).toBeUndefined();
      expect(result.hitPoint).toBeUndefined();
    });

    it("returns undefined when no snap is possible (404)", async function () {
      spyOn(Resource.prototype, "post").and.callFake(function () {
        return Promise.reject(new RequestErrorEvent(404));
      });
      const snapper = makeSnapper();

      const result = await snapper.snap({
        elementId: "0x1",
        testPoint: testPoint,
        ...viewOptions(),
      });
      expect(result).toBeUndefined();
    });

    it("returns undefined when no snap is possible (400 with a no-snap message)", async function () {
      spyOn(Resource.prototype, "post").and.callFake(function () {
        return Promise.reject(
          new RequestErrorEvent(400, {
            code: "BadRequest",
            message:
              "Snap failed for element 0x1: No snap possible for this element (element may lack snappable geometry or test point is too far)",
          }),
        );
      });
      const snapper = makeSnapper();

      const result = await snapper.snap({
        elementId: "0x1",
        testPoint: testPoint,
        ...viewOptions(),
      });
      expect(result).toBeUndefined();
    });

    it("rethrows a 400 without a no-snap message", async function () {
      const error = new RequestErrorEvent(400, {
        code: "BadRequest",
        message: "Invalid WGS84 point",
      });
      spyOn(Resource.prototype, "post").and.callFake(function () {
        return Promise.reject(error);
      });
      const snapper = makeSnapper();

      await expectAsync(
        snapper.snap({
          elementId: "0x1",
          testPoint: testPoint,
          ...viewOptions(),
        }),
      ).toBeRejectedWith(error);
    });

    it("returns undefined when the response has no content", async function () {
      spyOnPost(undefined);
      const snapper = makeSnapper();

      const result = await snapper.snap({
        elementId: "0x1",
        testPoint: testPoint,
        ...viewOptions(),
      });
      expect(result).toBeUndefined();
    });

    it("rethrows non-404 errors", async function () {
      const error = new RequestErrorEvent(500);
      spyOn(Resource.prototype, "post").and.callFake(function () {
        return Promise.reject(error);
      });
      const snapper = makeSnapper();

      await expectAsync(
        snapper.snap({
          elementId: "0x1",
          testPoint: testPoint,
          ...viewOptions(),
        }),
      ).toBeRejectedWith(error);
    });
  });

  describe("DEFAULT_SNAP_APERTURE", function () {
    it("is a positive number", function () {
      expect(typeof IonSnapService.DEFAULT_SNAP_APERTURE).toBe("number");
      expect(IonSnapService.DEFAULT_SNAP_APERTURE).toBeGreaterThan(0);
    });
  });

  describe("IonSnapMode", function () {
    it("is frozen and exposes the expected values", function () {
      expect(Object.isFrozen(IonSnapMode)).toBe(true);
      expect(IonSnapMode.NEAREST).toBe(1);
      expect(IonSnapMode.NEAREST_KEYPOINT).toBe(2);
      expect(IonSnapMode.CENTER).toBe(8);
    });
  });

  describe("response enums", function () {
    it("IonSnapHeat is frozen and exposes the expected values", function () {
      expect(Object.isFrozen(IonSnapHeat)).toBe(true);
      expect(IonSnapHeat.NONE).toBe(0);
      expect(IonSnapHeat.NOT_IN_RANGE).toBe(1);
      expect(IonSnapHeat.IN_RANGE).toBe(2);
    });

    it("IonSnapGeometryType is frozen and exposes the expected values", function () {
      expect(Object.isFrozen(IonSnapGeometryType)).toBe(true);
      expect(IonSnapGeometryType.NONE).toBe(0);
      expect(IonSnapGeometryType.POINT).toBe(1);
      expect(IonSnapGeometryType.SEGMENT).toBe(2);
      expect(IonSnapGeometryType.CURVE).toBe(3);
      expect(IonSnapGeometryType.ARC).toBe(4);
      expect(IonSnapGeometryType.SURFACE).toBe(5);
    });

    it("IonSnapParentGeometryType is frozen and exposes the expected values", function () {
      expect(Object.isFrozen(IonSnapParentGeometryType)).toBe(true);
      expect(IonSnapParentGeometryType.NONE).toBe(0);
      expect(IonSnapParentGeometryType.WIRE).toBe(1);
      expect(IonSnapParentGeometryType.SHEET).toBe(2);
      expect(IonSnapParentGeometryType.SOLID).toBe(3);
      expect(IonSnapParentGeometryType.MESH).toBe(4);
      expect(IonSnapParentGeometryType.TEXT).toBe(5);
    });
  });
});
