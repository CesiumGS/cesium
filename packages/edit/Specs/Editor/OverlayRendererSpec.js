import {
  AxisAlignedBoundingBox,
  Cartesian3,
  Color,
  Matrix3,
  Matrix4,
  OrientedBoundingBox,
  PrimitiveType,
  destroyObject,
} from "@cesium/core";
import { DepthFunction, SceneTransforms } from "@cesium/engine";
import { ComponentType } from "@cesium/mesh-editor";
import {
  MeshEditorModule,
  MeshEditorStyle,
  OverlayRenderer,
} from "../../index.js";
import createCanvas from "../../../../Specs/createCanvas.js";
import createScene from "../../../../Specs/createScene.js";

// The wasm module's buffer layouts, by overlay view.
const layouts = {
  positions: {
    scalarType: "float32",
    components: 4,
    uniformName: "u_positionTexture",
  },
  edges: { scalarType: "uint32", components: 2, uniformName: "u_edgeTexture" },
  triangles: {
    scalarType: "uint32",
    components: 4,
    uniformName: "u_triangleTexture",
  },
  selection: {
    scalarType: "unorm8",
    components: 1,
    uniformName: "u_selectionTexture",
  },
};

// A 2 x 2 square in the xy-plane, made of two triangle faces.
const square = {
  positions: [
    [-1.0, -1.0, 0.0],
    [1.0, -1.0, 0.0],
    [1.0, 1.0, 0.0],
    [-1.0, 1.0, 0.0],
  ],
  edges: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [0, 2],
  ],
  // Three vertex indices and a face index per triangle.
  triangles: [
    [0, 1, 2, 0],
    [0, 2, 3, 1],
  ],
  faceCount: 2,
};

// One triangle face.
const triangle = {
  positions: [
    [-1.0, -1.0, 0.0],
    [1.0, -1.0, 0.0],
    [1.0, 1.0, 0.0],
  ],
  edges: [
    [0, 1],
    [1, 2],
    [2, 0],
  ],
  triangles: [[0, 1, 2, 0]],
  faceCount: 1,
};

// Two squares side by side, sharing an edge.
const twoSquares = {
  positions: [
    [-2.0, -1.0, 0.0],
    [0.0, -1.0, 0.0],
    [2.0, -1.0, 0.0],
    [2.0, 1.0, 0.0],
    [0.0, 1.0, 0.0],
    [-2.0, 1.0, 0.0],
  ],
  edges: [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 0],
    [1, 4],
    [0, 4],
    [1, 3],
  ],
  triangles: [
    [0, 1, 4, 0],
    [0, 4, 5, 1],
    [1, 2, 3, 2],
    [1, 3, 4, 3],
  ],
  faceCount: 4,
};

// TODO: Have specs set their own colors once the renderer's are configurable.
// The renderer's default colors, as RGBA bytes. Faces facing the camera are
// shaded by 1.05.
const background = [255, 255, 255, 255];
const black = [0, 0, 0, 255];
const faceColor = [214, 214, 214, 255];
const selectedPointColor = [255, 122, 0, 255];
const selectedEdgeColor = [0, 199, 255, 255];
const selectedFaceColor = [230, 201, 150, 255];

// The square as one quad face, made of two triangles.
const quad = {
  ...square,
  edges: square.edges.slice(0, 4),
  triangles: [
    [0, 1, 2, 0],
    [0, 2, 3, 0],
  ],
  faceCount: 1,
};

// Vertices only.
const points = {
  positions: [
    [-1.0, -1.0, 0.0],
    [1.0, 1.0, 0.0],
  ],
  edges: [],
  triangles: [],
  faceCount: 0,
};

/**
 * @param {number} count The number of components.
 * @param {number[]} [selected] The indices of the selected components.
 * @returns {Uint8Array} 255 for selected components, 0 for the rest.
 */
function createSelection(count, selected = []) {
  const selection = new Uint8Array(count);
  for (const index of selected) {
    selection[index] = 255;
  }
  return selection;
}

/**
 * Writes an overlay into memory and describes it the way the wasm module's
 * overlay views do.
 *
 * @param {{ buffer: ArrayBuffer }} memory Gets a new buffer, as when wasm memory grows.
 * @param {object} overlay positions ([x, y, z] per vertex), edges ([a, b] per edge), triangles ([a, b, c, face] per triangle), faceCount, and optionally selected: { verts, edges, faces } index arrays.
 * @param {object} [options]
 * @param {boolean} [options.fullRefresh=true] Whether every buffer changed.
 * @param {object} [options.dirtyRanges] Changed element ranges when not a full refresh, shaped like the views: { positions, edges, triangles, selection: { verts, edges, faces } }.
 * @returns {object} The overlay views.
 */
function createOverlayViews(memory, overlay, options = {}) {
  const { fullRefresh = true, dirtyRanges = {} } = options;
  const selected = overlay.selected ?? {};
  const vertexCount = overlay.positions.length;
  const edgeCount = overlay.edges.length;

  const arrays = [
    new Float32Array(overlay.positions.flatMap((p) => [...p, 0.0])),
    new Uint32Array(overlay.edges.flat()),
    new Uint32Array(overlay.triangles.flat()),
    createSelection(vertexCount, selected.verts),
    createSelection(edgeCount, selected.edges),
    createSelection(overlay.faceCount, selected.faces),
  ];

  // Starts each buffer at a multiple of 4 bytes, so every typed array view is aligned.
  let byteLength = 0;
  const addresses = arrays.map((array) => {
    const address = byteLength;
    byteLength += Math.ceil(array.byteLength / 4) * 4;
    return address;
  });

  memory.buffer = new ArrayBuffer(byteLength);
  arrays.forEach((array, i) => {
    new Uint8Array(memory.buffer, addresses[i], array.byteLength).set(
      new Uint8Array(array.buffer),
    );
  });

  const createView = (i, layout, dirtyRange) => ({
    address: addresses[i],
    elementCount: arrays[i].length / layout.components,
    dirtyRange: fullRefresh ? undefined : dirtyRange,
    layout,
  });

  const selectionRanges = dirtyRanges.selection ?? {};
  return {
    fullRefresh,
    positions: createView(0, layouts.positions, dirtyRanges.positions),
    edges: createView(1, layouts.edges, dirtyRanges.edges),
    triangles: createView(2, layouts.triangles, dirtyRanges.triangles),
    selection: {
      verts: createView(3, layouts.selection, selectionRanges.verts),
      edges: createView(4, layouts.selection, selectionRanges.edges),
      faces: createView(5, layouts.selection, selectionRanges.faces),
    },
  };
}

/**
 * Drives an OverlayRenderer the way the mesh editor will, with overlay views
 * written by the specs instead of by wasm.
 */
class OverlayTestPrimitive {
  constructor(shaders, modelMatrix) {
    this._memory = { buffer: new ArrayBuffer(0) };
    this._overlayViews = undefined;
    this.mesh = {};
    this.style = new MeshEditorStyle();
    this.renderer = new OverlayRenderer({
      module: { memory: this._memory, shaders },
      mesh: this.mesh,
      style: this.style,
      modelMatrix,
    });
  }

  /**
   * Writes an overlay into this primitive's memory. The renderer uploads it
   * on the next render pass.
   *
   * @param {object} overlay See createOverlayViews.
   * @param {object} [options] See createOverlayViews.
   */
  setOverlay(overlay, options) {
    this._overlayViews = createOverlayViews(this._memory, overlay, options);
  }

  update(frameState) {
    let overlayViews;
    if (frameState.passes.render) {
      overlayViews = this._overlayViews;
      this._overlayViews = undefined;
    }

    this.renderer.update(frameState, overlayViews);
    this.renderer.pushOutlineCommands(frameState);
  }

  isDestroyed() {
    return false;
  }

  destroy() {
    this.renderer.destroy();
    return destroyObject(this);
  }
}

describe(
  "Editor/OverlayRenderer",
  function () {
    let scene;
    let shaders;

    beforeAll(async function () {
      // We need a decently big canvas (compared to most specs) to properly test overlay rendering.
      scene = createScene({ canvas: createCanvas(256, 256) });
      ({ shaders } = await MeshEditorModule.load());
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      // Looks straight down at the square, which spans about half the canvas.
      const camera = scene.camera;
      camera.position = new Cartesian3(0.0, 0.0, 4.0);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);

      // Points and edges are black.
      scene.backgroundColor = Color.WHITE;
    });

    afterEach(function () {
      // Destroys each OverlayTestPrimitive, and so its renderer.
      scene.primitives.removeAll();
    });

    function addSquare() {
      const overlay = new OverlayTestPrimitive(shaders);
      overlay.setOverlay(square);
      return scene.primitives.add(overlay);
    }

    // Renders a frame and returns the commands the overlay added to it.
    function renderCommands(overlay) {
      scene.renderForSpecs();
      return scene.frameState.commandList.filter(
        (command) => command.owner === overlay.renderer,
      );
    }

    function getInstanceCounts(commands) {
      return commands.map((command) => command.instanceCount);
    }

    // Converts a position in the overlay's local space to window coordinates.
    function getWindowPosition(overlay, position) {
      const positionWC = Matrix4.multiplyByPoint(
        overlay.renderer.modelMatrix,
        Cartesian3.fromArray(position),
        new Cartesian3(),
      );
      return SceneTransforms.worldToWindowCoordinates(scene, positionWC);
    }

    // Renders a frame and reads the pixel under a position in the overlay's
    // local space, or offset right of it by a number of pixels.
    function renderPixel(overlay, position, offsetX = 0) {
      scene.renderForSpecs();
      const windowPosition = getWindowPosition(overlay, position);

      // Window coordinates start at the top, and pixels at the bottom.
      return scene.context.readPixels({
        x: Math.floor(windowPosition.x + offsetX),
        y: scene.drawingBufferHeight - 1 - Math.floor(windowPosition.y),
        width: 1,
        height: 1,
      });
    }

    // Renders a frame, which uploads the overlay, then picks at a position in
    // the overlay's local space.
    function expectPick(overlay, position, expected) {
      scene.renderForSpecs();
      expect(scene).toPickAndCall(
        (result) => expect(result).toEqual(expected),
        getWindowPosition(overlay, position),
      );
    }

    function expectPixel(overlay, position, color, offsetX = 0) {
      const pixel = renderPixel(overlay, position, offsetX);

      // The WebGL stub doesn't draw, so like the renderer matchers, skip the check.
      if (!window.webglStub) {
        expect(pixel).toEqualEpsilon(color, 3);
      }
    }

    describe("update", function () {
      it("adds no commands before the first upload", function () {
        const overlay = scene.primitives.add(new OverlayTestPrimitive(shaders));

        expect(renderCommands(overlay)).toEqual([]);
      });

      it("adds one command each for points, edges and faces", function () {
        const overlay = addSquare();

        expect(renderCommands(overlay).length).toBe(3);
      });

      it("skips component kinds that aren't shown", function () {
        const overlay = addSquare();
        overlay.renderer.setShownComponents(
          (1 << ComponentType.Vertex) | (1 << ComponentType.Face),
        );

        const commands = renderCommands(overlay);

        // Faces and points.
        expect(getInstanceCounts(commands)).toEqual([2, 4]);

        overlay.renderer.setShownComponents(0);

        expect(renderCommands(overlay)).toEqual([]);
      });

      it("adds no commands when show is false", function () {
        const overlay = addSquare();
        overlay.renderer.show = false;

        expect(renderCommands(overlay)).toEqual([]);
      });

      it("uploads overlay views when show is false", function () {
        const overlay = addSquare();
        overlay.renderer.show = false;
        renderCommands(overlay);

        overlay.renderer.show = true;

        expect(getInstanceCounts(renderCommands(overlay))).toEqual([2, 5, 4]);
      });

      it("draws points and edges as instanced triangle strips", function () {
        const [, edgeCommand, pointCommand] = renderCommands(addSquare());

        expect(pointCommand.primitiveType).toBe(PrimitiveType.TRIANGLE_STRIP);
        expect(pointCommand.count).toBe(4);
        expect(edgeCommand.primitiveType).toBe(PrimitiveType.TRIANGLE_STRIP);
        expect(edgeCommand.count).toBe(4);
      });

      it("draws faces as instanced triangles", function () {
        const [faceCommand] = renderCommands(addSquare());

        expect(faceCommand.primitiveType).toBe(PrimitiveType.TRIANGLES);
        expect(faceCommand.count).toBe(3);
      });

      it("writes depth for faces but not for points and edges", function () {
        const [faceCommand, edgeCommand, pointCommand] =
          renderCommands(addSquare());

        expect(faceCommand.renderState.depthMask).toBe(true);
        expect(edgeCommand.renderState.depthMask).toBe(false);
        expect(pointCommand.renderState.depthMask).toBe(false);
      });

      it("draws and picks the last of coincident points and edges", function () {
        const [, edgeCommand, pointCommand] = renderCommands(addSquare());

        expect(edgeCommand.renderState.depthTest.func).toBe(
          DepthFunction.LESS_OR_EQUAL,
        );
        expect(pointCommand.renderState.depthTest.func).toBe(
          DepthFunction.LESS_OR_EQUAL,
        );
      });

      it("draws one instance per vertex, edge and triangle", function () {
        const commands = renderCommands(addSquare());

        expect(getInstanceCounts(commands)).toEqual([2, 5, 4]);
      });

      it("uses the model matrix from the constructor", function () {
        const modelMatrix = Matrix4.fromTranslation(
          new Cartesian3(1.0, 2.0, 3.0),
        );
        const overlay = new OverlayTestPrimitive(shaders, modelMatrix);
        overlay.setOverlay(square);
        scene.primitives.add(overlay);

        expect(overlay.renderer.modelMatrix).toEqual(modelMatrix);
        expect(overlay.renderer.modelMatrix).not.toBe(modelMatrix);
        for (const command of renderCommands(overlay)) {
          expect(command.modelMatrix).toEqual(modelMatrix);
        }
      });

      it("uses the model matrix", function () {
        const overlay = addSquare();
        const getModelMatrices = () =>
          renderCommands(overlay).map((command) => command.modelMatrix);

        const translation = Matrix4.fromTranslation(
          new Cartesian3(1.0, 2.0, 3.0),
        );
        overlay.renderer.setModelMatrix(translation);
        expect(getModelMatrices()).toEqual([
          translation,
          translation,
          translation,
        ]);

        const otherTranslation = Matrix4.fromTranslation(
          new Cartesian3(-1.0, 0.0, 0.0),
        );
        overlay.renderer.setModelMatrix(otherTranslation);
        expect(getModelMatrices()).toEqual([
          otherTranslation,
          otherTranslation,
          otherTranslation,
        ]);
      });

      it("updates instance counts when the overlay grows or shrinks", function () {
        const overlay = addSquare();
        renderCommands(overlay);

        overlay.setOverlay(twoSquares);
        expect(getInstanceCounts(renderCommands(overlay))).toEqual([4, 9, 6]);

        overlay.setOverlay(triangle);
        expect(getInstanceCounts(renderCommands(overlay))).toEqual([1, 3, 3]);
      });

      it("skips component kinds with no components", function () {
        const overlay = addSquare();
        renderCommands(overlay);

        overlay.setOverlay(points);
        const commands = renderCommands(overlay);

        expect(getInstanceCounts(commands)).toEqual([2]);
        expect(commands[0].primitiveType).toBe(PrimitiveType.TRIANGLE_STRIP);
      });

      it("renders points, edges and faces", function () {
        const overlay = addSquare();

        // A vertex, the middle of the bottom edge, and inside the bottom-right face.
        expectPixel(overlay, [1.0, -1.0, 0.0], black);
        expectPixel(overlay, [0.0, -1.0, 0.0], black);
        expectPixel(overlay, [0.5, -0.5, 0.0], faceColor);
        expectPixel(overlay, [1.5, 0.0, 0.0], background);
      });

      // Viewed head-on, only the depth bias puts points and edges in front of
      // what's drawn before them, so this doesn't exercise oblique angles.
      it("draws points over edges and edges over faces where they overlap", function () {
        const overlay = new OverlayTestPrimitive(shaders);
        overlay.setOverlay({
          ...square,
          selected: { verts: [0, 1, 2, 3], edges: [0, 1, 2, 3, 4], faces: [] },
        });
        scene.primitives.add(overlay);

        // Two edges meet at the vertex, and the edge borders a face.
        expectPixel(overlay, [1.0, -1.0, 0.0], selectedPointColor);
        expectPixel(overlay, [0.0, -1.0, 0.0], selectedEdgeColor);
      });

      it("draws changed positions after a partial update", function () {
        const overlay = addSquare();
        expectPixel(overlay, [1.0, 1.0, 0.0], black);

        const positions = square.positions.slice();
        positions[2] = [0.5, 0.5, 0.0];
        overlay.setOverlay(
          { ...square, positions },
          {
            fullRefresh: false,
            dirtyRanges: { positions: { start: 2, end: 3 } },
          },
        );

        expectPixel(overlay, [1.0, 1.0, 0.0], background);
        expectPixel(overlay, [0.5, 0.5, 0.0], black);
      });

      it("draws the new topology after a full refresh", function () {
        const overlay = addSquare();
        expectPixel(overlay, [-0.5, 0.5, 0.0], faceColor);

        // Drops the top-left vertex, and the face beside it.
        overlay.setOverlay(triangle);

        expectPixel(overlay, [-0.5, 0.5, 0.0], background);
        expectPixel(overlay, [-1.0, 1.0, 0.0], background);
        expectPixel(overlay, [0.5, -0.5, 0.0], faceColor);
      });

      it("draws selected components in the selected color", function () {
        const overlay = addSquare();
        expectPixel(overlay, [0.5, -0.5, 0.0], faceColor);

        // Selects a vertex, the bottom edge, and the bottom-right face, as a
        // partial update.
        overlay.setOverlay(
          { ...square, selected: { verts: [0], edges: [0], faces: [0] } },
          {
            fullRefresh: false,
            dirtyRanges: {
              selection: {
                verts: { start: 0, end: 1 },
                edges: { start: 0, end: 1 },
                faces: { start: 0, end: 1 },
              },
            },
          },
        );

        expectPixel(overlay, [-1.0, -1.0, 0.0], selectedPointColor);
        expectPixel(overlay, [1.0, 1.0, 0.0], black);
        expectPixel(overlay, [0.0, -1.0, 0.0], selectedEdgeColor);
        expectPixel(overlay, [0.0, 1.0, 0.0], black);
        expectPixel(overlay, [0.5, -0.5, 0.0], selectedFaceColor);
        expectPixel(overlay, [-0.5, 0.5, 0.0], faceColor);
      });

      it("draws with its style's changes on the next frame", function () {
        const overlay = addSquare();
        expectPixel(overlay, [0.0, -1.0, 0.0], black);

        overlay.style.edgeColor = Color.RED;
        overlay.style.faceColor = Color.BLUE;

        expectPixel(overlay, [0.0, -1.0, 0.0], [255, 0, 0, 255]);
        expectPixel(overlay, [0.5, -0.5, 0.0], [0, 0, 255, 255]);
      });
    });

    describe("outline", function () {
      const outlineColor = [255, 0, 0, 255];

      function addOutlinedSquare() {
        const overlay = addSquare();
        overlay.renderer.outlined = true;
        overlay.style.outlineColor = Color.RED;
        // Wide enough that the antialiased borders don't reach the sampled pixel.
        overlay.style.outlineWidth = 4.0;
        return overlay;
      }

      function getStencilTests(commands) {
        return commands.map(
          (command) => command.renderState.stencilTest.enabled,
        );
      }

      it("adds no outline commands unless outlined is set", function () {
        const overlay = addSquare();

        expect(getStencilTests(renderCommands(overlay))).toEqual([
          false,
          false,
          false,
        ]);

        overlay.renderer.outlined = true;
        const commands = renderCommands(overlay);

        // The stencil face command replaces the face command, and the outline
        // edges and points come last.
        expect(getStencilTests(commands)).toEqual([
          true,
          false,
          false,
          true,
          true,
        ]);
        expect(getInstanceCounts(commands)).toEqual([2, 5, 4, 5, 4]);
      });

      it("adds no outline commands in the pick pass", function () {
        const overlay = addOutlinedSquare();
        const commands = renderCommands(overlay).slice(0, 3);

        scene.pick(getWindowPosition(overlay, [0.5, -0.5, 0.0]));
        const pickCommands = scene.frameState.commandList.filter(
          (command) => command.owner === overlay.renderer,
        );

        expect(pickCommands).toEqual(commands);
      });

      it("adds no outline commands when show is false", function () {
        const overlay = addOutlinedSquare();
        overlay.renderer.show = false;

        expect(renderCommands(overlay)).toEqual([]);
      });

      it("adds no outline commands when faces aren't shown", function () {
        const overlay = addOutlinedSquare();
        overlay.renderer.setShownComponents(
          (1 << ComponentType.Vertex) | (1 << ComponentType.Edge),
        );

        expect(getStencilTests(renderCommands(overlay))).toEqual([
          false,
          false,
        ]);
      });

      it("draws the outline color just outside the silhouette and the face color inside", function () {
        const overlay = addOutlinedSquare();
        const rightEdge = [1.0, 0.0, 0.0];

        expectPixel(overlay, rightEdge, outlineColor, 2);
        expectPixel(overlay, rightEdge, background, 8);
        expectPixel(overlay, [0.5, -0.5, 0.0], faceColor);
      });

      it("hides the outline behind an occluder", function () {
        // A larger square, nearer the camera, drawn first.
        const occluder = new OverlayTestPrimitive(shaders);
        occluder.setOverlay(square);
        occluder.renderer.setShownComponents(1 << ComponentType.Face);
        occluder.renderer.setModelMatrix(
          Matrix4.multiply(
            Matrix4.fromTranslation(new Cartesian3(0.0, 0.0, 1.0)),
            Matrix4.fromUniformScale(2.0),
            new Matrix4(),
          ),
        );
        scene.primitives.add(occluder);

        const overlay = addOutlinedSquare();

        expectPixel(overlay, [1.0, 0.0, 0.0], faceColor, 2);
      });
    });

    describe("bounding volume", function () {
      const squareBounds = new AxisAlignedBoundingBox(
        new Cartesian3(-1.0, -1.0, 0.0),
        new Cartesian3(1.0, 1.0, 0.0),
      );

      function getBoundingVolumes(commands) {
        return commands.map((command) => command.boundingVolume);
      }

      it("is undefined without local bounds", function () {
        const overlay = addSquare();

        expect(overlay.renderer.boundingVolume).toBeUndefined();
        expect(getBoundingVolumes(renderCommands(overlay))).toEqual([
          undefined,
          undefined,
          undefined,
        ]);
      });

      it("fits the local bounds transformed by the model matrix", function () {
        const overlay = addSquare();
        overlay.renderer.setLocalBounds(squareBounds);
        overlay.renderer.setModelMatrix(
          Matrix4.multiply(
            Matrix4.fromTranslation(new Cartesian3(1.0, 2.0, 3.0)),
            Matrix4.fromUniformScale(2.0),
            new Matrix4(),
          ),
        );

        expect(overlay.renderer.boundingVolume).toEqual(
          new OrientedBoundingBox(
            new Cartesian3(1.0, 2.0, 3.0),
            Matrix3.fromScale(new Cartesian3(2.0, 2.0, 0.0)),
          ),
        );
      });

      it("is shared by commands created after the bounds are set", function () {
        const overlay = addSquare();
        overlay.renderer.outlined = true;
        overlay.renderer.setLocalBounds(squareBounds);

        const { boundingVolume } = overlay.renderer;
        const commands = renderCommands(overlay);
        expect(commands.length).toBe(5);
        for (const command of commands) {
          expect(command.boundingVolume).toBe(boundingVolume);
        }
      });

      it("is set on existing commands when the bounds are set or cleared", function () {
        const overlay = addSquare();
        overlay.renderer.outlined = true;
        renderCommands(overlay);

        overlay.renderer.setLocalBounds(squareBounds);
        for (const command of renderCommands(overlay)) {
          expect(command.boundingVolume).toBe(overlay.renderer.boundingVolume);
        }

        overlay.renderer.setLocalBounds(undefined);
        expect(overlay.renderer.boundingVolume).toBeUndefined();
        expect(getBoundingVolumes(renderCommands(overlay))).toEqual([
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ]);
      });

      it("is updated in place when the model matrix changes", function () {
        const overlay = addSquare();
        overlay.renderer.setLocalBounds(squareBounds);
        const { boundingVolume } = overlay.renderer;

        overlay.renderer.setModelMatrix(
          Matrix4.fromTranslation(new Cartesian3(5.0, 0.0, 0.0)),
        );

        expect(overlay.renderer.boundingVolume).toBe(boundingVolume);
        expect(boundingVolume.center).toEqual(new Cartesian3(5.0, 0.0, 0.0));
      });

      it("copies the local bounds", function () {
        const overlay = addSquare();
        const bounds = AxisAlignedBoundingBox.clone(squareBounds);
        overlay.renderer.setLocalBounds(bounds);

        bounds.center.x = 10.0;
        overlay.renderer.setModelMatrix(Matrix4.IDENTITY);

        expect(overlay.renderer.boundingVolume.center).toEqual(Cartesian3.ZERO);
      });

      it("draws with local bounds", function () {
        const overlay = addSquare();
        overlay.renderer.setLocalBounds(squareBounds);

        expectPixel(overlay, [0.5, -0.5, 0.0], faceColor);
      });

      // The square is flat, so the near plane is fit to its depth, and the
      // depth bias pulls its points and edges in front of it.
      function expectOutlineOfFlatSquare() {
        const overlay = addSquare();
        overlay.renderer.setLocalBounds(squareBounds);
        overlay.renderer.outlined = true;
        overlay.style.outlineColor = Color.RED;
        overlay.style.outlineWidth = 4.0;

        expectPixel(overlay, [1.0, 0.0, 0.0], [255, 0, 0, 255], 2);
      }

      it("draws points and edges biased in front of the near plane", function () {
        expectOutlineOfFlatSquare();
      });

      it("draws points and edges biased in front of the near plane without a logarithmic depth buffer", function () {
        const { logarithmicDepthBuffer } = scene;
        scene.logarithmicDepthBuffer = false;
        try {
          expectOutlineOfFlatSquare();
        } finally {
          scene.logarithmicDepthBuffer = logarithmicDepthBuffer;
        }
      });
    });

    describe("picking", function () {
      it("picks a vertex", function () {
        const overlay = addSquare();

        expectPick(overlay, [1.0, 1.0, 0.0], {
          primitive: overlay.mesh,
          componentType: ComponentType.Vertex,
          index: 2,
        });
      });

      it("picks an edge", function () {
        const overlay = addSquare();

        // The middle of the bottom edge.
        expectPick(overlay, [0.0, -1.0, 0.0], {
          primitive: overlay.mesh,
          componentType: ComponentType.Edge,
          index: 0,
        });
      });

      it("picks a face", function () {
        const overlay = addSquare();

        expectPick(overlay, [0.5, -0.5, 0.0], {
          primitive: overlay.mesh,
          componentType: ComponentType.Face,
          index: 0,
        });
        expectPick(overlay, [-0.5, 0.5, 0.0], {
          primitive: overlay.mesh,
          componentType: ComponentType.Face,
          index: 1,
        });
      });

      it("picks a face by its face index, not its triangle index", function () {
        const overlay = new OverlayTestPrimitive(shaders);
        overlay.setOverlay(quad);
        scene.primitives.add(overlay);

        const faceZero = {
          primitive: overlay.mesh,
          componentType: ComponentType.Face,
          index: 0,
        };

        // Inside each of the quad's two triangles.
        expectPick(overlay, [0.5, -0.5, 0.0], faceZero);
        expectPick(overlay, [-0.5, 0.5, 0.0], faceZero);
      });

      it("picks transparent faces");

      it("picks only pickable component types", function () {
        const overlay = addSquare();
        // Inside face 0, within the bottom edge's enlarged pick width.
        const nearEdge = [0.0, -0.95, 0.0];

        expectPick(overlay, nearEdge, {
          primitive: overlay.mesh,
          componentType: ComponentType.Edge,
          index: 0,
        });

        overlay.renderer.setPickableComponents(1 << ComponentType.Face);

        expectPick(overlay, nearEdge, {
          primitive: overlay.mesh,
          componentType: ComponentType.Face,
          index: 0,
        });
      });

      it("draws unpickable component types outside the pick pass", function () {
        const overlay = addSquare();
        overlay.renderer.setPickableComponents(1 << ComponentType.Face);

        expect(getInstanceCounts(renderCommands(overlay))).toEqual([2, 5, 4]);
      });

      it("returns pick objects with its mesh as primitive", function () {
        const overlay = addSquare();
        scene.renderForSpecs();

        expect(scene).toPickAndCall(
          (result) => expect(result.primitive).toBe(overlay.mesh),
          getWindowPosition(overlay, [0.5, -0.5, 0.0]),
        );
      });
    });

    describe("destroy", function () {
      it("isDestroyed is false before destroy", function () {
        const { renderer } = addSquare();
        scene.renderForSpecs();

        expect(renderer.isDestroyed()).toBe(false);
      });

      it("isDestroyed is true after destroy", function () {
        const overlay = addSquare();
        scene.renderForSpecs();

        // Removing the primitive destroys it, and so its renderer.
        scene.primitives.remove(overlay);

        expect(overlay.renderer.isDestroyed()).toBe(true);
      });
    });
  },
  "WebGL",
);
