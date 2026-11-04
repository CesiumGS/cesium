import {
  Cartesian2,
  Cartesian3,
  Color,
  Matrix3,
  Matrix4,
  OrientedBoundingBox,
  RuntimeError,
} from "@cesium/core";
import { SceneTransforms, StencilFunction } from "@cesium/engine";
import {
  ComponentType,
  MeshEditor as WasmMeshEditor,
} from "@cesium/mesh-editor";
import {
  EditMode,
  Mesh,
  MeshEditor,
  MeshEditorGroup,
  MeshEditorStyle,
  SelectTool,
  TranslateTool,
} from "../../index.js";
import createCanvas from "../../../../Specs/createCanvas.js";
import createScene from "../../../../Specs/createScene.js";
import DomEventSimulator from "../../../../Specs/DomEventSimulator.js";
import createGeometrySource, { square } from "../createGeometrySource.js";

const pointColor = [0, 0, 0, 255];
const selectedPointColor = [255, 122, 0, 255];

// Two connected lines, which can't be faces.
const lines = {
  positions: square.positions.slice(0, 3),
  primitives: [
    [0, 1],
    [1, 2],
  ],
};

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
      // Without this, the camera keeps its previous right vector, and pick
      // rays don't match window positions.
      camera.right = Cartesian3.clone(Cartesian3.UNIT_X);
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

    // Fires a pointer event of type "Down", "Move" or "Up" at a window
    // position on the scene's canvas.
    function firePointer(type, windowPosition, options = {}) {
      const rect = scene.canvas.getBoundingClientRect();
      DomEventSimulator[`firePointer${type}`](scene.canvas, {
        ...options,
        pointerType: "mouse",
        clientX: windowPosition.x + rect.left,
        clientY: windowPosition.y + rect.top,
      });
    }

    function click(windowPosition, options) {
      firePointer("Down", windowPosition, options);
      firePointer("Up", windowPosition, options);
    }

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
        const source = createGeometrySource(square);

        const mesh = editor.addMesh(source);

        expect(mesh).toBeInstanceOf(Mesh);
        expect(mesh.source).toBe(source);
        expect(editor.hasMesh(mesh)).toBe(true);
      });

      it("hides the source", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createGeometrySource(square);

        editor.addMesh(source);

        expect(source.show).toBe(false);
      });

      it("accepts a source without show", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createGeometrySource(square);
        delete source.show;

        const mesh = editor.addMesh(source);
        editor.removeMesh(mesh);

        expect(source.show).toBeUndefined();
      });

      it("returns a shown, inactive mesh", async function () {
        const editor = await MeshEditor.addToScene(scene);

        const mesh = editor.addMesh(createGeometrySource(square));

        expect(mesh.show).toBe(true);
        expect(editor.isMeshActive(mesh)).toBe(false);
      });

      it("throws if the source was already added", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createGeometrySource(square);
        editor.addMesh(source);

        expect(() => editor.addMesh(source)).toThrowDeveloperError();
      });

      it("throws a RuntimeError if the geometry can't be edited", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createGeometrySource(lines);

        expect(() => editor.addMesh(source)).toThrowError(RuntimeError);
        expect(source.show).toBe(true);
      });

      it("raises meshAdded after adding the mesh", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const listener = jasmine.createSpy("meshAdded").and.callFake((mesh) => {
          expect(editor.hasMesh(mesh)).toBe(true);
        });
        editor.meshAdded.addEventListener(listener);

        const mesh = editor.addMesh(createGeometrySource(square));

        expect(listener).toHaveBeenCalledOnceWith(mesh);
      });

      it("does not raise meshAdded if the geometry can't be edited", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const listener = jasmine.createSpy("meshAdded");
        editor.meshAdded.addEventListener(listener);

        expect(() => editor.addMesh(createGeometrySource(lines))).toThrowError(
          RuntimeError,
        );
        expect(listener).not.toHaveBeenCalled();
      });

      it("adds the mesh to the root group by default", async function () {
        const editor = await MeshEditor.addToScene(scene);

        const mesh = editor.addMesh(createGeometrySource(square));

        expect(mesh.parent).toBe(editor.root);
        expect(mesh.name).toBeUndefined();
        expect(editor.root.children).toEqual([mesh]);
      });

      it("adds the mesh to the given group with the given name", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const group = editor.addGroup();

        const mesh = editor.addMesh(createGeometrySource(square), {
          name: "Body",
          parent: group,
        });

        expect(mesh.name).toBe("Body");
        expect(mesh.parent).toBe(group);
        expect(group.children).toEqual([mesh]);
        expect(editor.root.children).toEqual([group]);
      });

      it("throws if options.parent isn't a group in this editor", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const otherEditor = await MeshEditor.addToScene(scene);
        const otherGroup = otherEditor.addGroup();
        const mesh = editor.addMesh(createGeometrySource(square));

        expect(() =>
          editor.addMesh(createGeometrySource(square), { parent: otherGroup }),
        ).toThrowDeveloperError();
        expect(() =>
          editor.addMesh(createGeometrySource(square), { parent: mesh }),
        ).toThrowDeveloperError();
        expect(editor.meshes).toEqual([mesh]);
      });

      it("throws if options.name isn't a string", async function () {
        const editor = await MeshEditor.addToScene(scene);

        expect(() =>
          editor.addMesh(createGeometrySource(square), { name: 1 }),
        ).toThrowDeveloperError();
      });

      it("raises meshGroupChanged with the parent after meshAdded", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const group = editor.addGroup();
        const calls = [];
        editor.meshAdded.addEventListener(() => calls.push("meshAdded"));
        editor.meshGroupChanged.addEventListener((changedGroup) => {
          calls.push("meshGroupChanged");
          expect(changedGroup).toBe(group);
          expect(changedGroup.children.length).toBe(1);
        });

        editor.addMesh(createGeometrySource(square), { parent: group });

        expect(calls).toEqual(["meshAdded", "meshGroupChanged"]);
      });

      it("does not change the hierarchy if the geometry can't be edited", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const listener = jasmine.createSpy("meshGroupChanged");
        editor.meshGroupChanged.addEventListener(listener);

        expect(() => editor.addMesh(createGeometrySource(lines))).toThrowError(
          RuntimeError,
        );
        expect(editor.root.children).toEqual([]);
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
        const first = editor.addMesh(createGeometrySource(square));
        const second = editor.addMesh(createGeometrySource(square));
        const third = editor.addMesh(createGeometrySource(square));
        editor.removeMesh(second);

        expect(editor.meshes).toEqual([first, third]);
      });

      it("returns a copy", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));

        editor.meshes.length = 0;

        expect(editor.meshes).toEqual([mesh]);
      });
    });

    describe("getMesh", function () {
      it("returns the mesh that edits the source", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createGeometrySource(square);
        const mesh = editor.addMesh(source);

        expect(editor.getMesh(source)).toBe(mesh);
      });

      it("returns undefined for a source that isn't in the editor", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const otherEditor = await MeshEditor.addToScene(scene);
        const source = createGeometrySource(square);
        otherEditor.addMesh(source);

        expect(editor.getMesh(source)).toBeUndefined();
      });

      it("returns undefined once the mesh is removed", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createGeometrySource(square);
        editor.removeMesh(editor.addMesh(source));

        expect(editor.getMesh(source)).toBeUndefined();
      });

      it("allows a removed source to be added again", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createGeometrySource(square);
        editor.removeMesh(editor.addMesh(source));

        const mesh = editor.addMesh(source);

        expect(editor.getMesh(source)).toBe(mesh);
      });
    });

    describe("removeMesh", function () {
      it("returns true and removes the mesh", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));

        expect(editor.removeMesh(mesh)).toBe(true);
        expect(editor.hasMesh(mesh)).toBe(false);
      });

      it("destroys the mesh", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));

        editor.removeMesh(mesh);

        expect(mesh.isDestroyed()).toBe(true);
      });

      it("shows the source", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createGeometrySource(square);
        const mesh = editor.addMesh(source);

        editor.removeMesh(mesh);

        expect(source.show).toBe(true);
      });

      it("returns false for a mesh that isn't in the editor", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const otherEditor = await MeshEditor.addToScene(scene);
        const mesh = otherEditor.addMesh(createGeometrySource(square));

        expect(editor.removeMesh(mesh)).toBe(false);
        expect(otherEditor.hasMesh(mesh)).toBe(true);
      });

      it("stops drawing the mesh's overlay", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));
        expect(renderCommands(mesh).length).toBeGreaterThan(0);

        editor.removeMesh(mesh);

        expect(renderCommands(mesh)).toEqual([]);
      });

      it("raises meshRemoved after removing the mesh and before destroying it", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createGeometrySource(square);
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
        const mesh = otherEditor.addMesh(createGeometrySource(square));
        const listener = jasmine.createSpy("meshRemoved");
        editor.meshRemoved.addEventListener(listener);

        editor.removeMesh(mesh);

        expect(listener).not.toHaveBeenCalled();
      });

      it("removes the mesh from its parent", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const group = editor.addGroup();
        const first = editor.addMesh(createGeometrySource(square), {
          parent: group,
        });
        const second = editor.addMesh(createGeometrySource(square), {
          parent: group,
        });

        editor.removeMesh(first);

        expect(group.children).toEqual([second]);
      });

      it("raises meshGroupChanged with the parent after meshRemoved", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const group = editor.addGroup();
        const mesh = editor.addMesh(createGeometrySource(square), {
          parent: group,
        });
        const calls = [];
        editor.meshRemoved.addEventListener(() => calls.push("meshRemoved"));
        editor.meshGroupChanged.addEventListener((changedGroup) => {
          calls.push("meshGroupChanged");
          expect(changedGroup).toBe(group);
          expect(changedGroup.children).toEqual([]);
        });

        editor.removeMesh(mesh);

        expect(calls).toEqual(["meshRemoved", "meshGroupChanged"]);
      });

      it("does not raise meshGroupChanged for a mesh that isn't in the editor", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const otherEditor = await MeshEditor.addToScene(scene);
        const mesh = otherEditor.addMesh(createGeometrySource(square));
        const listener = jasmine.createSpy("meshGroupChanged");
        editor.meshGroupChanged.addEventListener(listener);

        editor.removeMesh(mesh);

        expect(listener).not.toHaveBeenCalled();
      });
    });

    describe("root", function () {
      it("is an empty group with no name or parent", async function () {
        const editor = await MeshEditor.addToScene(scene);

        expect(editor.root).toBeInstanceOf(MeshEditorGroup);
        expect(editor.root.name).toBeUndefined();
        expect(editor.root.parent).toBeUndefined();
        expect(editor.root.children).toEqual([]);
      });

      it("can't be removed", async function () {
        const editor = await MeshEditor.addToScene(scene);

        expect(() => editor.removeGroup(editor.root)).toThrowDeveloperError();
        expect(editor.root.isDestroyed()).toBe(false);
      });
    });

    describe("addGroup", function () {
      it("adds a group to the root group by default", async function () {
        const editor = await MeshEditor.addToScene(scene);

        const group = editor.addGroup();

        expect(group).toBeInstanceOf(MeshEditorGroup);
        expect(group.name).toBeUndefined();
        expect(group.parent).toBe(editor.root);
        expect(group.children).toEqual([]);
        expect(editor.root.children).toEqual([group]);
      });

      it("adds a group to the given group with the given name", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const parent = editor.addGroup({ name: "Milk truck" });

        const group = editor.addGroup({ name: "Wheels", parent });

        expect(parent.name).toBe("Milk truck");
        expect(group.name).toBe("Wheels");
        expect(group.parent).toBe(parent);
        expect(parent.children).toEqual([group]);
      });

      it("lists meshes and groups in the order they were added", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const first = editor.addMesh(createGeometrySource(square));
        const second = editor.addGroup();
        const third = editor.addMesh(createGeometrySource(square));

        expect(editor.root.children).toEqual([first, second, third]);
      });

      it("children returns a copy", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const group = editor.addGroup();

        editor.root.children.length = 0;

        expect(editor.root.children).toEqual([group]);
      });

      it("doesn't list groups in meshes", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const group = editor.addGroup();

        expect(editor.meshes).toEqual([]);
        expect(group.children).toEqual([]);
      });

      it("throws if options.parent isn't a group in this editor", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const otherEditor = await MeshEditor.addToScene(scene);
        const otherGroup = otherEditor.addGroup();
        const mesh = editor.addMesh(createGeometrySource(square));

        expect(() =>
          editor.addGroup({ parent: otherGroup }),
        ).toThrowDeveloperError();
        expect(() => editor.addGroup({ parent: mesh })).toThrowDeveloperError();
        expect(editor.root.children).toEqual([mesh]);
      });

      it("throws if options.parent was removed", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const group = editor.addGroup();
        editor.removeGroup(group);

        expect(() =>
          editor.addGroup({ parent: group }),
        ).toThrowDeveloperError();
      });

      it("raises meshGroupChanged with the parent", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const parent = editor.addGroup();
        const listener = jasmine
          .createSpy("meshGroupChanged")
          .and.callFake((changedGroup) => {
            expect(changedGroup.children.length).toBe(1);
          });
        editor.meshGroupChanged.addEventListener(listener);

        editor.addGroup({ parent });

        expect(listener).toHaveBeenCalledOnceWith(parent);
      });
    });

    describe("removeGroup", function () {
      it("returns true, removes the group from its parent and destroys it", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const parent = editor.addGroup();
        const group = editor.addGroup({ parent });

        expect(editor.removeGroup(group)).toBe(true);
        expect(parent.children).toEqual([]);
        expect(group.isDestroyed()).toBe(true);
      });

      it("removes and destroys everything in the group", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const group = editor.addGroup();
        const innerGroup = editor.addGroup({ parent: group });
        const sources = [
          createGeometrySource(square),
          createGeometrySource(square),
        ];
        const mesh = editor.addMesh(sources[0], { parent: group });
        const innerMesh = editor.addMesh(sources[1], { parent: innerGroup });
        const otherMesh = editor.addMesh(createGeometrySource(square));

        editor.removeGroup(group);

        expect(editor.meshes).toEqual([otherMesh]);
        expect(editor.root.children).toEqual([otherMesh]);
        expect(mesh.isDestroyed()).toBe(true);
        expect(innerMesh.isDestroyed()).toBe(true);
        expect(innerGroup.isDestroyed()).toBe(true);
        for (const source of sources) {
          expect(source.show).toBe(true);
          expect(editor.getMesh(source)).toBeUndefined();
        }
      });

      it("raises meshRemoved for each mesh, then meshGroupChanged once with the parent", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const parent = editor.addGroup();
        const group = editor.addGroup({ parent });
        const innerGroup = editor.addGroup({ parent: group });
        const mesh = editor.addMesh(createGeometrySource(square), {
          parent: group,
        });
        const innerMesh = editor.addMesh(createGeometrySource(square), {
          parent: innerGroup,
        });
        const calls = [];
        editor.meshRemoved.addEventListener((removedMesh) => {
          expect(removedMesh.isDestroyed()).toBe(false);
          calls.push(removedMesh);
        });
        editor.meshGroupChanged.addEventListener((changedGroup) => {
          expect(changedGroup.children).toEqual([]);
          calls.push(changedGroup);
        });

        editor.removeGroup(group);

        expect(calls).toEqual([innerMesh, mesh, parent]);
      });

      it("returns false for a group that isn't in the editor", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const otherEditor = await MeshEditor.addToScene(scene);
        const otherGroup = otherEditor.addGroup();
        const listener = jasmine.createSpy("meshGroupChanged");
        editor.meshGroupChanged.addEventListener(listener);

        expect(editor.removeGroup(otherGroup)).toBe(false);
        expect(otherGroup.isDestroyed()).toBe(false);
        expect(listener).not.toHaveBeenCalled();
      });

      it("returns false for a group that was already removed", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const group = editor.addGroup();
        editor.removeGroup(group);

        expect(editor.removeGroup(group)).toBe(false);
      });
    });

    describe("active meshes", function () {
      it("setMeshActive makes a mesh active", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));

        editor.setMeshActive(mesh);

        expect(editor.isMeshActive(mesh)).toBe(true);
      });

      it("setMeshInactive makes a mesh inactive", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));
        editor.setMeshActive(mesh);

        editor.setMeshInactive(mesh);

        expect(editor.isMeshActive(mesh)).toBe(false);
      });

      it("throws for a mesh that isn't in the editor", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const otherEditor = await MeshEditor.addToScene(scene);
        const mesh = otherEditor.addMesh(createGeometrySource(square));

        expect(() => editor.setMeshActive(mesh)).toThrowDeveloperError();
        expect(() => editor.setMeshInactive(mesh)).toThrowDeveloperError();
        expect(() => editor.isMeshActive(mesh)).toThrowDeveloperError();
      });

      it("draws an inactive mesh as faces in every mode", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));

        expect(renderInstanceCounts(mesh)).toEqual([2]);

        editor.mode = EditMode.VERTEX;
        expect(renderInstanceCounts(mesh)).toEqual([2]);
      });

      it("draws a mesh as faces once it's inactive", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));
        editor.mode = EditMode.VERTEX;
        editor.setMeshActive(mesh);

        editor.setMeshInactive(mesh);

        expect(renderInstanceCounts(mesh)).toEqual([2]);
      });
    });

    describe("activeTool", function () {
      it("is undefined initially", async function () {
        const editor = await MeshEditor.addToScene(scene);

        expect(editor.activeTool).toBeUndefined();
      });

      it("sets the active tool", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const selectTool = SelectTool.addTo(editor);
        const translateTool = TranslateTool.addTo(editor);
        editor.mode = EditMode.VERTEX;

        editor.activeTool = selectTool;
        expect(editor.activeTool).toBe(selectTool);

        editor.activeTool = translateTool;
        expect(editor.activeTool).toBe(translateTool);
      });

      it("clears the active tool when set to undefined", async function () {
        const editor = await MeshEditor.addToScene(scene);
        editor.mode = EditMode.VERTEX;
        editor.activeTool = SelectTool.addTo(editor);

        editor.activeTool = undefined;

        expect(editor.activeTool).toBeUndefined();
      });

      it("raises activeToolChanged after activating, replacing, and clearing a tool", async function () {
        const editor = await MeshEditor.addToScene(scene);
        editor.mode = EditMode.VERTEX;
        const selectTool = SelectTool.addTo(editor);
        const translateTool = TranslateTool.addTo(editor);
        const listener = jasmine
          .createSpy("activeToolChanged")
          .and.callFake((tool) => {
            expect(editor.activeTool).toBe(tool);
          });
        editor.activeToolChanged.addEventListener(listener);

        editor.activeTool = selectTool;
        editor.activeTool = translateTool;
        editor.activeTool = undefined;

        expect(listener.calls.allArgs()).toEqual([
          [selectTool, undefined],
          [translateTool, selectTool],
          [undefined, translateTool],
        ]);
      });

      it("does not raise activeToolChanged when the tool is unchanged", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const listener = jasmine.createSpy("activeToolChanged");
        editor.activeToolChanged.addEventListener(listener);

        editor.activeTool = undefined;
        expect(listener).not.toHaveBeenCalled();

        const tool = SelectTool.addTo(editor);
        editor.activeTool = tool;
        listener.calls.reset();

        editor.activeTool = tool;
        editor.mode = EditMode.VERTEX;

        expect(editor.activeTool).toBe(tool);
        expect(listener).not.toHaveBeenCalled();
      });

      it("throws for a tool from another editor", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const otherEditor = await MeshEditor.addToScene(scene);
        const otherTool = SelectTool.addTo(otherEditor);
        editor.mode = EditMode.VERTEX;
        const listener = jasmine.createSpy("activeToolChanged");
        editor.activeToolChanged.addEventListener(listener);

        expect(() => {
          editor.activeTool = otherTool;
        }).toThrowDeveloperError();
        expect(listener).not.toHaveBeenCalled();
      });

      it("throws for a tool that doesn't support the current mode", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const translateTool = TranslateTool.addTo(editor);
        const selectTool = SelectTool.addTo(editor);
        editor.activeTool = selectTool;
        const listener = jasmine.createSpy("activeToolChanged");
        editor.activeToolChanged.addEventListener(listener);

        expect(() => {
          editor.activeTool = translateTool;
        }).toThrowDeveloperError();
        expect(editor.activeTool).toBe(selectTool);
        expect(listener).not.toHaveBeenCalled();
      });

      it("is cleared when the mode is set to EditMode.NONE", async function () {
        const editor = await MeshEditor.addToScene(scene);
        editor.mode = EditMode.VERTEX;
        const tool = TranslateTool.addTo(editor);
        editor.activeTool = tool;
        const listener = jasmine
          .createSpy("activeToolChanged")
          .and.callFake(() => {
            expect(editor.mode).toBe(EditMode.NONE);
            expect(editor.activeTool).toBeUndefined();
          });
        editor.activeToolChanged.addEventListener(listener);
        const modeListener = jasmine.createSpy("modeChanged");
        editor.modeChanged.addEventListener(modeListener);

        editor.mode = EditMode.NONE;

        expect(editor.activeTool).toBeUndefined();
        expect(listener).toHaveBeenCalledOnceWith(undefined, tool);
        expect(listener).toHaveBeenCalledBefore(modeListener);
      });
    });

    describe("pointer input", function () {
      // The square's corners.
      const corner0 = [-1.0, -1.0, 0.0];
      const corner1 = [1.0, -1.0, 0.0];

      // Outside the square, near the canvas's corner.
      const emptyWindowPosition = new Cartesian2(5.0, 5.0);

      // Renders a frame and reads the pixel under a window position.
      function renderPixel(windowPosition) {
        scene.renderForSpecs();

        // Window coordinates start at the top, and pixels at the bottom.
        return scene.context.readPixels({
          x: Math.floor(windowPosition.x),
          y: scene.drawingBufferHeight - 1 - Math.floor(windowPosition.y),
          width: 1,
          height: 1,
        });
      }

      function expectPixel(windowPosition, color) {
        const pixel = renderPixel(windowPosition);

        // The WebGL stub doesn't draw or pick, so like the renderer matchers, skip the check.
        if (!window.webglStub) {
          expect(pixel).toEqualEpsilon(color, 3);
        }
      }

      // Creates an editor with an active square, rendered once so it's
      // pickable.
      async function createEditorWithSquare(mode) {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));
        editor.setMeshActive(mesh);
        editor.mode = mode;
        scene.renderForSpecs();
        return { editor, mesh };
      }

      it("selects a clicked vertex with the select tool", async function () {
        const { editor } = await createEditorWithSquare(EditMode.VERTEX);
        editor.activeTool = SelectTool.addTo(editor);

        click(getWindowPosition(corner0));

        expectPixel(getWindowPosition(corner0), selectedPointColor);
        expectPixel(getWindowPosition(corner1), pointColor);
      });

      it("toggles a shift-clicked vertex with the select tool", async function () {
        const { editor } = await createEditorWithSquare(EditMode.VERTEX);
        editor.activeTool = SelectTool.addTo(editor);
        click(getWindowPosition(corner0));

        click(getWindowPosition(corner1), { shiftKey: true });
        expectPixel(getWindowPosition(corner0), selectedPointColor);
        expectPixel(getWindowPosition(corner1), selectedPointColor);

        click(getWindowPosition(corner0), { shiftKey: true });
        expectPixel(getWindowPosition(corner0), pointColor);
        expectPixel(getWindowPosition(corner1), selectedPointColor);
      });

      it("clears the selection when clicking empty space", async function () {
        const { editor } = await createEditorWithSquare(EditMode.VERTEX);
        editor.activeTool = SelectTool.addTo(editor);
        click(getWindowPosition(corner0));

        click(emptyWindowPosition);

        expectPixel(getWindowPosition(corner0), pointColor);
      });

      it("clears the selection when clicking a component the mode can't select", async function () {
        const { editor } = await createEditorWithSquare(EditMode.VERTEX);
        editor.activeTool = SelectTool.addTo(editor);
        click(getWindowPosition(corner0));

        click(getWindowPosition(facePosition));

        expectPixel(getWindowPosition(corner0), pointColor);
      });

      it("moves the selection when dragging with the translate tool", async function () {
        const { editor, mesh } = await createEditorWithSquare(EditMode.VERTEX);
        editor.activeTool = SelectTool.addTo(editor);
        click(getWindowPosition(corner0));
        editor.activeTool = TranslateTool.addTo(editor);
        const start = getWindowPosition(corner0);
        const end = new Cartesian2(start.x + 20.0, start.y - 20.0);

        firePointer("Down", start);
        firePointer("Move", end);
        firePointer("Up", end);

        expectPixel(end, selectedPointColor);
        scene.renderForSpecs();
        if (!window.webglStub) {
          expect(scene).toPickAndCall((result) => {
            expect(result.primitive).toBe(mesh);
            expect(result.componentType).toBe(ComponentType.Vertex);
          }, end);
        }
      });

      it("restores the selection's position when the translate tool is cancelled mid-drag", async function () {
        const { editor } = await createEditorWithSquare(EditMode.VERTEX);
        editor.activeTool = SelectTool.addTo(editor);
        click(getWindowPosition(corner0));
        const translateTool = TranslateTool.addTo(editor);
        editor.activeTool = translateTool;
        const start = getWindowPosition(corner0);
        const end = new Cartesian2(start.x + 20.0, start.y - 20.0);

        firePointer("Down", start);
        firePointer("Move", end);
        expectPixel(end, selectedPointColor);
        translateTool.cancel();
        firePointer("Up", end);

        expectPixel(start, selectedPointColor);
      });

      it("makes a clicked mesh the only active mesh with the select tool in EditMode.NONE", async function () {
        const { editor, mesh } = await createEditorWithSquare(EditMode.NONE);
        editor.activeTool = SelectTool.addTo(editor);
        editor.setMeshInactive(mesh);
        const other = editor.addMesh(createGeometrySource(square));
        editor.setMeshActive(other);
        // Draws the other square behind the first, so clicks hit the first.
        Matrix4.fromTranslation(
          new Cartesian3(0.0, 0.0, -1.0),
          other.source.worldMatrix,
        );
        scene.renderForSpecs();

        click(getWindowPosition(facePosition));

        if (!window.webglStub) {
          expect(editor.isMeshActive(mesh)).toBe(true);
          expect(editor.isMeshActive(other)).toBe(false);
        }
      });

      it("toggles a shift-clicked mesh with the select tool in EditMode.NONE", async function () {
        const { editor, mesh } = await createEditorWithSquare(EditMode.NONE);
        editor.activeTool = SelectTool.addTo(editor);
        editor.setMeshInactive(mesh);
        const other = editor.addMesh(createGeometrySource(square));
        editor.setMeshActive(other);
        Matrix4.fromTranslation(
          new Cartesian3(0.0, 0.0, -1.0),
          other.source.worldMatrix,
        );
        scene.renderForSpecs();

        click(getWindowPosition(facePosition), { shiftKey: true });

        if (!window.webglStub) {
          expect(editor.isMeshActive(mesh)).toBe(true);
          expect(editor.isMeshActive(other)).toBe(true);
        }

        click(getWindowPosition(facePosition), { shiftKey: true });

        if (!window.webglStub) {
          expect(editor.isMeshActive(mesh)).toBe(false);
          expect(editor.isMeshActive(other)).toBe(true);
        }
      });

      it("makes every mesh inactive when clicking empty space with the select tool in EditMode.NONE", async function () {
        const { editor, mesh } = await createEditorWithSquare(EditMode.NONE);
        editor.activeTool = SelectTool.addTo(editor);
        const other = editor.addMesh(createGeometrySource(square));
        editor.setMeshActive(other);

        click(emptyWindowPosition);

        expect(editor.isMeshActive(mesh)).toBe(false);
        expect(editor.isMeshActive(other)).toBe(false);
      });
    });

    describe("mode", function () {
      it("sets the mode", async function () {
        const editor = await MeshEditor.addToScene(scene);

        editor.mode = EditMode.EDGE;

        expect(editor.mode).toBe(EditMode.EDGE);
      });

      it("raises modeChanged after updating the mode and mesh", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));
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
        const mesh = editor.addMesh(createGeometrySource(square));
        editor.setMeshActive(mesh);

        editor.mode = EditMode.VERTEX;
        expect(renderInstanceCounts(mesh)).toEqual([2, 5, 4]);

        editor.mode = EditMode.EDGE;
        expect(renderInstanceCounts(mesh)).toEqual([2, 5]);
      });

      it("picks only faces and the components the mode selects", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));
        const inactive = editor.addMesh(createGeometrySource(square));
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
        const mesh = editor.addMesh(createGeometrySource(square));
        editor.setMeshActive(mesh);

        // Faces, then the outline's edges and points.
        expect(renderInstanceCounts(mesh)).toEqual([2, 5, 4]);
      });

      it("applies the mode to meshes activated later", async function () {
        const editor = await MeshEditor.addToScene(scene);
        editor.mode = EditMode.EDGE;
        const mesh = editor.addMesh(createGeometrySource(square));

        editor.setMeshActive(mesh);

        expect(renderInstanceCounts(mesh)).toEqual([2, 5]);
      });

      it("doesn't affect inactive meshes", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const active = editor.addMesh(createGeometrySource(square));
        const inactive = editor.addMesh(createGeometrySource(square));
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
        const mesh = editor.addMesh(createGeometrySource(square));

        editor.setMeshActive(mesh);

        expect(renderInstanceCounts(mesh)).toEqual([2, 5, 4]);
      });

      it("draws the overlay at the source's world transform", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createGeometrySource(square);
        Matrix4.fromTranslation(
          new Cartesian3(1.0, 2.0, 3.0),
          source.worldMatrix,
        );

        const mesh = editor.addMesh(source);

        for (const command of renderCommands(mesh)) {
          expect(command.modelMatrix).toEqual(source.worldMatrix);
        }
      });

      it("has the oriented bounding box of its geometry at the source's world transform", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createGeometrySource(square);
        Matrix4.fromTranslation(
          new Cartesian3(1.0, 2.0, 3.0),
          source.worldMatrix,
        );
        const mesh = editor.addMesh(source);
        expect(mesh.orientedBoundingBox).toBeUndefined();

        scene.renderForSpecs();

        expect(mesh.orientedBoundingBox).toEqual(
          new OrientedBoundingBox(
            new Cartesian3(1.0, 2.0, 3.0),
            Matrix3.fromScale(new Cartesian3(1.0, 1.0, 0.0)),
          ),
        );
      });

      it("culls the overlay with its bounding volume", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));

        const commands = renderCommands(mesh);
        expect(commands.length).toBeGreaterThan(0);
        for (const command of commands) {
          expect(command.boundingVolume).toBeDefined();
          expect(command.boundingVolume).toBe(mesh._renderer.boundingVolume);
        }
      });

      it("doesn't draw or pick a mesh whose show is false", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));
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
          const mesh = editor.addMesh(createGeometrySource(square));

          expect(renderCommands(mesh, scene2D)).toEqual([]);
        } finally {
          scene2D.destroyForSpecs();
        }
      });

      it("makes overlay components pickable as the mesh", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));
        scene.renderForSpecs();

        expect(scene).toPickAndCall((result) => {
          expect(result.primitive).toBe(mesh);
          expect(result.componentType).toBe(ComponentType.Face);
          expect(typeof result.componentKey).toBe("bigint");
        }, getWindowPosition(facePosition));
      });

      it("supports drillPick across meshes", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const far = editor.addMesh(createGeometrySource(square));
        const nearSource = createGeometrySource(square);
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
        editor.addMesh(createGeometrySource(square));
        scene.renderForSpecs();

        editor.style.faceColor = Color.BLUE;

        expectPixel(facePosition, [0, 0, 255, 255]);
      });
    });

    describe("outline", function () {
      it("outlines only active meshes in EditMode.NONE", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const active = editor.addMesh(createGeometrySource(square));
        const inactive = editor.addMesh(createGeometrySource(square));
        editor.setMeshActive(active);

        // Faces, then the outline's edges and points.
        expect(renderOutlineFlags(active)).toEqual([false, true, true]);
        expect(renderOutlineFlags(inactive)).toEqual([false]);
      });

      it("outlines active meshes only while in EditMode.NONE", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));
        editor.setMeshActive(mesh);

        editor.mode = EditMode.EDGE;
        expect(renderOutlineFlags(mesh)).toEqual([false, false]);

        editor.mode = EditMode.NONE;
        expect(renderOutlineFlags(mesh)).toEqual([false, true, true]);
      });

      it("removes the outline when a mesh is deactivated", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const mesh = editor.addMesh(createGeometrySource(square));
        editor.setMeshActive(mesh);

        editor.setMeshInactive(mesh);

        expect(renderOutlineFlags(mesh)).toEqual([false]);
      });

      it("adds outlines after every mesh's other commands", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const first = editor.addMesh(createGeometrySource(square));
        const second = editor.addMesh(createGeometrySource(square));
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
        const mesh = editor.addMesh(createGeometrySource(square));
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
        const sources = [
          createGeometrySource(square),
          createGeometrySource(square),
        ];
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
        editor.addMesh(createGeometrySource(square));
        const listener = jasmine.createSpy("meshRemoved");
        editor.meshRemoved.addEventListener(listener);

        scene.primitives.remove(editor);

        expect(listener).not.toHaveBeenCalled();
      });

      it("destroys every group, including the root", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const root = editor.root;
        const group = editor.addGroup();
        const innerGroup = editor.addGroup({ parent: group });

        scene.primitives.remove(editor);

        expect(root.isDestroyed()).toBe(true);
        expect(group.isDestroyed()).toBe(true);
        expect(innerGroup.isDestroyed()).toBe(true);
      });

      it("does not raise meshGroupChanged", async function () {
        const editor = await MeshEditor.addToScene(scene);
        editor.addMesh(createGeometrySource(square), {
          parent: editor.addGroup(),
        });
        const listener = jasmine.createSpy("meshGroupChanged");
        editor.meshGroupChanged.addEventListener(listener);

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

      it("stops handling pointer input", async function () {
        const editor = await MeshEditor.addToScene(scene);
        editor.setMeshActive(editor.addMesh(createGeometrySource(square)));
        editor.mode = EditMode.VERTEX;
        editor.activeTool = SelectTool.addTo(editor);
        scene.renderForSpecs();
        spyOn(WasmMeshEditor.prototype, "pointerDown").and.callThrough();
        spyOn(WasmMeshEditor.prototype, "pointerClick").and.callThrough();

        scene.primitives.remove(editor);
        click(getWindowPosition(facePosition));

        expect(WasmMeshEditor.prototype.pointerDown).not.toHaveBeenCalled();
        expect(WasmMeshEditor.prototype.pointerClick).not.toHaveBeenCalled();
      });
    });
  },
  "WebGL",
);
