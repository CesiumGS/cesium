import { Cartesian2, Cartesian3, Color, Matrix4 } from "@cesium/core";
import { SceneTransforms } from "@cesium/engine";
import { MeshEditor as WasmMeshEditor } from "@cesium/mesh-editor";
import {
  EditMode,
  MeshEditor,
  SelectTool,
  TranslateTool,
} from "../../index.js";
import createCanvas from "../../../../Specs/createCanvas.js";
import createScene from "../../../../Specs/createScene.js";
import DomEventSimulator from "../../../../Specs/DomEventSimulator.js";
import createGeometrySource, { square } from "../createGeometrySource.js";

describe(
  "Editor/MeshEditorInputHandler",
  function () {
    let scene;
    let editor;
    let mesh;

    // The square's corner, and a point inside one of its faces.
    const cornerPosition = [-1.0, -1.0, 0.0];
    const facePosition = [0.5, -0.5, 0.0];

    // Outside the square, near the canvas's corner.
    const emptyWindowPosition = new Cartesian2(5.0, 5.0);

    beforeAll(function () {
      scene = createScene({ canvas: createCanvas(256, 256) });
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(async function () {
      // Looks straight down at the square, which spans about half the canvas.
      const camera = scene.camera;
      camera.position = new Cartesian3(0.0, 0.0, 4.0);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
      camera.right = Cartesian3.clone(Cartesian3.UNIT_X);
      scene.backgroundColor = Color.WHITE;
      scene.screenSpaceCameraController.enableInputs = true;

      // An editor with an active square, rendered once so it's pickable.
      editor = await MeshEditor.addToScene(scene);
      mesh = editor.addMesh(createGeometrySource(square));
      editor.setMeshActive(mesh);
      editor.mode = EditMode.VERTEX;
      scene.renderForSpecs();
    });

    afterEach(function () {
      // Destroys the editor.
      scene.primitives.removeAll();
      for (const controller of scene.controllerHost.controllers) {
        scene.controllerHost.unregisterController(controller, scene.canvas);
      }
    });

    // Registers a stub controller with the scene's controller host.
    function addController(enabled = true) {
      const controller = {
        enabled,
        connectedCallback() {},
        disconnectedCallback() {},
        firstUpdate() {},
        update() {},
      };
      scene.controllerHost.registerController(controller, scene.canvas);
      return controller;
    }

    function getWindowPosition(position) {
      return SceneTransforms.worldToWindowCoordinates(
        scene,
        Cartesian3.fromArray(position),
      );
    }

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

    // Selects the square's corner, then makes a translate tool active, so a
    // press starts a drag.
    function prepareDrag() {
      editor.activeTool = SelectTool.addTo(editor);
      click(getWindowPosition(cornerPosition));
      editor.activeTool = TranslateTool.addTo(editor);
    }

    // The input of the most recent call to a spied wasm editor method. Rays
    // are reused between calls, so read them before the next event.
    function mostRecentInput(methodName) {
      return WasmMeshEditor.prototype[methodName].calls.mostRecent().args[0];
    }

    function expectRayThrough(ray, windowPosition) {
      const expected = scene.camera.getPickRay(windowPosition);
      expect(ray.origin).toEqualEpsilon(expected.origin, 1e-12);
      expect(ray.direction).toEqualEpsilon(expected.direction, 1e-12);
    }

    describe("press", function () {
      it("sends the ray and the active meshes' world matrices", function () {
        const inactiveMesh = editor.addMesh(createGeometrySource(square));
        Matrix4.fromTranslation(
          new Cartesian3(1.0, 2.0, 3.0),
          mesh.source.worldMatrix,
        );
        editor.activeTool = TranslateTool.addTo(editor);
        spyOn(WasmMeshEditor.prototype, "pointerDown").and.callThrough();
        const windowPosition = getWindowPosition(facePosition);

        firePointer("Down", windowPosition);

        const input = mostRecentInput("pointerDown");
        expectRayThrough(input.ray, windowPosition);
        expect(input.scene.viewDirection).toEqual(scene.camera.directionWC);
        expect(Array.from(input.scene.meshKeys)).toEqual([mesh._key]);
        expect(Array.from(input.scene.matrices)).toEqual(
          Matrix4.toArray(mesh.source.worldMatrix),
        );
        expect(Array.from(input.scene.meshKeys)).not.toContain(
          inactiveMesh._key,
        );
      });

      it("doesn't pick", function () {
        editor.activeTool = TranslateTool.addTo(editor);
        spyOn(WasmMeshEditor.prototype, "pointerDown").and.callThrough();
        spyOn(scene, "pick").and.callThrough();

        firePointer("Down", getWindowPosition(facePosition));

        expect("pick" in mostRecentInput("pointerDown")).toBe(false);
        expect(scene.pick).not.toHaveBeenCalled();
      });

      it("isn't sent without an active tool", function () {
        spyOn(WasmMeshEditor.prototype, "pointerDown").and.callThrough();

        firePointer("Down", getWindowPosition(facePosition));

        expect(WasmMeshEditor.prototype.pointerDown).not.toHaveBeenCalled();
      });

      it("stops the camera reacting to the pointer when a tool starts a drag", function () {
        prepareDrag();

        firePointer("Down", getWindowPosition(cornerPosition));

        // The WebGL stub doesn't pick, so nothing is selected to drag.
        if (!window.webglStub) {
          expect(scene.screenSpaceCameraController.enableInputs).toBe(false);
        }
      });

      it("leaves the camera alone when no tool handles the press", function () {
        // Nothing is selected, so the translate tool doesn't start a drag.
        editor.activeTool = TranslateTool.addTo(editor);
        const controller = addController();

        firePointer("Down", getWindowPosition(cornerPosition));

        expect(scene.screenSpaceCameraController.enableInputs).toBe(true);
        expect(controller.enabled).toBe(true);
      });

      it("disables the scene's controllers when a tool starts a drag", function () {
        const controllers = [addController(), addController()];
        prepareDrag();

        firePointer("Down", getWindowPosition(cornerPosition));

        // The WebGL stub doesn't pick, so nothing is selected to drag.
        if (!window.webglStub) {
          expect(controllers.map((c) => c.enabled)).toEqual([false, false]);
        }
      });
    });

    describe("move", function () {
      it("sends the ray", function () {
        editor.activeTool = TranslateTool.addTo(editor);
        spyOn(WasmMeshEditor.prototype, "pointerMove").and.callThrough();
        const windowPosition = getWindowPosition(facePosition);

        firePointer("Move", windowPosition);

        expectRayThrough(mostRecentInput("pointerMove").ray, windowPosition);
      });

      it("doesn't pick", function () {
        editor.activeTool = TranslateTool.addTo(editor);
        spyOn(WasmMeshEditor.prototype, "pointerMove").and.callThrough();
        spyOn(scene, "pick").and.callThrough();

        firePointer("Move", getWindowPosition(facePosition));

        expect("pick" in mostRecentInput("pointerMove")).toBe(false);
        expect(scene.pick).not.toHaveBeenCalled();
      });
    });

    describe("release", function () {
      it("sends the ray", function () {
        editor.activeTool = TranslateTool.addTo(editor);
        spyOn(WasmMeshEditor.prototype, "pointerUp").and.callThrough();
        const start = getWindowPosition(facePosition);
        const end = new Cartesian2(start.x + 20.0, start.y);

        firePointer("Down", start);
        firePointer("Up", end);

        expectRayThrough(mostRecentInput("pointerUp").ray, end);
      });

      it("lets the camera react to the pointer again after a drag", function () {
        prepareDrag();
        const start = getWindowPosition(cornerPosition);
        const end = new Cartesian2(start.x + 20.0, start.y);

        firePointer("Down", start);
        firePointer("Move", end);
        firePointer("Up", end);

        expect(scene.screenSpaceCameraController.enableInputs).toBe(true);
      });

      it("keeps the camera's previous enableInputs setting", function () {
        prepareDrag();
        scene.screenSpaceCameraController.enableInputs = false;
        const start = getWindowPosition(cornerPosition);
        const end = new Cartesian2(start.x + 20.0, start.y);

        firePointer("Down", start);
        firePointer("Move", end);
        firePointer("Up", end);

        expect(scene.screenSpaceCameraController.enableInputs).toBe(false);
      });

      it("restores each controller's previous enabled setting after a drag", function () {
        const enabledController = addController(true);
        const disabledController = addController(false);
        prepareDrag();
        const start = getWindowPosition(cornerPosition);
        const end = new Cartesian2(start.x + 20.0, start.y);

        firePointer("Down", start);
        firePointer("Move", end);
        firePointer("Up", end);

        expect(enabledController.enabled).toBe(true);
        expect(disabledController.enabled).toBe(false);
      });

      it("leaves no camera inertia after a short drag", function () {
        prepareDrag();
        const cameraPosition = Cartesian3.clone(scene.camera.positionWC);
        const cameraDirection = Cartesian3.clone(scene.camera.directionWC);
        const start = getWindowPosition(cornerPosition);
        const end = new Cartesian2(start.x + 40.0, start.y - 40.0);

        // Renders between events, like an app's render loop.
        firePointer("Down", start);
        scene.renderForSpecs();
        firePointer("Move", end);
        scene.renderForSpecs();
        firePointer("Up", end);
        for (let i = 0; i < 5; ++i) {
          scene.renderForSpecs();
        }

        expect(scene.camera.positionWC).toEqual(cameraPosition);
        expect(scene.camera.directionWC).toEqual(cameraDirection);
      });
    });

    describe("click", function () {
      beforeEach(function () {
        editor.activeTool = SelectTool.addTo(editor);
        spyOn(WasmMeshEditor.prototype, "pointerClick").and.callThrough();
      });

      it("sends a pick of a mesh component", function () {
        click(getWindowPosition(cornerPosition));

        // The WebGL stub doesn't pick, so like the renderer matchers, skip the check.
        if (!window.webglStub) {
          const { pick } = mostRecentInput("pointerClick");
          expect(pick.length).toBe(1);
          expect(pick[0].mesh).toBe(mesh._key);
          expect(Object.keys(pick[0].componentKeys)).toEqual(["verts"]);
          expect(pick[0].componentKeys.verts).toBeInstanceOf(BigUint64Array);
          expect(pick[0].componentKeys.verts.length).toBe(1);
        }
      });

      it("sends a miss for empty space", function () {
        click(emptyWindowPosition);

        expect(mostRecentInput("pointerClick").pick).toEqual([]);
      });

      it("sends a pick of a component the mode can't select", function () {
        click(getWindowPosition(facePosition));

        // The WebGL stub doesn't pick, so like the renderer matchers, skip the check.
        if (!window.webglStub) {
          const { pick } = mostRecentInput("pointerClick");
          expect(pick.length).toBe(1);
          expect(pick[0].mesh).toBe(mesh._key);
          expect(Object.keys(pick[0].componentKeys)).toEqual(["faces"]);
          expect(pick[0].componentKeys.faces.length).toBe(1);
        }
      });

      it("sends a pick of an inactive mesh", function () {
        editor.setMeshInactive(mesh);
        scene.renderForSpecs();

        click(getWindowPosition(facePosition));

        if (!window.webglStub) {
          expect(mostRecentInput("pointerClick").pick[0].mesh).toBe(mesh._key);
        }
      });

      it("sends the ray", function () {
        const windowPosition = getWindowPosition(facePosition);

        click(windowPosition);

        expectRayThrough(mostRecentInput("pointerClick").ray, windowPosition);
      });

      it("isn't sent without an active tool", function () {
        editor.activeTool = undefined;

        click(getWindowPosition(facePosition));

        expect(WasmMeshEditor.prototype.pointerClick).not.toHaveBeenCalled();
      });
    });

    describe("resolvePicks", function () {
      let tool;

      beforeEach(function () {
        tool = SelectTool.addTo(editor);
        editor.activeTool = tool;
        spyOn(WasmMeshEditor.prototype, "pointerClick").and.callThrough();
      });

      it("receives what the click picked, and the modifiers", function () {
        tool.resolvePicks = jasmine
          .createSpy("resolvePicks")
          .and.callFake((picks) => picks);

        click(getWindowPosition(cornerPosition), { shiftKey: true });

        expect(tool.resolvePicks).toHaveBeenCalledTimes(1);
        const [picks, modifiers] = tool.resolvePicks.calls.mostRecent().args;
        expect(modifiers).toEqual({ shift: true, control: false, alt: false });
        expect(Object.isFrozen(modifiers)).toBe(true);
        // The WebGL stub doesn't pick, so like the renderer matchers, skip the check.
        if (!window.webglStub) {
          expect(picks.length).toBe(1);
          expect(picks[0].mesh).toBe(mesh);
          expect(picks[0].componentKeys.verts.length).toBe(1);
          expect(mostRecentInput("pointerClick").pick[0].componentKeys).toEqual(
            picks[0].componentKeys,
          );
        }
      });

      it("receives an empty array for a miss", function () {
        tool.resolvePicks = jasmine
          .createSpy("resolvePicks")
          .and.callFake((picks) => picks);

        click(emptyWindowPosition);

        expect(tool.resolvePicks.calls.mostRecent().args[0]).toEqual([]);
        expect(mostRecentInput("pointerClick").pick).toEqual([]);
      });

      it("sends the returned picks", function () {
        const other = editor.addMesh(createGeometrySource(square));
        tool.resolvePicks = () => [
          { mesh, componentKeys: { verts: BigUint64Array.of(1n, 2n) } },
          { mesh: other, componentKeys: {} },
        ];

        click(emptyWindowPosition);

        expect(mostRecentInput("pointerClick").pick).toEqual([
          {
            mesh: mesh._key,
            componentKeys: { verts: BigUint64Array.of(1n, 2n) },
          },
          { mesh: other._key, componentKeys: {} },
        ]);
      });

      it("sends the picks unchanged by default", function () {
        click(emptyWindowPosition);

        expect(mostRecentInput("pointerClick").pick).toEqual([]);
        expect(tool.resolvePicks([], {})).toEqual([]);
      });

      it("drops the click if it returns undefined", function () {
        tool.resolvePicks = () => undefined;

        click(getWindowPosition(cornerPosition));

        expect(WasmMeshEditor.prototype.pointerClick).not.toHaveBeenCalled();
      });

      it("isn't called while another tool is active", function () {
        tool.resolvePicks = jasmine.createSpy("resolvePicks");
        editor.activeTool = TranslateTool.addTo(editor);

        click(getWindowPosition(cornerPosition));

        expect(tool.resolvePicks).not.toHaveBeenCalled();
      });

      it("throws if it returns a mesh from another editor", async function () {
        const otherEditor = await MeshEditor.addToScene(scene);
        const otherMesh = otherEditor.addMesh(createGeometrySource(square));
        tool.resolvePicks = () => [{ mesh: otherMesh, componentKeys: {} }];

        // Errors thrown by event listeners are reported globally.
        await jasmine.spyOnGlobalErrorsAsync(async function (globalErrorSpy) {
          click(emptyWindowPosition);

          expect(globalErrorSpy).toHaveBeenCalledWith(
            jasmine.objectContaining({
              message:
                "resolvePicks returned a mesh that isn't in this editor.",
            }),
          );
        });
        expect(WasmMeshEditor.prototype.pointerClick).not.toHaveBeenCalled();
      });
    });

    describe("modifiers", function () {
      beforeEach(function () {
        editor.activeTool = TranslateTool.addTo(editor);
        spyOn(WasmMeshEditor.prototype, "pointerDown").and.callThrough();
      });

      it("sends no modifiers when none are held", function () {
        firePointer("Down", getWindowPosition(facePosition));

        expect(mostRecentInput("pointerDown").modifiers).toEqual({
          shift: false,
          control: false,
          alt: false,
        });
      });

      it("sends each combination of shift, control and alt", function () {
        const windowPosition = getWindowPosition(facePosition);

        for (const shift of [false, true]) {
          for (const control of [false, true]) {
            for (const alt of [false, true]) {
              firePointer("Down", windowPosition, {
                shiftKey: shift,
                ctrlKey: control,
                altKey: alt,
              });
              firePointer("Up", windowPosition, {
                shiftKey: shift,
                ctrlKey: control,
                altKey: alt,
              });

              expect(mostRecentInput("pointerDown").modifiers).toEqual({
                shift,
                control,
                alt,
              });
            }
          }
        }
      });
    });

    describe("destroy", function () {
      it("lets the camera react to the pointer again", function () {
        const controller = addController();
        prepareDrag();
        firePointer("Down", getWindowPosition(cornerPosition));

        scene.primitives.remove(editor);

        expect(scene.screenSpaceCameraController.enableInputs).toBe(true);
        expect(controller.enabled).toBe(true);
      });
    });
  },
  "WebGL",
);
