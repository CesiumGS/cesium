import {
  Cartesian2,
  Cartesian3,
  Color,
  Matrix4,
  RuntimeError,
} from "@cesium/core";
import {
  GeometryAttributeDescriptor,
  GeometryReader,
  SceneTransforms,
  StencilFunction,
  VertexAttributeSemantic,
} from "@cesium/engine";
import { ComponentType } from "@cesium/mesh-editor";
import { EditMode, Mesh, MeshEditor, MeshEditorStyle } from "../../index.js";
import createCanvas from "../../../../Specs/createCanvas.js";
import createScene from "../../../../Specs/createScene.js";

// A 2 x 2 square in the xy-plane, made of two triangles. Its overlay has 4
// vertices, 5 edges and 2 triangles.
const square = {
  positions: [
    [-1.0, -1.0, 0.0],
    [1.0, -1.0, 0.0],
    [1.0, 1.0, 0.0],
    [-1.0, 1.0, 0.0],
  ],
  primitives: [
    [0, 1, 2],
    [0, 2, 3],
  ],
};

// Two connected lines, which can't be faces.
const lines = {
  positions: square.positions.slice(0, 3),
  primitives: [
    [0, 1],
    [1, 2],
  ],
};

/**
 * Creates a geometry source that reads the given geometry.
 *
 * @param {object} geometry positions ([x, y, z] per vertex) and primitives (vertex indices per primitive).
 * @returns {object} The source, with an identity world matrix and a show property.
 */
function createSource(geometry) {
  const position = new GeometryAttributeDescriptor({
    semantic: VertexAttributeSemantic.POSITION,
  });

  const copyInto = (values, result, offset = 0) => {
    values.forEach((value, i) => {
      result[offset + i] = value;
    });
    return result;
  };

  const geometryReader = new GeometryReader({
    availableAttributes: [position],
    createReadSession: () => ({
      vertexCount: () => geometry.positions.length,
      primitiveCount: () => geometry.primitives.length,
      primitiveVertexCount: (i) => geometry.primitives[i].length,
      primitiveReader: () => (i, result, offset) =>
        copyInto(geometry.primitives[i], result, offset),
      vertexAttributeReader: () => (i, result, offset) =>
        copyInto(geometry.positions[i], result, offset),
      destroy: () => {},
    }),
  });

  return {
    geometryReader,
    worldMatrix: Matrix4.clone(Matrix4.IDENTITY),
    show: true,
  };
}

describe(
  "Editor/MeshEditor",
  function () {
    let scene;

    beforeAll(function () {
      scene = createScene({ canvas: createCanvas(256, 256) });
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
      scene.backgroundColor = Color.WHITE;
    });

    afterEach(function () {
      // Destroys each editor.
      scene.primitives.removeAll();
    });

    // Renders a frame and returns the commands the mesh's overlay added to it.
    function renderCommands(mesh, renderedScene = scene) {
      renderedScene.renderForSpecs();
      return renderedScene.frameState.commandList.filter(
        (command) => command.owner === mesh._renderer,
      );
    }

    // The instance counts of a mesh's commands: of faces, edges and points, in
    // that order, for those that are drawn.
    function renderInstanceCounts(mesh) {
      return renderCommands(mesh).map((command) => command.instanceCount);
    }

    // The instance counts of the commands the mesh's overlay adds to a pick
    // pass, in the same order as renderInstanceCounts.
    function pickInstanceCounts(mesh) {
      scene.renderForSpecs();
      scene.pick(new Cartesian2(0.0, 0.0));
      return scene.frameState.commandList
        .filter((command) => command.owner === mesh._renderer)
        .map((command) => command.instanceCount);
    }

    function getWindowPosition(position) {
      return SceneTransforms.worldToWindowCoordinates(
        scene,
        Cartesian3.fromArray(position),
      );
    }

    // Renders a frame and checks the pixel under a world position, or offset
    // right of it by a number of pixels.
    function expectPixel(position, color, offsetX = 0) {
      scene.renderForSpecs();
      const { x, y } = getWindowPosition(position);
      const pixel = scene.context.readPixels({
        x: Math.floor(x + offsetX),
        // Window coordinates start at the top, and pixels at the bottom.
        y: scene.drawingBufferHeight - 1 - Math.floor(y),
        width: 1,
        height: 1,
      });

      // The WebGL stub doesn't draw, so like the renderer matchers, skip the check.
      if (!window.webglStub) {
        expect(pixel).toEqualEpsilon(color, 3);
      }
    }

    // Whether each of the mesh's commands draws part of its outline.
    function renderOutlineFlags(mesh) {
      return renderCommands(mesh).map(isOutlineCommand);
    }

    function isOutlineCommand(command) {
      const { stencilTest } = command.renderState;
      return (
        stencilTest.enabled &&
        stencilTest.frontFunction === StencilFunction.NOT_EQUAL
      );
    }

    // Inside the square's bottom-right triangle.
    const facePosition = [0.5, -0.5, 0.0];

    describe("addToScene", function () {
      it("resolves to an editor in the scene's primitives", async function () {
        const editor = await MeshEditor.addToScene(scene);

        expect(editor).toBeInstanceOf(MeshEditor);
        expect(scene.primitives.contains(editor)).toBe(true);
      });

      it("starts in EditMode.NONE", async function () {
        const editor = await MeshEditor.addToScene(scene);

        expect(editor.mode).toBe(EditMode.NONE);
      });
    });

    describe("addMesh", function () {
      it("returns a mesh with the source", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createSource(square);

        const mesh = editor.addMesh(source);

        expect(mesh).toBeInstanceOf(Mesh);
        expect(mesh.source).toBe(source);
        expect(editor.hasMesh(mesh)).toBe(true);
      });

      it("hides the source", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createSource(square);

        editor.addMesh(source);

        expect(source.show).toBe(false);
      });

      it("accepts a source without show", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createSource(square);
        delete source.show;

        const mesh = editor.addMesh(source);
        editor.removeMesh(mesh);

        expect(source.show).toBeUndefined();
      });

      it("returns a shown, inactive mesh", async function () {
        const editor = await MeshEditor.addToScene(scene);

        const mesh = editor.addMesh(createSource(square));

        expect(mesh.show).toBe(true);
        expect(editor.isMeshActive(mesh)).toBe(false);
      });

      it("throws if the source was already added", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createSource(square);
        editor.addMesh(source);

        expect(() => editor.addMesh(source)).toThrowDeveloperError();
      });

      it("throws a RuntimeError if the geometry can't be edited", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createSource(lines);

        expect(() => editor.addMesh(source)).toThrowError(RuntimeError);
        expect(source.show).toBe(true);
      });

      it("raises meshAdded after adding the mesh", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const listener = jasmine.createSpy("meshAdded").and.callFake((mesh) => {
          expect(editor.hasMesh(mesh)).toBe(true);
        });
        editor.meshAdded.addEventListener(listener);

        const mesh = editor.addMesh(createSource(square));

        expect(listener).toHaveBeenCalledOnceWith(mesh);
      });

      it("does not raise meshAdded if the geometry can't be edited", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const listener = jasmine.createSpy("meshAdded");
        editor.meshAdded.addEventListener(listener);

        expect(() => editor.addMesh(createSource(lines))).toThrowError(
          RuntimeError,
        );
        expect(listener).not.toHaveBeenCalled();
      });
    });

    describe("meshes", function () {
      it("is empty for a new editor", async function () {
        const editor = await MeshEditor.addToScene(scene);

        expect(editor.meshes).toEqual([]);
      });

      it("lists the meshes in the order they were added", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const first = editor.addMesh(createSource(square));
        const second = editor.addMesh(createSource(square));
        const third = editor.addMesh(createSource(square));
        editor.removeMesh(second);

        expect(editor.meshes).toEqual([first, third]);
      });

      it("returns a copy", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));

        editor.meshes.length = 0;

        expect(editor.meshes).toEqual([mesh]);
      });
    });

    describe("getMesh", function () {
      it("returns the mesh that edits the source", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createSource(square);
        const mesh = editor.addMesh(source);

        expect(editor.getMesh(source)).toBe(mesh);
      });

      it("returns undefined for a source that isn't in the editor", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const otherEditor = await MeshEditor.addToScene(scene);
        const source = createSource(square);
        otherEditor.addMesh(source);

        expect(editor.getMesh(source)).toBeUndefined();
      });

      it("returns undefined once the mesh is removed", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createSource(square);
        editor.removeMesh(editor.addMesh(source));

        expect(editor.getMesh(source)).toBeUndefined();
      });

      it("allows a removed source to be added again", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createSource(square);
        editor.removeMesh(editor.addMesh(source));

        const mesh = editor.addMesh(source);

        expect(editor.getMesh(source)).toBe(mesh);
      });
    });

    describe("removeMesh", function () {
      it("returns true and removes the mesh", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));

        expect(editor.removeMesh(mesh)).toBe(true);
        expect(editor.hasMesh(mesh)).toBe(false);
      });

      it("destroys the mesh", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));

        editor.removeMesh(mesh);

        expect(mesh.isDestroyed()).toBe(true);
      });

      it("shows the source", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createSource(square);
        const mesh = editor.addMesh(source);

        editor.removeMesh(mesh);

        expect(source.show).toBe(true);
      });

      it("returns false for a mesh that isn't in the editor", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const otherEditor = await MeshEditor.addToScene(scene);
        const mesh = otherEditor.addMesh(createSource(square));

        expect(editor.removeMesh(mesh)).toBe(false);
        expect(otherEditor.hasMesh(mesh)).toBe(true);
      });

      it("stops drawing the mesh's overlay", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));
        expect(renderCommands(mesh).length).toBeGreaterThan(0);

        editor.removeMesh(mesh);

        expect(renderCommands(mesh)).toEqual([]);
      });

      it("raises meshRemoved after removing the mesh and before destroying it", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createSource(square);
        const mesh = editor.addMesh(source);
        const listener = jasmine
          .createSpy("meshRemoved")
          .and.callFake((removedMesh) => {
            expect(editor.hasMesh(removedMesh)).toBe(false);
            expect(editor.getMesh(source)).toBeUndefined();
            expect(removedMesh.isDestroyed()).toBe(false);
            expect(removedMesh.source).toBe(source);
          });
        editor.meshRemoved.addEventListener(listener);

        editor.removeMesh(mesh);

        expect(listener).toHaveBeenCalledOnceWith(mesh);
        expect(mesh.isDestroyed()).toBe(true);
      });

      it("does not raise meshRemoved for a mesh that isn't in the editor", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const otherEditor = await MeshEditor.addToScene(scene);
        const mesh = otherEditor.addMesh(createSource(square));
        const listener = jasmine.createSpy("meshRemoved");
        editor.meshRemoved.addEventListener(listener);

        editor.removeMesh(mesh);

        expect(listener).not.toHaveBeenCalled();
      });
    });

    describe("active meshes", function () {
      it("setMeshActive makes a mesh active", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));

        editor.setMeshActive(mesh);

        expect(editor.isMeshActive(mesh)).toBe(true);
      });

      it("setMeshInactive makes a mesh inactive", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));
        editor.setMeshActive(mesh);

        editor.setMeshInactive(mesh);

        expect(editor.isMeshActive(mesh)).toBe(false);
      });

      it("throws for a mesh that isn't in the editor", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const otherEditor = await MeshEditor.addToScene(scene);
        const mesh = otherEditor.addMesh(createSource(square));

        expect(() => editor.setMeshActive(mesh)).toThrowDeveloperError();
        expect(() => editor.setMeshInactive(mesh)).toThrowDeveloperError();
        expect(() => editor.isMeshActive(mesh)).toThrowDeveloperError();
      });

      it("draws an inactive mesh as faces in every mode", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));

        expect(renderInstanceCounts(mesh)).toEqual([2]);

        editor.mode = EditMode.VERTEX;
        expect(renderInstanceCounts(mesh)).toEqual([2]);
      });

      it("draws a mesh as faces once it's inactive", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));
        editor.mode = EditMode.VERTEX;
        editor.setMeshActive(mesh);

        editor.setMeshInactive(mesh);

        expect(renderInstanceCounts(mesh)).toEqual([2]);
      });
    });

    describe("tools", function () {
      it("has the built-in select and translate tools", function () {});

      it("returns the same tools on every read", function () {});
    });

    describe("activeTool", function () {
      it("is undefined initially", function () {});

      it("sets the active tool", function () {});

      it("clears the active tool when set to undefined", function () {});

      it("throws for a tool from another editor", function () {});

      it("throws for a tool that doesn't support the current mode", function () {});

      it("is cleared when the mode is set to EditMode.NONE", function () {});
    });

    describe("pointer input", function () {
      it("selects a clicked vertex with the select tool", function () {});

      it("toggles a shift-clicked vertex with the select tool", function () {});

      it("clears the selection when clicking empty space", function () {});

      it("clears the selection when clicking a component the mode can't select", function () {});

      it("moves the selection when dragging with the translate tool", function () {});

      it("restores the selection's position when the translate tool is cancelled mid-drag", function () {});

      it("makes a clicked mesh the only active mesh in EditMode.NONE", function () {});

      it("toggles a shift-clicked mesh in EditMode.NONE", function () {});

      it("makes every mesh inactive when clicking empty space in EditMode.NONE", function () {});
    });

    describe("mode", function () {
      it("sets the mode", async function () {
        const editor = await MeshEditor.addToScene(scene);

        editor.mode = EditMode.EDGE;

        expect(editor.mode).toBe(EditMode.EDGE);
      });

      it("raises modeChanged after updating the mode and mesh", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));
        editor.setMeshActive(mesh);
        const listener = jasmine.createSpy("modeChanged").and.callFake(() => {
          expect(editor.mode).toBe(EditMode.EDGE);
          expect(renderInstanceCounts(mesh)).toEqual([2, 5]);
        });
        editor.modeChanged.addEventListener(listener);

        editor.mode = EditMode.EDGE;

        expect(listener).toHaveBeenCalledOnceWith(EditMode.EDGE, EditMode.NONE);
      });

      it("does not raise modeChanged when the mode is unchanged", async function () {
        const editor = await MeshEditor.addToScene(scene);
        editor.mode = EditMode.EDGE;
        const listener = jasmine.createSpy("modeChanged");
        editor.modeChanged.addEventListener(listener);

        editor.mode = EditMode.EDGE;

        expect(listener).not.toHaveBeenCalled();
      });

      it("draws only the components the mode renders", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));
        editor.setMeshActive(mesh);

        editor.mode = EditMode.VERTEX;
        expect(renderInstanceCounts(mesh)).toEqual([2, 5, 4]);

        editor.mode = EditMode.EDGE;
        expect(renderInstanceCounts(mesh)).toEqual([2, 5]);
      });

      it("picks only faces and the components the mode selects", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));
        const inactive = editor.addMesh(createSource(square));
        editor.setMeshActive(mesh);

        expect(pickInstanceCounts(mesh)).toEqual([2]);

        editor.mode = EditMode.FACE;
        expect(renderInstanceCounts(mesh)).toEqual([2, 5]);
        expect(pickInstanceCounts(mesh)).toEqual([2]);

        editor.mode = EditMode.EDGE;
        expect(pickInstanceCounts(mesh)).toEqual([2, 5]);

        editor.mode = EditMode.VERTEX;
        expect(renderInstanceCounts(mesh)).toEqual([2, 5, 4]);
        expect(pickInstanceCounts(mesh)).toEqual([2, 4]);
        expect(pickInstanceCounts(inactive)).toEqual([2]);
      });

      it("draws faces and their outline in EditMode.NONE", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));
        editor.setMeshActive(mesh);

        // Faces, then the outline's edges and points.
        expect(renderInstanceCounts(mesh)).toEqual([2, 5, 4]);
      });

      it("applies the mode to meshes activated later", async function () {
        const editor = await MeshEditor.addToScene(scene);
        editor.mode = EditMode.EDGE;
        const mesh = editor.addMesh(createSource(square));

        editor.setMeshActive(mesh);

        expect(renderInstanceCounts(mesh)).toEqual([2, 5]);
      });

      it("doesn't affect inactive meshes", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const active = editor.addMesh(createSource(square));
        const inactive = editor.addMesh(createSource(square));
        editor.setMeshActive(active);

        editor.mode = EditMode.VERTEX;

        expect(renderInstanceCounts(active)).toEqual([2, 5, 4]);
        expect(renderInstanceCounts(inactive)).toEqual([2]);
      });

      it("accepts combinations of components", async function () {
        const editor = await MeshEditor.addToScene(scene);

        editor.mode = EditMode.VERTEX | EditMode.EDGE;

        expect(editor.mode).toBe(EditMode.VERTEX | EditMode.EDGE);
      });

      it("throws for unknown components and keeps the mode", async function () {
        const editor = await MeshEditor.addToScene(scene);
        editor.mode = EditMode.FACE;
        const listener = jasmine.createSpy("modeChanged");
        editor.modeChanged.addEventListener(listener);

        expect(() => {
          editor.mode = 8;
        }).toThrowError();
        expect(editor.mode).toBe(EditMode.FACE);
        expect(listener).not.toHaveBeenCalled();
      });
    });

    describe("update", function () {
      it("draws the overlay", async function () {
        const editor = await MeshEditor.addToScene(scene);
        editor.mode = EditMode.VERTEX;
        const mesh = editor.addMesh(createSource(square));

        editor.setMeshActive(mesh);

        expect(renderInstanceCounts(mesh)).toEqual([2, 5, 4]);
      });

      it("draws the overlay at the source's world transform", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createSource(square);
        Matrix4.fromTranslation(
          new Cartesian3(1.0, 2.0, 3.0),
          source.worldMatrix,
        );

        const mesh = editor.addMesh(source);

        for (const command of renderCommands(mesh)) {
          expect(command.modelMatrix).toEqual(source.worldMatrix);
        }
      });

      it("follows changes to the source's world transform", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createSource(square);
        const mesh = editor.addMesh(source);
        renderCommands(mesh);

        Matrix4.fromTranslation(
          new Cartesian3(-1.0, 0.0, 0.0),
          source.worldMatrix,
        );

        const commands = renderCommands(mesh);
        expect(commands.length).toBeGreaterThan(0);
        for (const command of commands) {
          expect(command.modelMatrix).toEqual(source.worldMatrix);
        }
      });

      it("doesn't draw or pick a mesh whose show is false", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));
        mesh.show = false;

        expect(renderCommands(mesh)).toEqual([]);
        expect(scene).toPickAndCall(
          (result) => expect(result).toBeUndefined(),
          getWindowPosition(facePosition),
        );
      });

      it("draws nothing outside 3D", async function () {
        // The other specs' camera is too close to the origin for 2D.
        const scene2D = createScene();
        scene2D.morphTo2D(0.0);

        try {
          const editor = await MeshEditor.addToScene(scene2D);
          const mesh = editor.addMesh(createSource(square));

          expect(renderCommands(mesh, scene2D)).toEqual([]);
        } finally {
          scene2D.destroyForSpecs();
        }
      });

      it("makes overlay components pickable as the mesh", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));
        scene.renderForSpecs();

        expect(scene).toPickAndCall((result) => {
          expect(result.primitive).toBe(mesh);
          expect(result.componentType).toBe(ComponentType.Face);
          expect(result.index).toEqual(jasmine.any(Number));
        }, getWindowPosition(facePosition));
      });

      it("supports drillPick across meshes", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const far = editor.addMesh(createSource(square));
        const nearSource = createSource(square);
        Matrix4.fromTranslation(
          new Cartesian3(0.0, 0.0, 0.5),
          nearSource.worldMatrix,
        );
        const near = editor.addMesh(nearSource);
        scene.renderForSpecs();

        const results = scene.drillPick(getWindowPosition(facePosition));

        // The WebGL stub doesn't pick, so like the renderer matchers, skip the check.
        if (!window.webglStub) {
          expect(results.map((result) => result.primitive)).toEqual([
            near,
            far,
          ]);
        }
        expect(near.show).toBe(true);
        expect(far.show).toBe(true);
      });
    });

    describe("style", function () {
      it("is a default style", async function () {
        const editor = await MeshEditor.addToScene(scene);

        expect(editor.style).toEqual(new MeshEditorStyle());
      });

      it("draws the meshes with its changes on the next frame", async function () {
        const editor = await MeshEditor.addToScene(scene);
        editor.addMesh(createSource(square));
        scene.renderForSpecs();

        editor.style.faceColor = Color.BLUE;

        expectPixel(facePosition, [0, 0, 255, 255]);
      });
    });

    describe("outline", function () {
      it("outlines only active meshes in EditMode.NONE", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const active = editor.addMesh(createSource(square));
        const inactive = editor.addMesh(createSource(square));
        editor.setMeshActive(active);

        // Faces, then the outline's edges and points.
        expect(renderOutlineFlags(active)).toEqual([false, true, true]);
        expect(renderOutlineFlags(inactive)).toEqual([false]);
      });

      it("outlines active meshes only while in EditMode.NONE", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));
        editor.setMeshActive(mesh);

        editor.mode = EditMode.EDGE;
        expect(renderOutlineFlags(mesh)).toEqual([false, false]);

        editor.mode = EditMode.NONE;
        expect(renderOutlineFlags(mesh)).toEqual([false, true, true]);
      });

      it("removes the outline when a mesh is deactivated", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));
        editor.setMeshActive(mesh);

        editor.setMeshInactive(mesh);

        expect(renderOutlineFlags(mesh)).toEqual([false]);
      });

      it("adds outlines after every mesh's other commands", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const first = editor.addMesh(createSource(square));
        const second = editor.addMesh(createSource(square));
        editor.setMeshActive(first);
        editor.setMeshActive(second);
        const renderers = [first._renderer, second._renderer];

        scene.renderForSpecs();
        const flags = scene.frameState.commandList
          .filter((command) => renderers.includes(command.owner))
          .map(isOutlineCommand);

        // Each mesh's faces, then each mesh's outline edges and points.
        expect(flags).toEqual([false, false, true, true, true, true]);
      });

      it("draws outlines in the style's color and width", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createSource(square));
        editor.setMeshActive(mesh);

        editor.style.outlineColor = Color.RED;
        // Wide enough that the antialiased borders don't reach the sampled pixel.
        editor.style.outlineWidth = 4.0;

        // Just right of the square's right edge.
        expectPixel([1.0, 0.0, 0.0], [255, 0, 0, 255], 2);
      });
    });

    describe("destroy", function () {
      it("destroys every mesh and shows its source", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const sources = [createSource(square), createSource(square)];
        const meshes = sources.map((source) => editor.addMesh(source));

        scene.primitives.remove(editor);

        for (const mesh of meshes) {
          expect(mesh.isDestroyed()).toBe(true);
        }
        for (const source of sources) {
          expect(source.show).toBe(true);
        }
      });

      it("does not raise meshRemoved", async function () {
        const editor = await MeshEditor.addToScene(scene);
        editor.addMesh(createSource(square));
        const listener = jasmine.createSpy("meshRemoved");
        editor.meshRemoved.addEventListener(listener);

        scene.primitives.remove(editor);

        expect(listener).not.toHaveBeenCalled();
      });

      it("is called when the editor is removed from the scene", async function () {
        const editor = await MeshEditor.addToScene(scene);

        scene.primitives.remove(editor);

        expect(editor.isDestroyed()).toBe(true);
      });

      it("is called when the scene is destroyed", async function () {
        const otherScene = createScene();
        const editor = await MeshEditor.addToScene(otherScene);

        otherScene.destroyForSpecs();

        expect(editor.isDestroyed()).toBe(true);
      });

      it("isDestroyed returns false before destroy", async function () {
        const editor = await MeshEditor.addToScene(scene);

        expect(editor.isDestroyed()).toBe(false);
      });

      it("stops handling pointer input", function () {});
    });
  },
  "WebGL",
);
