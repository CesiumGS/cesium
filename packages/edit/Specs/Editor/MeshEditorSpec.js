import {
  AttributeType,
  Cartesian2,
  Cartesian3,
  Color,
  ComponentDatatype,
  Matrix3,
  Matrix4,
  OrientedBoundingBox,
  RuntimeError,
  defined,
} from "@cesium/core";
import {
  GeometryAttributeDescriptor,
  GeometryAttributeDomain,
  GeometryReader,
  SceneTransforms,
  StencilFunction,
  VertexAttributeSemantic,
} from "@cesium/engine";
import {
  AttributeDomain,
  ComponentType,
  CustomAttribute,
  Mesh as WasmMesh,
  MeshEditor as WasmMeshEditor,
} from "@cesium/mesh-editor";
import {
  ComparisonOperator,
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

    describe("attributes", function () {
      function createAttribute(options, values) {
        return { descriptor: new GeometryAttributeDescriptor(options), values };
      }

      function addSquare(editor, attributes) {
        return editor.addMesh(createGeometrySource({ ...square, attributes }));
      }

      function getAttribute(mesh, name) {
        return mesh
          .getAttributes()
          .find((attribute) => attribute.name === name);
      }

      it("lists positions and normals for a source without other attributes", async function () {
        const editor = await MeshEditor.addToScene(scene);

        const mesh = addSquare(editor, []);

        expect(mesh.getAttributes().map((attribute) => attribute.name)).toEqual(
          ["POSITION", "NORMAL"],
        );
        const position = getAttribute(mesh, "POSITION");
        expect(position.semantic).toBe(VertexAttributeSemantic.POSITION);
        expect(position.type).toBe(AttributeType.VEC3);
        expect(position.domain).toBe(GeometryAttributeDomain.VERTEX);
        expect(position.componentDatatype).toBe(ComponentDatatype.FLOAT);
      });

      it("loads custom attributes, storing integers as 32-bit integers", async function () {
        const editor = await MeshEditor.addToScene(scene);
        spyOn(CustomAttribute, "float32").and.callThrough();
        spyOn(CustomAttribute, "int32").and.callThrough();
        spyOn(CustomAttribute, "uint32").and.callThrough();

        const mesh = addSquare(editor, [
          createAttribute(
            {
              semantic: "_TEMPERATURE",
              type: AttributeType.SCALAR,
              componentDatatype: ComponentDatatype.FLOAT,
            },
            [0.5, 1.5, 2.5, 3.5],
          ),
          createAttribute(
            {
              semantic: "_ID",
              type: AttributeType.SCALAR,
              componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
            },
            [7, 7, 8, 9],
          ),
          createAttribute(
            {
              semantic: "_OFFSET",
              type: AttributeType.VEC2,
              componentDatatype: ComponentDatatype.SHORT,
            },
            [
              [1, -1],
              [2, -2],
              [3, -3],
              [4, -4],
            ],
          ),
        ]);

        expect(CustomAttribute.float32).toHaveBeenCalledOnceWith(
          "_TEMPERATURE",
          AttributeDomain.Vertex,
          1,
          new Float32Array([0.5, 1.5, 2.5, 3.5]),
        );
        expect(CustomAttribute.uint32).toHaveBeenCalledOnceWith(
          "_ID",
          AttributeDomain.Vertex,
          1,
          new Uint32Array([7, 7, 8, 9]),
        );
        expect(CustomAttribute.int32).toHaveBeenCalledOnceWith(
          "_OFFSET",
          AttributeDomain.Vertex,
          2,
          new Int32Array([1, -1, 2, -2, 3, -3, 4, -4]),
        );

        const id = getAttribute(mesh, "_ID");
        expect(id.type).toBe(AttributeType.SCALAR);
        expect(id.domain).toBe(GeometryAttributeDomain.VERTEX);
        expect(id.componentDatatype).toBe(ComponentDatatype.UNSIGNED_INT);
        const offset = getAttribute(mesh, "_OFFSET");
        expect(offset.type).toBe(AttributeType.VEC2);
        expect(offset.componentDatatype).toBe(ComponentDatatype.INT);
        expect(getAttribute(mesh, "_TEMPERATURE").componentDatatype).toBe(
          ComponentDatatype.FLOAT,
        );
      });

      it("loads built-in attributes by name, with their set index", async function () {
        const editor = await MeshEditor.addToScene(scene);
        spyOn(CustomAttribute, "float32").and.callThrough();

        const mesh = addSquare(editor, [
          createAttribute(
            {
              semantic: VertexAttributeSemantic.COLOR,
              setIndex: 1,
              componentDatatype: ComponentDatatype.FLOAT,
            },
            square.positions.map(() => [1, 0, 0, 1]),
          ),
        ]);

        expect(CustomAttribute.float32).toHaveBeenCalledOnceWith(
          "COLOR_1",
          AttributeDomain.Vertex,
          4,
          jasmine.any(Float32Array),
        );
        const color = getAttribute(mesh, "COLOR_1");
        expect(color.semantic).toBe(VertexAttributeSemantic.COLOR);
        expect(color.setIndex).toBe(1);
        expect(color.type).toBe(AttributeType.VEC4);

        spyOn(WasmMeshEditor.prototype, "meshAttributes").and.callThrough();
        const names = mesh.getAttributes().map((attribute) => attribute.name);
        const wasmNames = WasmMeshEditor.prototype.meshAttributes.calls
          .mostRecent()
          .returnValue.map((attribute) => attribute.name);
        expect(names).toEqual(wasmNames);
      });

      it("loads normals and the first texture coordinates as buffers", async function () {
        const editor = await MeshEditor.addToScene(scene);
        spyOn(WasmMesh, "fromBuffers").and.callThrough();
        spyOn(CustomAttribute, "float32").and.callThrough();

        const mesh = addSquare(editor, [
          createAttribute(
            {
              semantic: VertexAttributeSemantic.NORMAL,
              componentDatatype: ComponentDatatype.FLOAT,
            },
            square.positions.map(() => [0, 0, 1]),
          ),
          createAttribute(
            {
              semantic: VertexAttributeSemantic.TEXCOORD,
              componentDatatype: ComponentDatatype.FLOAT,
            },
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
            ],
          ),
        ]);

        const [, , normals, uvs] = WasmMesh.fromBuffers.calls.mostRecent().args;
        expect(normals).toEqual(
          new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
        );
        expect(uvs).toEqual(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]));
        expect(CustomAttribute.float32).not.toHaveBeenCalled();
        expect(mesh.getAttributes().map((attribute) => attribute.name)).toEqual(
          ["POSITION", "NORMAL", "TEXCOORD_0"],
        );
      });

      it("loads per-corner attributes in the order of the primitives' corners", async function () {
        const editor = await MeshEditor.addToScene(scene);
        spyOn(CustomAttribute, "uint32").and.callThrough();

        const mesh = addSquare(editor, [
          createAttribute(
            {
              semantic: "_CORNER_ID",
              type: AttributeType.SCALAR,
              domain: GeometryAttributeDomain.CORNER,
              componentDatatype: ComponentDatatype.UNSIGNED_INT,
            },
            [
              [10, 11, 12],
              [20, 21, 22],
            ],
          ),
        ]);

        expect(CustomAttribute.uint32).toHaveBeenCalledOnceWith(
          "_CORNER_ID",
          AttributeDomain.Corner,
          1,
          new Uint32Array([10, 11, 12, 20, 21, 22]),
        );
        expect(getAttribute(mesh, "_CORNER_ID").domain).toBe(
          GeometryAttributeDomain.CORNER,
        );
      });

      it("skips attributes it can't store, with a warning", async function () {
        const editor = await MeshEditor.addToScene(scene);
        spyOn(console, "warn");

        const mesh = addSquare(editor, [
          createAttribute(
            {
              semantic: "_SKIPPED_DOUBLE",
              type: AttributeType.SCALAR,
              componentDatatype: ComponentDatatype.DOUBLE,
            },
            [1, 2, 3, 4],
          ),
          createAttribute(
            {
              semantic: "_SKIPPED_MATRIX",
              type: AttributeType.MAT2,
              componentDatatype: ComponentDatatype.FLOAT,
            },
            square.positions.map(() => [1, 0, 0, 1]),
          ),
          createAttribute(
            {
              semantic: "_SKIPPED_UNKNOWN_DATATYPE",
              type: AttributeType.SCALAR,
            },
            [1, 2, 3, 4],
          ),
          createAttribute(
            {
              semantic: VertexAttributeSemantic.NORMAL,
              domain: GeometryAttributeDomain.CORNER,
              componentDatatype: ComponentDatatype.FLOAT,
            },
            square.primitives.map((primitive) =>
              primitive.map(() => [0, 0, 1]),
            ),
          ),
        ]);

        expect(mesh.getAttributes().map((attribute) => attribute.name)).toEqual(
          ["POSITION", "NORMAL"],
        );
        const warnings = console.warn.calls.allArgs().flat().join("\n");
        expect(warnings).toContain(
          "skipped attribute _SKIPPED_DOUBLE: expected component datatype FLOAT or an integer of 32 bits or fewer, but got DOUBLE",
        );
        expect(warnings).toContain(
          "skipped attribute _SKIPPED_MATRIX: expected type SCALAR, VEC2, VEC3 or VEC4, but got MAT2",
        );
        expect(warnings).toContain(
          "skipped attribute _SKIPPED_UNKNOWN_DATATYPE: expected component datatype FLOAT or an integer of 32 bits or fewer, but got none",
        );
        expect(warnings).toContain(
          "skipped attribute NORMAL: expected domain VERTEX, but got CORNER",
        );
      });

      it("throws a RuntimeError if positions aren't per vertex", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createGeometrySource(square);
        source.geometryReader = new GeometryReader({
          availableAttributes: [
            new GeometryAttributeDescriptor({
              semantic: VertexAttributeSemantic.POSITION,
              domain: GeometryAttributeDomain.CORNER,
            }),
          ],
          createReadSession: jasmine.createSpy("createReadSession"),
        });

        expect(() => editor.addMesh(source)).toThrowError(RuntimeError);
      });

      it("throws a RuntimeError without positions", async function () {
        const editor = await MeshEditor.addToScene(scene);
        const source = createGeometrySource(square);
        source.geometryReader = new GeometryReader({
          availableAttributes: [],
          createReadSession: jasmine.createSpy("createReadSession"),
        });

        expect(() => editor.addMesh(source)).toThrowError(RuntimeError);
      });
    });

    // A square whose vertices have IDs 7, 7, 8 and 9, and 2D offsets.
    async function addSquareWithAttributes() {
      const editor = await MeshEditor.addToScene(scene);
      const id = new GeometryAttributeDescriptor({
        semantic: "_ID",
        type: AttributeType.SCALAR,
        componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
      });
      const offset = new GeometryAttributeDescriptor({
        semantic: "_OFFSET",
        type: AttributeType.VEC2,
        componentDatatype: ComponentDatatype.SHORT,
      });
      const mesh = editor.addMesh(
        createGeometrySource({
          ...square,
          attributes: [
            { descriptor: id, values: [7, 7, 8, 9] },
            {
              descriptor: offset,
              values: [
                [1, -1],
                [2, -2],
                [3, -3],
                [4, -4],
              ],
            },
          ],
        }),
      );
      return { editor, mesh };
    }

    describe("attribute queries", function () {
      const [corner0, corner1, corner2] = square.positions;

      function getValues(mesh, keys, name) {
        return Array.from(keys, (key) =>
          mesh.getVertexAttributeValue(key, name),
        );
      }

      it("queries vertices by a scalar attribute, on an inactive mesh", async function () {
        const { editor, mesh } = await addSquareWithAttributes();
        expect(editor.isMeshActive(mesh)).toBe(false);

        const equal = mesh.queryVerticesByAttribute(
          "_ID",
          ComparisonOperator.EQUAL,
          7,
        );
        expect(equal).toBeInstanceOf(BigUint64Array);
        expect(getValues(mesh, equal, "_ID")).toEqual([7, 7]);

        const greater = mesh.queryVerticesByAttribute(
          "_ID",
          ComparisonOperator.GREATER,
          7,
        );
        expect(getValues(mesh, greater, "_ID").sort()).toEqual([8, 9]);

        expect(
          mesh.queryVerticesByAttribute("_ID", ComparisonOperator.EQUAL, 1)
            .length,
        ).toBe(0);
      });

      it("queries vertices by a vector attribute", async function () {
        const { mesh } = await addSquareWithAttributes();

        const keys = mesh.queryVerticesByAttribute(
          "_OFFSET",
          ComparisonOperator.EQUAL,
          [2, -2],
        );

        expect(getValues(mesh, keys, "_OFFSET")).toEqual([[2, -2]]);
      });

      it("gets undefined for an unknown vertex or attribute", async function () {
        const { mesh } = await addSquareWithAttributes();
        const [key] = mesh.queryVerticesByAttribute(
          "_ID",
          ComparisonOperator.EQUAL,
          8,
        );

        expect(mesh.getVertexAttributeValue(key, "_UNKNOWN")).toBeUndefined();
        expect(mesh.getVertexAttributeValue(123456n, "_ID")).toBeUndefined();
      });

      it("throws for an unknown attribute, a value of the wrong type, or an unsupported comparison", async function () {
        const { mesh } = await addSquareWithAttributes();
        const { EQUAL, LESS } = ComparisonOperator;

        for (const method of [
          "queryVerticesByAttribute",
          "selectVerticesByAttribute",
        ]) {
          expect(() => mesh[method]("_UNKNOWN", EQUAL, 7))
            .withContext(method)
            .toThrowDeveloperError();
          expect(() => mesh[method]("_ID", EQUAL, 1.5))
            .withContext(method)
            .toThrowDeveloperError();
          expect(() => mesh[method]("_OFFSET", EQUAL, 2))
            .withContext(method)
            .toThrowDeveloperError();
          expect(() => mesh[method]("_OFFSET", LESS, [2, -2]))
            .withContext(method)
            .toThrowDeveloperError();
        }
      });

      it("selects matching vertices, adding to the selection", async function () {
        const { editor, mesh } = await addSquareWithAttributes();
        editor.setMeshActive(mesh);
        editor.mode = EditMode.VERTEX;

        mesh.selectVerticesByAttribute("_ID", ComparisonOperator.EQUAL, 8);
        mesh.selectVerticesByAttribute("_ID", ComparisonOperator.EQUAL, 7);

        expectPixel(corner0, selectedPointColor);
        expectPixel(corner1, selectedPointColor);
        expectPixel(corner2, selectedPointColor);
        expectPixel(square.positions[3], pointColor);
      });

      it("selects nothing unless vertices are selectable", async function () {
        const { editor, mesh } = await addSquareWithAttributes();
        editor.setMeshActive(mesh);
        editor.mode = EditMode.FACE;

        mesh.selectVerticesByAttribute("_ID", ComparisonOperator.EQUAL, 7);
        editor.mode = EditMode.VERTEX;

        expectPixel(corner0, pointColor);
      });

      it("throws when selecting on an inactive mesh", async function () {
        const { editor, mesh } = await addSquareWithAttributes();
        editor.mode = EditMode.VERTEX;

        expect(() =>
          mesh.selectVerticesByAttribute("_ID", ComparisonOperator.EQUAL, 7),
        ).toThrowDeveloperError();
      });
    });

    describe("hiding", function () {
      const [corner0, corner1, corner2, corner3] = square.positions;
      const { EQUAL } = ComparisonOperator;
      const backgroundColor = [255, 255, 255, 255];
      // Inside the face that uses corner3 but not corner1.
      const otherFacePosition = [-0.5, 0.5, 0.0];

      // Checks the pixel beside a corner, outside the square, where only the
      // corner's vertex is drawn.
      function expectVertex(corner, color) {
        expectPixel(corner, color, corner[0] < 0.0 ? -2 : 2);
      }

      async function addActiveSquare(mode) {
        const result = await addSquareWithAttributes();
        // Large enough that expectVertex's pixel is well inside the vertex.
        result.editor.style.pointSize = 12.0;
        result.editor.setMeshActive(result.mesh);
        result.editor.mode = mode;
        return result;
      }

      function queryId(mesh, id) {
        return mesh.queryVerticesByAttribute("_ID", EQUAL, id);
      }

      it("hides and shows components", async function () {
        const { mesh } = await addActiveSquare(EditMode.VERTEX);
        const verts = queryId(mesh, 7);

        mesh.hideComponents({ verts });
        expectVertex(corner0, backgroundColor);
        expectVertex(corner1, backgroundColor);
        expectVertex(corner2, pointColor);

        mesh.showComponents({ verts });
        expectVertex(corner0, pointColor);
        expectVertex(corner1, pointColor);
      });

      it("deselects the components it hides", async function () {
        const { mesh } = await addActiveSquare(EditMode.VERTEX);
        mesh.selectVerticesByAttribute("_ID", EQUAL, 7);
        expectVertex(corner0, selectedPointColor);

        mesh.hideComponents({ verts: queryId(mesh, 7) });
        mesh.showAllComponents();

        expectVertex(corner0, pointColor);
      });

      it("hides and deselects the selection", async function () {
        const { mesh } = await addActiveSquare(EditMode.VERTEX);
        mesh.selectVerticesByAttribute("_ID", EQUAL, 7);

        mesh.hideSelected();
        expectVertex(corner0, backgroundColor);
        expectVertex(corner1, backgroundColor);
        expectVertex(corner3, pointColor);

        mesh.showAllComponents();
        expectVertex(corner0, pointColor);
        expectVertex(corner1, pointColor);
      });

      it("hides, deselects and shows vertices by attribute", async function () {
        const { mesh } = await addActiveSquare(EditMode.VERTEX);
        mesh.selectVerticesByAttribute("_ID", EQUAL, 7);

        mesh.hideVerticesByAttribute("_ID", EQUAL, 7);
        expectVertex(corner0, backgroundColor);
        expectVertex(corner2, pointColor);

        mesh.showVerticesByAttribute("_ID", EQUAL, 7);
        expectVertex(corner0, pointColor);
      });

      it("ignores components of types the edit mode excludes", async function () {
        const { editor, mesh } = await addActiveSquare(EditMode.FACE);

        mesh.hideComponents({ verts: queryId(mesh, 7) });
        editor.mode = EditMode.VERTEX;

        expectVertex(corner0, pointColor);
      });

      it("extends to connected faces", async function () {
        const { mesh } = await addActiveSquare(EditMode.VERTEX);
        const options = { extendToConnectedFaces: true };

        mesh.hideVerticesByAttribute("_ID", EQUAL, 9, options);
        scene.renderForSpecs();
        expect(scene).toPickAndCall((result) => {
          expect(result).toBeUndefined();
        }, getWindowPosition(otherFacePosition));
        expect(scene).toPickAndCall((result) => {
          expect(result.primitive).toBe(mesh);
        }, getWindowPosition(facePosition));

        mesh.showVerticesByAttribute("_ID", EQUAL, 9, options);
        scene.renderForSpecs();
        expect(scene).toPickAndCall((result) => {
          expect(result.primitive).toBe(mesh);
        }, getWindowPosition(otherFacePosition));
      });

      it("throws for an inactive mesh", async function () {
        const { mesh } = await addSquareWithAttributes();
        const verts = queryId(mesh, 7);

        expect(() => mesh.hideComponents({ verts })).toThrowDeveloperError();
        expect(() => mesh.showComponents({ verts })).toThrowDeveloperError();
        expect(() => mesh.hideSelected()).toThrowDeveloperError();
        expect(() => mesh.showAllComponents()).toThrowDeveloperError();
        expect(() =>
          mesh.hideVerticesByAttribute("_ID", EQUAL, 7),
        ).toThrowDeveloperError();
        expect(() =>
          mesh.showVerticesByAttribute("_ID", EQUAL, 7),
        ).toThrowDeveloperError();
      });
    });

    describe("resolvePicks", function () {
      it("lets a select tool select every vertex with the clicked vertex's ID", async function () {
        const { editor, mesh } = await addSquareWithAttributes();
        editor.setMeshActive(mesh);
        editor.mode = EditMode.VERTEX;
        const tool = SelectTool.addTo(editor);
        tool.resolvePicks = function (picks) {
          return picks.map(({ mesh, componentKeys }) => {
            const vertexKey = componentKeys.verts?.[0];
            const id = defined(vertexKey)
              ? mesh.getVertexAttributeValue(vertexKey, "_ID")
              : undefined;
            if (!defined(id)) {
              return { mesh, componentKeys };
            }
            const verts = mesh.queryVerticesByAttribute(
              "_ID",
              ComparisonOperator.EQUAL,
              id,
            );
            return { mesh, componentKeys: { verts } };
          });
        };
        editor.activeTool = tool;
        scene.renderForSpecs();

        const [corner0, corner1, corner2, corner3] = square.positions;
        click(getWindowPosition(corner0));

        expectPixel(corner0, selectedPointColor);
        expectPixel(corner1, selectedPointColor);
        expectPixel(corner2, pointColor);
        expectPixel(corner3, pointColor);
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

      describe("meshActiveChanged", function () {
        async function createEditorWithListener() {
          const editor = await MeshEditor.addToScene(scene);
          const mesh = editor.addMesh(createGeometrySource(square));
          scene.renderForSpecs();
          const listener = jasmine.createSpy("meshActiveChanged");
          editor.meshActiveChanged.addEventListener(listener);
          return { editor, mesh, listener };
        }

        it("is raised on the next frame when a mesh becomes active", async function () {
          const { editor, mesh, listener } = await createEditorWithListener();

          editor.setMeshActive(mesh);
          expect(listener).not.toHaveBeenCalled();
          scene.renderForSpecs();

          expect(listener).toHaveBeenCalledOnceWith(mesh, true);
        });

        it("is raised on the next frame when a mesh becomes inactive", async function () {
          const { editor, mesh, listener } = await createEditorWithListener();
          editor.setMeshActive(mesh);
          scene.renderForSpecs();
          listener.calls.reset();

          editor.setMeshInactive(mesh);
          expect(listener).not.toHaveBeenCalled();
          scene.renderForSpecs();

          expect(listener).toHaveBeenCalledOnceWith(mesh, false);
        });

        it("is raised once per change", async function () {
          const { editor, mesh, listener } = await createEditorWithListener();

          editor.setMeshActive(mesh);
          editor.setMeshActive(mesh);
          scene.renderForSpecs();
          scene.renderForSpecs();

          expect(listener).toHaveBeenCalledOnceWith(mesh, true);
        });

        it("is not raised for a mesh set to the state it's already in", async function () {
          const { editor, mesh, listener } = await createEditorWithListener();

          editor.setMeshInactive(mesh);
          scene.renderForSpecs();

          expect(listener).not.toHaveBeenCalled();
        });

        it("is not raised for a change undone before the next frame", async function () {
          const { editor, mesh, listener } = await createEditorWithListener();

          editor.setMeshActive(mesh);
          editor.setMeshInactive(mesh);
          scene.renderForSpecs();

          expect(listener).not.toHaveBeenCalled();
        });

        it("is not raised for a removed mesh", async function () {
          const { editor, mesh, listener } = await createEditorWithListener();
          editor.setMeshActive(mesh);
          scene.renderForSpecs();
          listener.calls.reset();

          editor.removeMesh(mesh);
          scene.renderForSpecs();

          expect(listener).not.toHaveBeenCalled();
        });

        it("is raised after every changed mesh is synced", async function () {
          const { editor, mesh, listener } = await createEditorWithListener();
          const other = editor.addMesh(createGeometrySource(square));
          editor.setMeshActive(mesh);
          editor.setMeshActive(other);
          const setShownComponents = spyOn(
            other._renderer,
            "setShownComponents",
          ).and.callThrough();
          listener.and.callFake(() => {
            expect(setShownComponents).toHaveBeenCalled();
          });

          scene.renderForSpecs();

          expect(listener.calls.allArgs()).toEqual([
            [mesh, true],
            [other, true],
          ]);
        });

        it("keeps a listener's changes to meshes in the same frame", async function () {
          const { editor, mesh, listener } = await createEditorWithListener();
          const other = editor.addMesh(createGeometrySource(square));
          listener.and.callFake((changedMesh) => {
            if (changedMesh === mesh) {
              editor.setMeshInactive(other);
            }
          });

          editor.setMeshActive(mesh);
          editor.setMeshActive(other);
          scene.renderForSpecs();

          expect(editor.isMeshActive(other)).toBe(false);
          expect(listener.calls.allArgs()).toEqual([
            [mesh, true],
            [other, true],
          ]);

          listener.calls.reset();
          scene.renderForSpecs();

          expect(listener).toHaveBeenCalledOnceWith(other, false);
        });

        it("is not raised for a mesh a listener removed", async function () {
          const { editor, mesh, listener } = await createEditorWithListener();
          const other = editor.addMesh(createGeometrySource(square));
          listener.and.callFake((changedMesh) => {
            if (changedMesh === mesh) {
              editor.removeMesh(other);
            }
          });

          editor.setMeshActive(mesh);
          editor.setMeshActive(other);
          scene.renderForSpecs();

          expect(listener).toHaveBeenCalledOnceWith(mesh, true);
        });
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

      // In EditMode.NONE, active and inactive meshes draw and pick the same
      // components, so these spy on the masks rather than render.
      let faceMask;
      beforeAll(function () {
        faceMask = 1 << ComponentType.Face;
      });

      it("applies the mode's components to a mesh the select tool activates", async function () {
        const { editor, mesh } = await createEditorWithSquare(EditMode.NONE);
        editor.activeTool = SelectTool.addTo(editor);
        editor.setMeshInactive(mesh);
        scene.renderForSpecs();
        const setShownComponents = spyOn(
          mesh._renderer,
          "setShownComponents",
        ).and.callThrough();

        click(getWindowPosition(facePosition));
        expect(setShownComponents).not.toHaveBeenCalled();
        scene.renderForSpecs();

        if (!window.webglStub) {
          expect(setShownComponents).toHaveBeenCalledOnceWith(faceMask);
        }
      });

      it("applies the inactive components to meshes the select tool deactivates", async function () {
        const { editor, mesh } = await createEditorWithSquare(EditMode.NONE);
        editor.activeTool = SelectTool.addTo(editor);
        const setShownComponents = spyOn(
          mesh._renderer,
          "setShownComponents",
        ).and.callThrough();
        const setPickableComponents = spyOn(
          mesh._renderer,
          "setPickableComponents",
        ).and.callThrough();

        click(emptyWindowPosition);
        scene.renderForSpecs();

        expect(setShownComponents).toHaveBeenCalledOnceWith(faceMask);
        expect(setPickableComponents).toHaveBeenCalledOnceWith(faceMask);
      });

      it("outlines a mesh the select tool activates in EditMode.NONE on the next frame", async function () {
        const { editor, mesh } = await createEditorWithSquare(EditMode.NONE);
        editor.activeTool = SelectTool.addTo(editor);
        editor.setMeshInactive(mesh);
        expect(renderOutlineFlags(mesh)).toEqual([false]);

        click(getWindowPosition(facePosition));

        if (!window.webglStub) {
          // Faces, then the outline's edges and points.
          expect(renderOutlineFlags(mesh)).toEqual([false, true, true]);
        }
      });

      it("removes the outline of meshes the select tool deactivates in EditMode.NONE on the next frame", async function () {
        const { editor, mesh } = await createEditorWithSquare(EditMode.NONE);
        editor.activeTool = SelectTool.addTo(editor);
        expect(renderOutlineFlags(mesh)).toEqual([false, true, true]);

        click(emptyWindowPosition);

        expect(renderOutlineFlags(mesh)).toEqual([false]);
      });

      it("raises meshActiveChanged for meshes the select tool deactivates", async function () {
        const { editor, mesh } = await createEditorWithSquare(EditMode.NONE);
        editor.activeTool = SelectTool.addTo(editor);
        const listener = jasmine.createSpy("meshActiveChanged");
        editor.meshActiveChanged.addEventListener(listener);

        click(emptyWindowPosition);
        expect(listener).not.toHaveBeenCalled();
        scene.renderForSpecs();

        expect(listener).toHaveBeenCalledOnceWith(mesh, false);
      });

      it("raises meshActiveChanged for a mesh the select tool activates", async function () {
        const { editor, mesh } = await createEditorWithSquare(EditMode.NONE);
        editor.activeTool = SelectTool.addTo(editor);
        editor.setMeshInactive(mesh);
        scene.renderForSpecs();
        const listener = jasmine.createSpy("meshActiveChanged");
        editor.meshActiveChanged.addEventListener(listener);

        click(getWindowPosition(facePosition));
        scene.renderForSpecs();

        if (!window.webglStub) {
          expect(listener).toHaveBeenCalledOnceWith(mesh, true);
        }
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
