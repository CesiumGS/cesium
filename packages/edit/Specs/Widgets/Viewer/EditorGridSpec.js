import {
  Cartesian3,
  Color,
  Ellipsoid,
  FixedFrameTransforms,
  Matrix4,
} from "@cesium/core";
import { Pass, SceneTransforms } from "@cesium/engine";
import { EditorGrid } from "../../../index.js";
import createCanvas from "../../../../../Specs/createCanvas.js";
import createScene from "../../../../../Specs/createScene.js";

describe(
  "Widgets/Viewer/EditorGrid",
  function () {
    const origin = Cartesian3.fromDegrees(-123.0, 44.0, 100.0);
    const localFrame = FixedFrameTransforms.eastNorthUpToFixedFrame(origin);
    const background = [0, 0, 0, 255];

    let scene;

    beforeAll(function () {
      scene = createScene({ canvas: createCanvas(256, 256) });
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.backgroundColor = Color.BLACK;
      lookDownAt(new Cartesian3(0.0, 0.0, 10.0));
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    // Converts a position in the grid's local frame to the fixed frame.
    function toFixedFrame(position) {
      return Matrix4.multiplyByPoint(localFrame, position, new Cartesian3());
    }

    // Puts the camera at a position in the grid's local frame, looking down
    // with north up.
    function lookDownAt(position) {
      const camera = scene.camera;
      camera.position = toFixedFrame(position);
      camera.direction = Matrix4.multiplyByPointAsVector(
        localFrame,
        Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3()),
        new Cartesian3(),
      );
      camera.up = Matrix4.multiplyByPointAsVector(
        localFrame,
        Cartesian3.UNIT_Y,
        new Cartesian3(),
      );
    }

    function addGrid(options) {
      return scene.primitives.add(new EditorGrid({ origin, ...options }));
    }

    function renderCommands(grid) {
      scene.renderForSpecs();
      return scene.frameState.commandList.filter(
        (command) => command.owner === grid,
      );
    }

    // Renders a frame and reads the pixel under a position in the grid's
    // local frame.
    function renderPixel(position) {
      scene.renderForSpecs();
      const windowPosition = SceneTransforms.worldToWindowCoordinates(
        scene,
        toFixedFrame(position),
      );

      // Window coordinates start at the top, and pixels at the bottom.
      return scene.context.readPixels({
        x: Math.floor(windowPosition.x),
        y: scene.drawingBufferHeight - 1 - Math.floor(windowPosition.y),
        width: 1,
        height: 1,
      });
    }

    function expectPixel(position, color) {
      const pixel = renderPixel(position);

      // The WebGL stub doesn't draw, so like the renderer matchers, skip the check.
      if (!window.webglStub) {
        expect(pixel).toEqualEpsilon(color, 3);
      }
    }

    it("has defaults", function () {
      const grid = new EditorGrid({ origin });

      expect(grid.show).toBe(true);
      expect(grid.origin).toEqual(origin);
      expect(grid.spacing).toBe(1.0);
      expect(grid.subdivisions).toBe(10);
      expect(grid.lineColor).toBeInstanceOf(Color);
      expect(grid.xAxisColor).toBeInstanceOf(Color);
      expect(grid.yAxisColor).toBeInstanceOf(Color);
      expect(grid.ellipsoid).toBe(Ellipsoid.default);
    });

    it("copies its options", function () {
      const options = {
        show: false,
        origin: Cartesian3.clone(origin),
        spacing: 0.5,
        subdivisions: 4,
        lineColor: Color.clone(Color.WHITE),
        xAxisColor: Color.clone(Color.RED),
        yAxisColor: Color.clone(Color.GREEN),
        ellipsoid: Ellipsoid.UNIT_SPHERE,
      };
      const grid = new EditorGrid(options);

      expect(grid.show).toBe(false);
      expect(grid.origin).toEqual(options.origin);
      expect(grid.origin).not.toBe(options.origin);
      expect(grid.spacing).toBe(0.5);
      expect(grid.subdivisions).toBe(4);
      expect(grid.lineColor).toEqual(Color.WHITE);
      expect(grid.lineColor).not.toBe(options.lineColor);
      expect(grid.xAxisColor).toEqual(Color.RED);
      expect(grid.yAxisColor).toEqual(Color.GREEN);
      expect(grid.ellipsoid).toBe(Ellipsoid.UNIT_SPHERE);
    });

    it("returns a copy of its origin", function () {
      const grid = new EditorGrid({ origin });

      const returned = grid.origin;
      returned.x += 1.0;

      expect(grid.origin).toEqual(origin);
      expect(grid.origin).not.toBe(grid.origin);
    });

    it("adds a translucent command in its origin's east-north-up frame", function () {
      const grid = addGrid();

      const commands = renderCommands(grid);

      expect(commands.length).toBe(1);
      expect(commands[0].pass).toBe(Pass.TRANSLUCENT);
      expect(commands[0].modelMatrix).toEqualEpsilon(localFrame, 1.0e-9);
      expect(commands[0].renderState.depthTest.enabled).toBe(true);
      expect(commands[0].renderState.depthMask).toBe(false);
    });

    it("follows changes to its origin", function () {
      const grid = addGrid();
      renderCommands(grid);

      const newOrigin = Cartesian3.fromDegrees(-122.0, 45.0, 0.0);
      grid.origin = newOrigin;
      const commands = renderCommands(grid);

      expect(commands[0].modelMatrix).toEqualEpsilon(
        FixedFrameTransforms.eastNorthUpToFixedFrame(newOrigin),
        1.0e-9,
      );
    });

    it("requires an origin", function () {
      expect(() => new EditorGrid()).toThrowDeveloperError();
      expect(() => new EditorGrid({})).toThrowDeveloperError();

      const grid = new EditorGrid({ origin });
      expect(() => {
        grid.origin = undefined;
      }).toThrowDeveloperError();
    });

    it("adds no command when show is false", function () {
      const grid = addGrid({ show: false });

      expect(renderCommands(grid)).toEqual([]);
    });

    it("adds no command in the pick pass", function () {
      const grid = addGrid();
      scene.renderForSpecs();

      scene.pick(SceneTransforms.worldToWindowCoordinates(scene, origin));

      expect(
        scene.frameState.commandList.filter(
          (command) => command.owner === grid,
        ),
      ).toEqual([]);
    });

    it("covers an area below the camera that grows with its height", function () {
      const grid = addGrid();
      lookDownAt(new Cartesian3(30.0, 40.0, 100.0));

      const near = renderCommands(grid)[0].boundingVolume;
      const nearRadius = near.radius;

      expect(near.center).toEqualEpsilon(
        toFixedFrame(new Cartesian3(30.0, 40.0, 0.0)),
        1.0e-6,
      );

      lookDownAt(new Cartesian3(30.0, 40.0, 1000.0));
      const far = renderCommands(grid)[0].boundingVolume;

      expect(far.radius).toBeGreaterThan(nearRadius);
    });

    it("throws when rendered with invalid spacing or subdivisions", function () {
      const grid = addGrid({ spacing: 0.0 });
      expect(() => scene.renderForSpecs()).toThrowDeveloperError();

      grid.spacing = 1.0;
      grid.subdivisions = 1;
      expect(() => scene.renderForSpecs()).toThrowDeveloperError();
    });

    it("draws the axes, and lines between cells", function () {
      const xAxisColor = Color.RED;
      const yAxisColor = Color.BLUE;
      addGrid({ xAxisColor, yAxisColor, lineColor: Color.WHITE });

      // The y axis draws over the x axis where they cross.
      expectPixel(new Cartesian3(0.0, 0.0, 0.0), [0, 0, 255, 255]);
      expectPixel(new Cartesian3(2.5, 0.0, 0.0), [255, 0, 0, 255]);
      expectPixel(new Cartesian3(0.0, 2.5, 0.0), [0, 0, 255, 255]);
      expectPixel(new Cartesian3(2.5, 2.5, 0.0), background);

      // A line one pixel wide partly covers the pixel nearest it.
      const linePixel = renderPixel(new Cartesian3(2.0, 2.5, 0.0));
      if (!window.webglStub) {
        expect(linePixel[0]).toBeGreaterThan(32);
        expect(linePixel[0]).toBe(linePixel[1]);
        expect(linePixel[0]).toBe(linePixel[2]);
      }
    });

    it("can be destroyed", function () {
      const grid = addGrid();
      renderCommands(grid);

      scene.primitives.remove(grid);

      expect(grid.isDestroyed()).toBe(true);
    });
  },
  "WebGL",
);
