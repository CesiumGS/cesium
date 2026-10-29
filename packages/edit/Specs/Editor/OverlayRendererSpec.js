import {
  Cartesian3,
  Matrix4,
  PrimitiveType,
  destroyObject,
} from "@cesium/core";
import { MeshEditorModule, OverlayRenderer } from "../../index.js";
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
  constructor(shaders) {
    this._memory = { buffer: new ArrayBuffer(0) };
    this._overlayViews = undefined;
    this.mesh = {};
    this.renderer = new OverlayRenderer({
      module: { memory: this._memory, shaders },
      mesh: this.mesh,
    });
    this.modelMatrix = Matrix4.clone(Matrix4.IDENTITY);
    this.showPoints = true;
    this.showEdges = true;
    this.showFaces = true;
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

    this.renderer.update(frameState, {
      overlayViews,
      modelMatrix: this.modelMatrix,
      showPoints: this.showPoints,
      showEdges: this.showEdges,
      showFaces: this.showFaces,
    });
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
        overlay.showEdges = false;

        const commands = renderCommands(overlay);

        // Points and faces.
        expect(getInstanceCounts(commands)).toEqual([4, 2]);

        overlay.showPoints = false;
        overlay.showFaces = false;

        expect(renderCommands(overlay)).toEqual([]);
      });

      it("draws points and edges as instanced triangle strips", function () {
        const [pointCommand, edgeCommand] = renderCommands(addSquare());

        expect(pointCommand.primitiveType).toBe(PrimitiveType.TRIANGLE_STRIP);
        expect(pointCommand.count).toBe(4);
        expect(edgeCommand.primitiveType).toBe(PrimitiveType.TRIANGLE_STRIP);
        expect(edgeCommand.count).toBe(4);
      });

      it("draws faces as instanced triangles", function () {
        const [, , faceCommand] = renderCommands(addSquare());

        expect(faceCommand.primitiveType).toBe(PrimitiveType.TRIANGLES);
        expect(faceCommand.count).toBe(3);
      });

      it("draws one instance per vertex, edge and triangle", function () {
        const commands = renderCommands(addSquare());

        expect(getInstanceCounts(commands)).toEqual([4, 5, 2]);
      });

      it("uses the model matrix", function () {
        const overlay = addSquare();
        const getModelMatrices = () =>
          renderCommands(overlay).map((command) => command.modelMatrix);

        overlay.modelMatrix = Matrix4.fromTranslation(
          new Cartesian3(1.0, 2.0, 3.0),
        );
        expect(getModelMatrices()).toEqual([
          overlay.modelMatrix,
          overlay.modelMatrix,
          overlay.modelMatrix,
        ]);

        overlay.modelMatrix = Matrix4.fromTranslation(
          new Cartesian3(-1.0, 0.0, 0.0),
        );
        expect(getModelMatrices()).toEqual([
          overlay.modelMatrix,
          overlay.modelMatrix,
          overlay.modelMatrix,
        ]);
      });

      it("updates instance counts when the overlay grows or shrinks", function () {
        const overlay = addSquare();
        renderCommands(overlay);

        overlay.setOverlay(twoSquares);
        expect(getInstanceCounts(renderCommands(overlay))).toEqual([6, 9, 4]);

        overlay.setOverlay(triangle);
        expect(getInstanceCounts(renderCommands(overlay))).toEqual([3, 3, 1]);
      });

      it("skips component kinds with no components", function () {
        const overlay = addSquare();
        renderCommands(overlay);

        overlay.setOverlay(points);
        const commands = renderCommands(overlay);

        expect(getInstanceCounts(commands)).toEqual([2]);
        expect(commands[0].primitiveType).toBe(PrimitiveType.TRIANGLE_STRIP);
      });

      it("renders points, edges and faces");

      it("draws points over edges and edges over faces");

      it("draws changed positions after a partial update");

      it("draws the new topology after a full refresh");

      it("draws selected components in the selected color");
    });

    describe("picking", function () {
      it("picks a vertex");

      it("picks an edge");

      it("picks a face");

      it("picks a face by its face index, not its triangle index");

      it("picks transparent faces");

      it("returns pick objects with its mesh as primitive");
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
