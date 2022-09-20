import {
  Cartesian2,
  Cartesian3,
  combine,
  Ellipsoid,
  FeatureDetection,
  GeographicProjection,
  IntersectionTests,
  KeyboardEventModifier,
  OrthographicFrustum,
  OrthographicOffCenterFrustum,
  Ray,
  Transforms,
  Camera,
  CameraEventType,
  MapMode2D,
  SceneMode,
  ScreenSpaceCameraController,
} from "../../../Source/Cesium.js";

import { Math as CesiumMath } from "../../Source/Cesium.js";

import createCamera from "../createCamera.js";
import createCanvas from "../createCanvas.js";
import DomEventSimulator from "../DomEventSimulator.js";

describe("Scene/ScreenSpaceCameraController", function () {
  let usePointerEvents;
  let scene;
  let canvas;
  let camera;
  let controller;

  function MockScene(canvas, camera, ellipsoid) {
    this.canvas = canvas;
    this.camera = camera;
    this.globe = undefined;
    this.mapProjection = new GeographicProjection(ellipsoid);
    this.screenSpaceCameraController = undefined;
    this.cameraUnderground = false;
    this.globeHeight = 0.0;
  }

  function MockGlobe(ellipsoid) {
    this.ellipsoid = ellipsoid;
    this.getHeight = function (cartographic) {
      return 0.0;
    };
    this.pickWorldCoordinates = function () {
      return new Cartesian3(0.0, 0.0, 1.0);
    };
    this._surface = {
      tileProvider: {
        ready: true,
      },
      _tileLoadQueueHigh: [],
      _tileLoadQueueMedium: [],
      _tileLoadQueueLow: [],
      _debug: {
        tilesWaitingForChildren: 0,
      },
    };

    this.terrainExaggeration = 1.0;
    this.terrainExaggerationRelativeHeight = 0.0;

    this.show = true;
  }
  beforeAll(function () {
    usePointerEvents = FeatureDetection.supportsPointerEvents();
    canvas = createCanvas(1024, 768);
  });

  afterAll(function () {
    document.body.removeChild(canvas);
  });

  beforeEach(function () {
    const maxRadii = Ellipsoid.WGS84.maximumRadius;
    const offset = Cartesian3.multiplyByScalar(
      Cartesian3.normalize(new Cartesian3(0.0, -2.0, 1.0), new Cartesian3()),
      2.5 * maxRadii,
      new Cartesian3()
    );

    camera = createCamera({
      canvas: canvas,
      offset: offset,
      near: 1.0,
      far: 500000000.0,
    });

    scene = new MockScene(canvas, camera, Ellipsoid.WGS84);
    controller = new ScreenSpaceCameraController(scene);

    scene.screenSpaceCameraController = controller;
    camera._scene = scene;
  });

  afterEach(function () {
    scene.mapMode2D = MapMode2D.INFINITE_SCROLL;
    controller =
      controller && !controller.isDestroyed() && controller.destroy();
  });

  const MouseButtons = {
    LEFT: 0,
    MIDDLE: 1,
    RIGHT: 2,
  };

  function simulateMouseDown(options) {
    if (usePointerEvents) {
      DomEventSimulator.firePointerDown(
        canvas,
        combine(options, {
          pointerType: "mouse",
        })
      );
    } else {
      DomEventSimulator.fireMouseDown(canvas, options);
    }
  }

  function simulateMouseUp(options) {
    if (usePointerEvents) {
      DomEventSimulator.firePointerUp(
        canvas,
        combine(options, {
          pointerType: "mouse",
        })
      );
    } else {
      DomEventSimulator.fireMouseUp(document, options);
    }
  }

  function simulateMouseMove(options) {
    if (usePointerEvents) {
      DomEventSimulator.firePointerMove(
        canvas,
        combine(options, {
          pointerType: "mouse",
        })
      );
    } else {
      DomEventSimulator.fireMouseMove(document, options);
    }
  }

  function simulateMouseWheel(wheelDelta) {
    if ("onwheel" in document) {
      DomEventSimulator.fireWheel(
        canvas,
        combine({
          deltaY: -wheelDelta,
        })
      );
    } else if (document.onmousewheel !== undefined) {
      DomEventSimulator.fireMouseWheel(
        canvas,
        combine({
          wheelDelta: wheelDelta,
        })
      );
    }
  }

  function moveMouse(button, startPosition, endPosition, shiftKey) {
    const canvasRect = canvas.getBoundingClientRect();

    const options = {
      button: button,
      clientX: startPosition.x + canvasRect.left,
      clientY: startPosition.y + canvasRect.top,
      shiftKey: shiftKey,
    };
    simulateMouseDown(options);
    options.clientX = endPosition.x + canvasRect.left;
    options.clientY = endPosition.y + canvasRect.top;
    simulateMouseMove(options);
    simulateMouseUp(options);
  }

  function setUp2D() {
    scene.mode = SceneMode.SCENE2D;

    const ellipsoid = Ellipsoid.WGS84;
    scene.mapProjection = new GeographicProjection(ellipsoid);

    scene.frameState = {
      mode: scene.mode,
      mapProjection: scene.mapProjection,
    };

    scene.cameraUnderground = false;

    const maxRadii = ellipsoid.maximumRadius;
    const frustum = new OrthographicOffCenterFrustum();
    frustum.right = maxRadii * Math.PI;
    frustum.left = -frustum.right;
    frustum.top = frustum.right * (canvas.clientHeight / canvas.clientWidth);
    frustum.bottom = -frustum.top;
    frustum.near = 0.01 * maxRadii;
    frustum.far = 60.0 * maxRadii;
    camera.frustum = frustum;

    camera.position = new Cartesian3(0.0, 0.0, maxRadii);
    camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
    camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
    camera.right = Cartesian3.clone(Cartesian3.UNIT_X);
  }

  function setUpCV() {
    scene.mode = SceneMode.COLUMBUS_VIEW;

    const ellipsoid = Ellipsoid.WGS84;
    scene.mapProjection = new GeographicProjection(ellipsoid);

    scene.frameState = {
      mode: scene.mode,
      mapProjection: scene.mapProjection,
    };

    scene.cameraUnderground = false;
    controller.enableCollisionDetection = true;

    const maxRadii = ellipsoid.maximumRadius;
    camera.position = new Cartesian3(0.0, 0.0, maxRadii);
    camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
    camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
    camera.right = Cartesian3.clone(Cartesian3.UNIT_X);
  }

  function setUpCVUnderground() {
    scene.mode = SceneMode.COLUMBUS_VIEW;

    const ellipsoid = Ellipsoid.WGS84;
    scene.globe = new MockGlobe(ellipsoid);
    scene.mapProjection = new GeographicProjection(ellipsoid);

    scene.frameState = {
      mode: scene.mode,
      mapProjection: scene.mapProjection,
    };

    scene.cameraUnderground = true;
    controller.enableCollisionDetection = false;

    camera.position = new Cartesian3(0.0, 0.0, -100.0);
    camera.direction = Cartesian3.clone(Cartesian3.UNIT_Z);
    camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
    camera.right = Cartesian3.cross(
      camera.direction,
      camera.up,
      new Cartesian3()
    );
  }

  function setUp3D() {
    scene.mode = SceneMode.SCENE3D;

    const ellipsoid = Ellipsoid.WGS84;
    scene.mapProjection = new GeographicProjection(ellipsoid);

    scene.frameState = {
      mode: scene.mode,
      mapProjection: scene.mapProjection,
    };

    scene.cameraUnderground = false;
    controller.enableCollisionDetection = true;
  }

  function setUp3DUnderground() {
    setUp3D();
    scene.globe = new MockGlobe(scene.mapProjection.ellipsoid);
    scene.cameraUnderground = true;
    controller.enableCollisionDetection = false;

    camera.setView({ destination: Camera.DEFAULT_VIEW_RECTANGLE });
    const positionCart = Ellipsoid.WGS84.cartesianToCartographic(
      camera.position
    );
    positionCart.height = -100.0;
    camera.position = Ellipsoid.WGS84.cartographicToCartesian(positionCart);
  }

  it("constructor throws without a scene", function () {
    expect(function () {
      return new ScreenSpaceCameraController();
    }).toThrowDeveloperError();
  });

  function updateController() {
    camera.update(scene.mode);
    controller.update();
  }

  it("translate right in 2D", function () {
    setUp2D();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 4,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();
    expect(position.x).toBeLessThan(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);
  });

  it("translate left in 2D", function () {
    setUp2D();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 4,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();
    expect(position.x).toBeGreaterThan(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);
  });

  it("translate up in 2D", function () {
    setUp2D();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();
    expect(position.y).toBeGreaterThan(camera.position.y);
    expect(position.x).toEqual(camera.position.x);
    expect(position.z).toEqual(camera.position.z);
  });

  it("translate down in 2D", function () {
    setUp2D();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();
    expect(position.y).toBeLessThan(camera.position.y);
    expect(position.x).toEqual(camera.position.x);
    expect(position.z).toEqual(camera.position.z);
  });

  it("translate in rotated 2D", function () {
    setUp2D();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    camera.up = Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3());
    camera.right = Cartesian3.clone(Cartesian3.UNIT_Y);

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();
    expect(position.x).toBeGreaterThan(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);
  });

  it("zoom in 2D", function () {
    setUp2D();
    const position = Cartesian3.clone(camera.position);
    const frustumDiff = camera.frustum.right - camera.frustum.left;
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);
    expect(frustumDiff).toBeGreaterThan(
      camera.frustum.right - camera.frustum.left
    );
  });

  it("zoom out in 2D", function () {
    setUp2D();

    const frustum = camera.frustum;
    frustum.right = 1000.0;
    frustum.left = -frustum.right;
    frustum.top = frustum.right * (canvas.clientHeight / canvas.clientWidth);
    frustum.bottom = -frustum.top;

    const position = Cartesian3.clone(camera.position);
    const frustumDiff = frustum.right - frustum.left;
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);
    expect(frustumDiff).toBeLessThan(
      camera.frustum.right - camera.frustum.left
    );
  });

  it("zoom in 2D with wheel", function () {
    setUp2D();
    const position = Cartesian3.clone(camera.position);
    const frustumDiff = camera.frustum.right - camera.frustum.left;

    simulateMouseWheel(120);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);
    expect(frustumDiff).toBeGreaterThan(
      camera.frustum.right - camera.frustum.left
    );
  });

  it("zoom out in 2D with wheel", function () {
    setUp2D();

    const frustum = camera.frustum;
    frustum.right = 1000.0;
    frustum.left = -frustum.right;
    frustum.top = frustum.right * (canvas.clientHeight / canvas.clientWidth);
    frustum.bottom = -frustum.top;

    const position = Cartesian3.clone(camera.position);
    const frustumDiff = frustum.right - frustum.left;

    simulateMouseWheel(-120);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);
    expect(frustumDiff).toBeLessThan(
      camera.frustum.right - camera.frustum.left
    );
  });

  it("zoom with max zoom rate in 2D", function () {
    setUp2D();
    const position = Cartesian3.clone(camera.position);

    const factor = 1000000.0;
    camera.frustum.right *= factor;
    camera.frustum.left *= factor;
    camera.frustum.top *= factor;
    camera.frustum.bottom *= factor;

    const frustumDiff = camera.frustum.right - camera.frustum.left;
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);
    expect(frustumDiff).toBeGreaterThan(
      camera.frustum.right - camera.frustum.left
    );
  });

  it("zoom with no mouse movement has no effect on the camera", function () {
    setUp2D();
    const position = Cartesian3.clone(camera.position);
    const frustumDiff = camera.frustum.right - camera.frustum.left;
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);
    expect(frustumDiff).toEqual(camera.frustum.right - camera.frustum.left);
  });

  it("zoom in does not affect camera close to the surface", function () {
    setUp2D();

    const frustum = camera.frustum;
    const ratio = frustum.top / frustum.right;
    frustum.right = (controller.minimumZoomDistance + 1.0) * 0.5;
    frustum.left = -frustum.right;
    frustum.top = ratio * frustum.right;
    frustum.bottom = -frustum.top;

    const position = Cartesian3.clone(camera.position);
    const frustumDiff = camera.frustum.right - camera.frustum.left;
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);
    expect(frustumDiff).toEqual(camera.frustum.right - camera.frustum.left);
  });

  it("zooms out with maximum distance in 2D", function () {
    setUp2D();

    const frustum = camera.frustum;
    frustum.near = 1.0;
    frustum.far = 2.0;
    frustum.left = -2.0;
    frustum.right = 2.0;
    frustum.top = 1.0;
    frustum.bottom = -1.0;

    const maxZoom = 10.0;
    controller.minimumZoomDistance = 0.0;
    controller.maximumZoomDistance = maxZoom;

    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight
    );
    const endPosition = new Cartesian2(canvas.clientWidth / 2, 0);

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(camera.frustum.right).toEqualEpsilon(
      maxZoom * 0.5,
      CesiumMath.EPSILON10
    );
    expect(camera.frustum.left).toEqual(-camera.frustum.right);
    expect(camera.frustum.top).toEqualEpsilon(
      maxZoom * 0.25,
      CesiumMath.EPSILON10
    );
    expect(camera.frustum.bottom).toEqual(-camera.frustum.top);
  });

  it("rotate counter-clockwise in 2D", function () {
    setUp2D();
    scene.mapMode2D = MapMode2D.ROTATE;

    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 4,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );

    moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);

    expect(camera.direction).toEqualEpsilon(
      Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
      CesiumMath.EPSILON15
    );
    expect(camera.up).toEqualEpsilon(
      Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
      CesiumMath.EPSILON15
    );
    expect(camera.right).toEqualEpsilon(
      Cartesian3.UNIT_Y,
      CesiumMath.EPSILON15
    );
  });

  it("rotate clockwise in 2D", function () {
    setUp2D();
    scene.mapMode2D = MapMode2D.ROTATE;

    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 4,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);

    expect(camera.direction).toEqualEpsilon(
      Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
      CesiumMath.EPSILON15
    );
    expect(camera.up).toEqualEpsilon(Cartesian3.UNIT_X, CesiumMath.EPSILON15);
    expect(camera.right).toEqualEpsilon(
      Cartesian3.negate(Cartesian3.UNIT_Y, new Cartesian3()),
      CesiumMath.EPSILON15
    );
  });

  it("rotates counter-clockwise with mouse position at bottom of the screen", function () {
    setUp2D();
    scene.mapMode2D = MapMode2D.ROTATE;

    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      (3 * canvas.clientWidth) / 4,
      (3 * canvas.clientHeight) / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 4,
      (3 * canvas.clientHeight) / 4
    );

    moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);

    expect(camera.direction).toEqualEpsilon(
      Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
      CesiumMath.EPSILON15
    );
    expect(camera.up).toEqualEpsilon(
      Cartesian3.negate(Cartesian3.UNIT_X, new Cartesian3()),
      CesiumMath.EPSILON15
    );
    expect(camera.right).toEqualEpsilon(
      Cartesian3.UNIT_Y,
      CesiumMath.EPSILON15
    );
  });

  it("translate right in Columbus view", function () {
    setUpCV();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 4,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();
    expect(position.x).toBeLessThan(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);
  });

  it("translate left in Columbus view", function () {
    setUpCV();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 4,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();
    expect(position.x).toBeGreaterThan(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);
  });

  it("translate up in Columbus view", function () {
    setUpCV();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();
    expect(position.y).toBeGreaterThan(camera.position.y);
    expect(position.x).toEqual(camera.position.x);
    expect(position.z).toEqual(camera.position.z);
  });

  it("translate down in Columbus view", function () {
    setUpCV();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();
    expect(position.y).toBeLessThan(camera.position.y);
    expect(position.x).toEqual(camera.position.x);
    expect(position.z).toEqual(camera.position.z);
  });

  it("translates in Columbus view when camera is underground", function () {
    setUpCVUnderground();

    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).not.toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);
  });

  it("looks in Columbus view", function () {
    setUpCV();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition, true);
    updateController();
    expect(camera.position).toEqual(position);
    expect(
      Cartesian3.cross(camera.direction, camera.up, new Cartesian3())
    ).toEqualEpsilon(camera.right, CesiumMath.EPSILON12);
    expect(
      Cartesian3.cross(camera.up, camera.right, new Cartesian3())
    ).toEqualEpsilon(camera.direction, CesiumMath.EPSILON12);
    expect(
      Cartesian3.cross(camera.right, camera.direction, new Cartesian3())
    ).toEqualEpsilon(camera.up, CesiumMath.EPSILON12);
  });

  it("zoom in Columbus view", function () {
    setUpCV();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toBeGreaterThan(camera.position.z);
  });

  it("zoom out in Columbus view", function () {
    setUpCV();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toBeLessThan(camera.position.z);
  });

  it("zoom in Columbus view with wheel", function () {
    setUpCV();
    const position = Cartesian3.clone(camera.position);

    simulateMouseWheel(120);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toBeGreaterThan(camera.position.z);
  });

  it("zoom out in Columbus view with wheel", function () {
    setUpCV();
    const position = Cartesian3.clone(camera.position);

    simulateMouseWheel(-120);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toBeLessThan(camera.position.z);
  });

  it("zoom in Columbus view when camera is underground", function () {
    setUpCVUnderground();

    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(position.z).toBeLessThan(camera.position.z);
  });

  it("rotates in Columbus view", function () {
    setUpCV();
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      (3 * canvas.clientWidth) / 8,
      (3 * canvas.clientHeight) / 8
    );

    camera.position.y = -100.0;

    moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
    updateController();
    expect(
      Cartesian3.dot(
        Cartesian3.normalize(camera.position, new Cartesian3()),
        Cartesian3.UNIT_Z
      )
    ).toBeGreaterThan(0.0);
    expect(Cartesian3.dot(camera.direction, Cartesian3.UNIT_Z)).toBeLessThan(
      0.0
    );
    expect(Cartesian3.dot(camera.up, Cartesian3.UNIT_Z)).toBeGreaterThan(0.0);
    expect(Cartesian3.dot(camera.right, Cartesian3.UNIT_Z)).toBeLessThan(
      CesiumMath.EPSILON6
    );
  });

  it("rotates in Columus view with camera transform set", function () {
    setUpCV();

    const origin = Cartesian3.fromDegrees(-72.0, 40.0);
    camera.lookAtTransform(
      Transforms.eastNorthUpToFixedFrame(origin),
      new Cartesian3(1.0, 0.0, 0.0)
    );

    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(0, 0);
    const endPosition = new Cartesian2(
      canvas.clientWidth / 4,
      canvas.clientHeight / 4
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();

    expect(camera.position).not.toEqual(position);
    expect(camera.direction).toEqualEpsilon(
      Cartesian3.normalize(
        Cartesian3.negate(camera.position, new Cartesian3()),
        new Cartesian3()
      ),
      CesiumMath.EPSILON14
    );
    expect(
      Cartesian3.cross(camera.direction, camera.up, new Cartesian3())
    ).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
    expect(
      Cartesian3.cross(camera.right, camera.direction, new Cartesian3())
    ).toEqualEpsilon(camera.up, CesiumMath.EPSILON14);
  });

  it("rotates in Columbus view when camera is underground", function () {
    setUpCVUnderground();
    camera.position.y = -100.0;

    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      (3 * canvas.clientWidth) / 8,
      (3 * canvas.clientHeight) / 8
    );

    moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
    updateController();
    expect(camera.position).not.toEqual(position);
  });

  it("zooms in Columus view with camera transform set", function () {
    setUpCV();

    const origin = Cartesian3.fromDegrees(-72.0, 40.0);
    camera._transform = Transforms.eastNorthUpToFixedFrame(origin);

    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toBeGreaterThan(camera.position.z);
  });

  it("zoom in Columbus view with camera transform set and with wheel", function () {
    setUpCV();

    const origin = Cartesian3.fromDegrees(-72.0, 40.0);
    camera._transform = Transforms.eastNorthUpToFixedFrame(origin);

    const position = Cartesian3.clone(camera.position);

    simulateMouseWheel(120);
    updateController();
    expect(position.x).toEqual(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toBeGreaterThan(camera.position.z);
  });

  it("adds an animation to correct position or zoom in Columbus view", function () {
    setUpCV();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(0, canvas.clientHeight / 2);
    const endPosition = new Cartesian2(
      4.0 * canvas.clientWidth,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();
    expect(position.x).toBeGreaterThan(camera.position.x);
    expect(position.y).toEqual(camera.position.y);
    expect(position.z).toEqual(camera.position.z);

    expect(controller._tweens.length).toEqual(1);
  });

  it("pans in 3D", function () {
    setUp3D();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      (3 * canvas.clientWidth) / 8,
      (3 * canvas.clientHeight) / 8
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();

    expect(camera.position).not.toEqual(position);
    expect(camera.direction).toEqualEpsilon(
      Cartesian3.normalize(
        Cartesian3.negate(camera.position, new Cartesian3()),
        new Cartesian3()
      ),
      CesiumMath.EPSILON12
    );
    expect(
      Cartesian3.cross(camera.direction, camera.up, new Cartesian3())
    ).toEqualEpsilon(camera.right, CesiumMath.EPSILON12);
    expect(
      Cartesian3.cross(camera.right, camera.direction, new Cartesian3())
    ).toEqualEpsilon(camera.up, CesiumMath.EPSILON12);
  });

  it("pans in 3D with constrained axis", function () {
    setUp3D();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      (3 * canvas.clientWidth) / 8,
      canvas.clientHeight / 2
    );
    camera.constrainedAxis = Cartesian3.clone(Cartesian3.UNIT_Z);

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();

    expect(camera.position).not.toEqual(position);
    expect(camera.direction).toEqualEpsilon(
      Cartesian3.normalize(
        Cartesian3.negate(camera.position, new Cartesian3()),
        new Cartesian3()
      ),
      CesiumMath.EPSILON14
    );
    expect(
      Cartesian3.cross(camera.direction, camera.up, new Cartesian3())
    ).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
    expect(
      Cartesian3.cross(camera.right, camera.direction, new Cartesian3())
    ).toEqualEpsilon(camera.up, CesiumMath.EPSILON14);
  });

  it("strafes in 3D when camera is underground", function () {
    setUp3DUnderground();

    const position = Cartesian3.clone(camera.position);
    const direction = Cartesian3.clone(camera.direction);

    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      (3 * canvas.clientWidth) / 8,
      (3 * canvas.clientHeight) / 8
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();

    expect(camera.position).not.toEqual(position);
    expect(camera.direction).toEqual(direction);
  });

  it("rotates in 3D", function () {
    setUp3D();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(0, 0);
    const endPosition = new Cartesian2(
      canvas.clientWidth / 4,
      canvas.clientHeight / 4
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();

    expect(camera.position).not.toEqual(position);
    expect(camera.direction).toEqualEpsilon(
      Cartesian3.normalize(
        Cartesian3.negate(camera.position, new Cartesian3()),
        new Cartesian3()
      ),
      CesiumMath.EPSILON15
    );
    expect(
      Cartesian3.cross(camera.direction, camera.up, new Cartesian3())
    ).toEqualEpsilon(camera.right, CesiumMath.EPSILON15);
    expect(
      Cartesian3.cross(camera.right, camera.direction, new Cartesian3())
    ).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
  });

  it("rotates with constrained axis", function () {
    setUp3D();

    const axis = Cartesian3.clone(Cartesian3.UNIT_Z);
    camera.constrainedAxis = axis;

    const startPosition = new Cartesian2(0.0, 0.0);
    const endPosition = new Cartesian2(0.0, canvas.clientHeight);

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();

    expect(camera.position.z).toEqualEpsilon(
      Cartesian3.magnitude(camera.position),
      CesiumMath.EPSILON1
    );
    expect(camera.direction).toEqualEpsilon(
      Cartesian3.negate(axis, new Cartesian3()),
      CesiumMath.EPSILON4
    );
    expect(Cartesian3.dot(camera.up, axis)).toBeLessThan(CesiumMath.EPSILON2);
    expect(camera.right).toEqualEpsilon(
      Cartesian3.cross(camera.direction, camera.up, new Cartesian3()),
      CesiumMath.EPSILON4
    );
  });

  it("zoom in 3D", function () {
    setUp3D();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(Cartesian3.magnitude(position)).toBeGreaterThan(
      Cartesian3.magnitude(camera.position)
    );
  });

  it("zoom in 3D to point 0,0", function () {
    setUp3D();
    scene.globe = new MockGlobe(scene.mapProjection.ellipsoid);

    updateController();

    camera.setView({
      destination: Cartesian3.fromDegrees(-72.0, 40.0, 1.0),
    });

    updateController();

    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(0, 0);
    const endPosition = new Cartesian2(0, canvas.clientHeight / 2);

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(Cartesian3.magnitude(position)).toBeGreaterThan(
      Cartesian3.magnitude(camera.position)
    );
  });

  it("zoom out in 3D", function () {
    setUp3D();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(Cartesian3.magnitude(position)).toBeLessThan(
      Cartesian3.magnitude(camera.position)
    );
  });

  it("zooms out to maximum height in 3D", function () {
    setUp3D();

    const positionCart = Ellipsoid.WGS84.cartesianToCartographic(
      camera.position
    );
    positionCart.height = 0.0;
    camera.position = Ellipsoid.WGS84.cartographicToCartesian(positionCart);

    const maxDist = 100.0;
    controller.minimumZoomDistance = 0.0;
    controller.maximumZoomDistance = maxDist;

    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight * 50
    );
    const endPosition = new Cartesian2(canvas.clientWidth / 2, 0);

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();

    const height = Ellipsoid.WGS84.cartesianToCartographic(camera.position)
      .height;
    expect(height).toEqualEpsilon(maxDist, CesiumMath.EPSILON2);
  });

  it("zoom in 3D with wheel", function () {
    setUp3D();
    const position = Cartesian3.clone(camera.position);
    const heading = camera.heading;
    const pitch = camera.pitch;
    const roll = camera.roll;

    simulateMouseWheel(120);
    updateController();
    expect(Cartesian3.magnitude(position)).toBeGreaterThan(
      Cartesian3.magnitude(camera.position)
    );
    expect(camera.heading).toBeCloseTo(heading, 10);
    expect(camera.pitch).toBeCloseTo(pitch, 10);
    expect(camera.roll).toBeCloseTo(roll, 10);
  });

  it("zoom out in 3D with wheel", function () {
    setUp3D();
    const position = Cartesian3.clone(camera.position);
    const heading = camera.heading;
    const pitch = camera.pitch;
    const roll = camera.roll;

    simulateMouseWheel(-120);
    updateController();
    expect(Cartesian3.magnitude(position)).toBeLessThan(
      Cartesian3.magnitude(camera.position)
    );
    expect(camera.heading).toBeCloseTo(heading, 10);
    expect(camera.pitch).toBeCloseTo(pitch, 10);
    expect(camera.roll).toBeCloseTo(roll, 10);
  });

  it("zoom in 3D with orthographic projection", function () {
    setUp3D();

    const frustum = new OrthographicFrustum();
    frustum.aspectRatio = 1.0;
    frustum.width = 20.0;
    camera.frustum = frustum;

    expect(frustum.projectionMatrix).toBeDefined();

    camera.setView({ destination: Camera.DEFAULT_VIEW_RECTANGLE });

    const position = Cartesian3.clone(camera.position);
    const frustumWidth = camera.frustum.width;
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(Cartesian3.magnitude(position)).toBeGreaterThan(
      Cartesian3.magnitude(camera.position)
    );
    expect(frustumWidth).toBeGreaterThan(camera.frustum.width);
  });

  it("zoom out in 3D with orthographic projection", function () {
    setUp3D();

    const frustum = new OrthographicFrustum();
    frustum.aspectRatio = 1.0;
    frustum.width = 20.0;
    camera.frustum = frustum;

    expect(frustum.projectionMatrix).toBeDefined();

    camera.setView({ destination: Camera.DEFAULT_VIEW_RECTANGLE });

    const position = Cartesian3.clone(camera.position);
    const frustumWidth = camera.frustum.width;
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(Cartesian3.magnitude(position)).toBeLessThan(
      Cartesian3.magnitude(camera.position)
    );
    expect(frustumWidth).toBeLessThan(camera.frustum.width);
  });

  it("zoom in 3D when camera is underground", function () {
    setUp3DUnderground();

    const position = Cartesian3.clone(camera.position);
    const direction = Cartesian3.clone(camera.direction);

    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    const vector = Cartesian3.subtract(
      camera.position,
      position,
      new Cartesian3()
    );
    const normalizedVector = Cartesian3.normalize(vector, vector);

    expect(normalizedVector).toEqualEpsilon(direction, CesiumMath.EPSILON2);
    expect(camera.direction).toEqualEpsilon(direction, CesiumMath.EPSILON6);
  });

  it("tilts in 3D", function () {
    setUp3D();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );

    moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
    updateController();
    expect(camera.position).not.toEqual(position);
    expect(camera.direction).not.toEqualEpsilon(
      Cartesian3.normalize(
        Cartesian3.negate(camera.position, new Cartesian3()),
        new Cartesian3()
      ),
      CesiumMath.EPSILON14
    );
    expect(
      Cartesian3.cross(camera.direction, camera.up, new Cartesian3())
    ).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
    expect(
      Cartesian3.cross(camera.right, camera.direction, new Cartesian3())
    ).toEqualEpsilon(camera.up, CesiumMath.EPSILON14);

    const ray = new Ray(camera.positionWC, camera.directionWC);
    const intersection = IntersectionTests.rayEllipsoid(
      ray,
      scene.mapProjection.ellipsoid
    );
    expect(intersection).toBeDefined();
  });

  it("does not tilt in the wrong direction", function () {
    setUp3D();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      (3 * canvas.clientHeight) / 4
    );

    moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
    updateController();
    expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON8);
    expect(camera.direction).toEqualEpsilon(
      Cartesian3.normalize(
        Cartesian3.negate(camera.position, new Cartesian3()),
        new Cartesian3()
      ),
      CesiumMath.EPSILON15
    );
    expect(
      Cartesian3.cross(camera.direction, camera.up, new Cartesian3())
    ).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
    expect(
      Cartesian3.cross(camera.right, camera.direction, new Cartesian3())
    ).toEqualEpsilon(camera.up, CesiumMath.EPSILON15);
  });

  it("tilts at the minimum zoom distance", function () {
    setUp3D();

    const positionCart = Ellipsoid.WGS84.cartesianToCartographic(
      camera.position
    );
    positionCart.height = controller.minimumZoomDistance;
    camera.position = Ellipsoid.WGS84.cartographicToCartesian(positionCart);

    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight
    );
    const endPosition = new Cartesian2(canvas.clientWidth / 2, 0);

    moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
    updateController();

    const height = Ellipsoid.WGS84.cartesianToCartographic(camera.position)
      .height;
    expect(height).toBeLessThan(controller.minimumZoomDistance + 10.0);
    expect(
      Cartesian3.cross(camera.direction, camera.up, new Cartesian3())
    ).toEqualEpsilon(camera.right, CesiumMath.EPSILON14);
    expect(
      Cartesian3.cross(camera.right, camera.direction, new Cartesian3())
    ).toEqualEpsilon(camera.up, CesiumMath.EPSILON14);
  });

  it("tilts in 3D when camera is underground", function () {
    setUp3DUnderground();

    const position = Cartesian3.clone(camera.position);
    const direction = Cartesian3.clone(camera.direction);

    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );

    moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
    updateController();
    expect(camera.position).not.toEqual(position);
    expect(camera.direction).not.toEqual(direction);
  });

  it("looks in 3D", function () {
    setUp3D();
    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition, true);
    updateController();
    expect(camera.position).toEqual(position);
    expect(camera.direction).not.toEqual(
      Cartesian3.normalize(
        Cartesian3.negate(camera.position, new Cartesian3()),
        new Cartesian3()
      )
    );
    expect(
      Cartesian3.cross(camera.direction, camera.up, new Cartesian3())
    ).toEqualEpsilon(camera.right, CesiumMath.EPSILON12);
    expect(
      Cartesian3.cross(camera.up, camera.right, new Cartesian3())
    ).toEqualEpsilon(camera.direction, CesiumMath.EPSILON12);
    expect(
      Cartesian3.cross(camera.right, camera.direction, new Cartesian3())
    ).toEqualEpsilon(camera.up, CesiumMath.EPSILON12);
  });

  it("pans with constrained axis other than z-axis", function () {
    setUp3D();
    camera.position = new Cartesian3(
      0.0,
      2.0 * Ellipsoid.WGS84.maximumRadius,
      0.0
    );
    camera.direction = Cartesian3.normalize(
      Cartesian3.negate(camera.position, new Cartesian3()),
      new Cartesian3()
    );
    camera.up = Cartesian3.clone(Cartesian3.UNIT_X);
    camera.right = Cartesian3.cross(
      camera.direction,
      camera.up,
      new Cartesian3()
    );

    const axis = Cartesian3.clone(Cartesian3.UNIT_X);
    camera.constrainedAxis = axis;

    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();
    expect(Cartesian3.dot(camera.position, axis)).toBeGreaterThan(0.0);
    expect(camera.direction).toEqualEpsilon(
      Cartesian3.normalize(
        Cartesian3.negate(camera.position, new Cartesian3()),
        new Cartesian3()
      ),
      CesiumMath.EPSILON14
    );
    expect(camera.right).toEqualEpsilon(
      Cartesian3.normalize(
        Cartesian3.cross(axis, camera.position, new Cartesian3()),
        new Cartesian3()
      ),
      CesiumMath.EPSILON14
    );
    expect(camera.up).toEqualEpsilon(
      Cartesian3.cross(camera.right, camera.direction, new Cartesian3()),
      CesiumMath.EPSILON14
    );
  });

  it("pans with constrained axis and is tilted", function () {
    setUp3D();
    camera.position = new Cartesian3(
      0.0,
      2.0 * Ellipsoid.WGS84.maximumRadius,
      0.0
    );
    camera.direction = Cartesian3.negate(
      Cartesian3.normalize(camera.position, new Cartesian3()),
      new Cartesian3()
    );
    camera.up = Cartesian3.clone(Cartesian3.UNIT_X);
    camera.right = Cartesian3.cross(
      camera.direction,
      camera.up,
      new Cartesian3()
    );

    const axis = Cartesian3.clone(Cartesian3.UNIT_Z);
    camera.constrainedAxis = axis;

    const startPosition = new Cartesian2(
      canvas.clientWidth * 0.5,
      canvas.clientHeight * 0.25
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth * 0.5,
      canvas.clientHeight * 0.75
    );

    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();

    expect(Cartesian3.dot(camera.position, axis)).toBeLessThan(
      CesiumMath.EPSILON2
    );
    expect(camera.direction).toEqualEpsilon(
      Cartesian3.negate(
        Cartesian3.normalize(camera.position, new Cartesian3()),
        new Cartesian3()
      ),
      CesiumMath.EPSILON12
    );
    expect(camera.right).toEqualEpsilon(axis, CesiumMath.EPSILON12);
    expect(camera.up).toEqualEpsilon(
      Cartesian3.cross(camera.right, camera.direction, new Cartesian3()),
      CesiumMath.EPSILON12
    );
  });

  it("controller does not modify the camera after re-enabling motion", function () {
    setUp3D();
    const position = Cartesian3.clone(camera.position);
    const direction = Cartesian3.clone(camera.direction);
    const up = Cartesian3.clone(camera.up);
    const right = Cartesian3.clone(camera.right);

    const startPosition = new Cartesian2(0.0, 0.0);
    const endPosition = new Cartesian2(canvas.clientWidth, canvas.clientHeight);

    controller.enableRotate = false;
    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();

    expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON7);
    expect(camera.direction).toEqualEpsilon(direction, CesiumMath.EPSILON7);
    expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON7);
    expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON7);

    controller.enableRotate = true;
    updateController();

    expect(camera.position).toEqualEpsilon(position, CesiumMath.EPSILON7);
    expect(camera.direction).toEqualEpsilon(direction, CesiumMath.EPSILON7);
    expect(camera.up).toEqualEpsilon(up, CesiumMath.EPSILON7);
    expect(camera.right).toEqualEpsilon(right, CesiumMath.EPSILON7);
  });

  it("can set input type to undefined", function () {
    setUp3D();
    controller.zoomEventTypes = undefined;

    const position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);
    updateController();
    expect(camera.position).toEqual(position);
  });

  it("can change default input", function () {
    setUp3D();
    controller.translateEventTypes = undefined;
    controller.rotateEventTypes = undefined;
    controller.tiltEventTypes = undefined;
    controller.lookEventTypes = undefined;

    let position = Cartesian3.clone(camera.position);
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );

    controller.zoomEventTypes = CameraEventType.LEFT_DRAG;
    moveMouse(MouseButtons.LEFT, startPosition, endPosition);
    updateController();
    expect(Cartesian3.magnitude(camera.position)).toBeLessThan(
      Cartesian3.magnitude(position)
    );

    position = Cartesian3.clone(camera.position);
    controller.zoomEventTypes = {
      eventType: CameraEventType.LEFT_DRAG,
      modifier: KeyboardEventModifier.SHIFT,
    };
    moveMouse(MouseButtons.LEFT, endPosition, startPosition, true);
    updateController();
    expect(Cartesian3.magnitude(camera.position)).toBeGreaterThan(
      Cartesian3.magnitude(position)
    );

    position = Cartesian3.clone(camera.position);
    controller.zoomEventTypes = [
      CameraEventType.MIDDLE_DRAG,
      {
        eventType: CameraEventType.LEFT_DRAG,
        modifier: KeyboardEventModifier.SHIFT,
      },
    ];
    moveMouse(MouseButtons.MIDDLE, startPosition, endPosition);
    updateController();
    expect(Cartesian3.magnitude(camera.position)).toBeLessThan(
      Cartesian3.magnitude(position)
    );

    position = Cartesian3.clone(camera.position);
    moveMouse(MouseButtons.LEFT, endPosition, startPosition, true);
    updateController();
    expect(Cartesian3.magnitude(camera.position)).toBeGreaterThan(
      Cartesian3.magnitude(position)
    );
  });

  it("camera does not go below the terrain in 3D", function () {
    setUp3D();
    scene.globe = new MockGlobe(scene.mapProjection.ellipsoid);

    updateController();

    camera.setView({
      destination: Cartesian3.fromDegrees(-72.0, 40.0, -10.0),
    });

    // Trigger terrain adjustment with a small mouse movement
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);

    updateController();

    expect(camera.positionCartographic.height).toEqualEpsilon(
      controller.minimumZoomDistance,
      CesiumMath.EPSILON5
    );
  });

  it("camera does not go below the terrain in CV", function () {
    setUpCV();
    scene.globe = new MockGlobe(scene.mapProjection.ellipsoid);

    updateController();

    camera.setView({
      destination: Cartesian3.fromDegrees(-72.0, 40.0, -10.0),
    });

    // Trigger terrain adjustment with a small mouse movement
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);

    updateController();

    expect(camera.position.z).toEqualEpsilon(
      controller.minimumZoomDistance,
      CesiumMath.EPSILON7
    );
  });

  it("camera does go below the terrain in 3D when collision detection is disabled", function () {
    setUp3D();
    scene.globe = new MockGlobe(scene.mapProjection.ellipsoid);
    controller.enableCollisionDetection = false;

    updateController();

    camera.setView({
      destination: Cartesian3.fromDegrees(-72.0, 40.0, -10.0),
    });

    // Trigger terrain adjustment with a small mouse movement
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);

    updateController();

    expect(camera.positionCartographic.height).toBeLessThan(
      controller.minimumZoomDistance
    );
  });

  it("camera does go below the terrain in CV when collision detection is disabled", function () {
    setUpCV();
    scene.globe = new MockGlobe(scene.mapProjection.ellipsoid);
    controller.enableCollisionDetection = false;

    updateController();

    camera.setView({
      destination: Cartesian3.fromDegrees(-72.0, 40.0, -10.0),
    });

    // Trigger terrain adjustment with a small mouse movement
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);

    updateController();

    expect(camera.position.z).toBeLessThan(controller.minimumZoomDistance);
  });

  it("camera does not go below the terrain in 3D with the transform set", function () {
    setUp3D();
    scene.globe = new MockGlobe(scene.mapProjection.ellipsoid);

    updateController();

    camera.lookAt(
      Cartesian3.fromDegrees(-72.0, 40.0, 1.0),
      new Cartesian3(1.0, 1.0, -10.0)
    );

    // Trigger terrain adjustment with a small mouse movement
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);

    updateController();

    expect(camera.positionCartographic.height).toBeGreaterThanOrEqual(
      controller.minimumZoomDistance
    );
  });

  it("camera does not go below the terrain in CV with the transform set", function () {
    setUpCV();
    scene.globe = new MockGlobe(scene.mapProjection.ellipsoid);

    updateController();

    camera.lookAt(
      Cartesian3.fromDegrees(-72.0, 40.0, 1.0),
      new Cartesian3(1.0, 1.0, -10.0)
    );

    // Trigger terrain adjustment with a small mouse movement
    const startPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 4
    );
    const endPosition = new Cartesian2(
      canvas.clientWidth / 2,
      canvas.clientHeight / 2
    );
    moveMouse(MouseButtons.RIGHT, startPosition, endPosition);

    updateController();

    expect(camera.positionWC.x).toEqualEpsilon(
      controller.minimumZoomDistance,
      CesiumMath.EPSILON8
    );
  });

  it("is destroyed", function () {
    expect(controller.isDestroyed()).toEqual(false);
    controller.destroy();
    expect(controller.isDestroyed()).toEqual(true);
  });
});
