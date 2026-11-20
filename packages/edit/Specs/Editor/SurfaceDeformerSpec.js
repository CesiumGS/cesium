import {
  AxisAlignedBoundingBox,
  Cartesian3,
  Color,
  Matrix3,
  Matrix4,
} from "@cesium/core";
import {
  Deformable,
  GeometryAttributeDescriptor,
  Model,
  VertexAttributeSemantic,
} from "@cesium/engine";
import { MeshEditor, SurfaceDeformer } from "../../index.js";
import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";
import createGeometrySource, { square } from "../createGeometrySource.js";

describe(
  "Editor/SurfaceDeformer",
  function () {
    let scene;
    let editor;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(async function () {
      editor = await MeshEditor.addToScene(scene);
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    function addCage(worldMatrix = Matrix4.IDENTITY) {
      const source = createGeometrySource(square);
      Matrix4.clone(worldMatrix, source.worldMatrix);
      return editor.addMesh(source);
    }

    // A deformable that records the bindings added to it.
    function createDeformable(positions, worldMatrix = Matrix4.IDENTITY) {
      const deformable = createGeometrySource({ positions, primitives: [] });
      Matrix4.clone(worldMatrix, deformable.worldMatrix);
      deformable[Deformable.symbol] = true;
      deformable.bindings = new Set();
      deformable.addDeformerBinding = (binding) =>
        deformable.bindings.add(binding);
      deformable.removeDeformerBinding = (binding) =>
        deformable.bindings.delete(binding);
      return deformable;
    }

    function getBinding(deformable) {
      expect(deformable.bindings.size).toBe(1);
      return deformable.bindings.values().next().value;
    }

    async function loadModelPrimitive() {
      const model = scene.primitives.add(
        await Model.fromGltfAsync({
          url: "./Data/Models/glTF-2.0/BoxTextured/glTF-Binary/BoxTextured.glb",
        }),
      );
      await pollToPromise(function () {
        scene.renderForSpecs();
        return model.ready;
      });
      return model.nodes.flatMap((node) => node.primitives)[0];
    }

    const position = new GeometryAttributeDescriptor({
      semantic: VertexAttributeSemantic.POSITION,
    });

    function readPositions(primitive) {
      return primitive.geometryReader.withReadSession(
        { attributes: [position] },
        (session) => {
          const read = session.vertexAttributeReader(position);
          const positions = [];
          for (let i = 0; i < session.vertexCount(); ++i) {
            positions.push(Cartesian3.fromArray(read(i, [])));
          }
          return positions;
        },
      );
    }

    // Moves the mesh a binding deforms with, as rendered, without editing it.
    function moveMesh(binding, offset) {
      const { positionTexture } = binding;
      const positions = positionTexture.read();
      for (let i = 0; i < positions.length; i += 4) {
        positions[i] += offset.x;
        positions[i + 1] += offset.y;
        positions[i + 2] += offset.z;
      }
      positionTexture.upload(scene.context, positions);
    }

    it("binds on the next render pass", function () {
      const deformer = SurfaceDeformer.fromMesh(addCage());
      const deformable = createDeformable([[0.5, -0.5, 1.0]]);

      deformer.bind(deformable);
      expect(deformable.bindings.size).toBe(0);

      scene.renderForSpecs();
      expect(getBinding(deformable).vertexBuffer).toBeDefined();
    });

    it("binds each vertex to the frame of its closest triangle", function () {
      const cage = addCage();
      const deformer = SurfaceDeformer.fromMesh(cage);
      const positions = [
        [0.5, -0.5, 1.0],
        [-0.5, 0.5, -2.0],
        [3.0, 0.0, 0.5],
      ];
      const deformable = createDeformable(positions);
      const bindSurfaceDeformer = spyOn(
        cage._wasmEditor,
        "bindSurfaceDeformer",
      ).and.callThrough();

      deformer.bind(deformable);
      scene.renderForSpecs();

      const data = bindSurfaceDeformer.calls.mostRecent().args[3];
      const vertex = (index) => Cartesian3.fromArray(square.positions[index]);
      positions.forEach((position, i) => {
        const [i0, i1, i2, a, b, c] = data.slice(i * 6, i * 6 + 6);
        const p0 = vertex(i0);
        const e1 = Cartesian3.subtract(vertex(i1), p0, new Cartesian3());
        const e2 = Cartesian3.subtract(vertex(i2), p0, new Cartesian3());
        const normal = Cartesian3.normalize(
          Cartesian3.cross(e1, e2, new Cartesian3()),
          new Cartesian3(),
        );

        const result = Cartesian3.clone(p0);
        Cartesian3.add(result, Cartesian3.multiplyByScalar(e1, a, e1), result);
        Cartesian3.add(result, Cartesian3.multiplyByScalar(e2, b, e2), result);
        Cartesian3.add(
          result,
          Cartesian3.multiplyByScalar(normal, c, normal),
          result,
        );
        expect(result).toEqualEpsilon(Cartesian3.fromArray(position), 1e-6);
      });
    });

    it("maps the mesh's local space to the deformable's", function () {
      const cageWorld = Matrix4.fromTranslation(new Cartesian3(10.0, 0.0, 0.0));
      const deformableWorld = Matrix4.fromTranslation(
        new Cartesian3(0.0, 5.0, 0.0),
      );
      const deformer = SurfaceDeformer.fromMesh(addCage(cageWorld));
      const deformable = createDeformable([[0.0, 0.0, 0.0]], deformableWorld);

      deformer.bind(deformable);
      scene.renderForSpecs();

      const bindMatrix = getBinding(deformable).uniforms.bindMatrix.value();
      expect(bindMatrix).toEqualEpsilon(
        Matrix4.fromTranslation(new Cartesian3(10.0, -5.0, 0.0)),
        1e-12,
      );
    });

    it("bounds deformables by the mesh's bounds", function () {
      const cage = addCage();
      const deformer = SurfaceDeformer.fromMesh(cage);
      const deformable = createDeformable([[0.5, -0.5, 1.0]]);
      deformer.bind(deformable);
      scene.renderForSpecs();

      const binding = getBinding(deformable);
      const box = binding.computeDeformedBoundingBox(
        new AxisAlignedBoundingBox(),
      );
      expect(box).toBeDefined();
      // The box contains the square and the deformable's vertex.
      expect(box.minimum.x).toBeLessThanOrEqual(-1.0);
      expect(box.maximum.x).toBeGreaterThanOrEqual(1.0);
      expect(box.maximum.z).toBeGreaterThanOrEqual(1.0);

      const listener = jasmine.createSpy("listener");
      binding.deformedBoundingBoxChanged.addEventListener(listener);
      cage._geometryChanged.raiseEvent();
      expect(listener).toHaveBeenCalled();
    });

    it("copies the mesh's positions when binding, until unbound", function () {
      const deformer = SurfaceDeformer.fromMesh(addCage());
      const deformable = createDeformable([[0.5, -0.5, 1.0]]);
      deformer.bind(deformable);
      scene.renderForSpecs();

      const { positions, restPositions } = getBinding(deformable).uniforms;
      const restTexture = restPositions.value();
      expect(restTexture).toBeDefined();
      expect(restTexture).not.toBe(positions.value());
      expect(restTexture.width * restTexture.height).toBeGreaterThanOrEqual(
        square.positions.length,
      );

      deformer.unbind(deformable);
      expect(restTexture.isDestroyed()).toBe(true);
    });

    it("unbinds every deformable when the mesh's topology changes, until rebound", function () {
      const cage = addCage();
      const deformer = SurfaceDeformer.fromMesh(cage);
      const deformable = createDeformable([[0.5, -0.5, 1.0]]);
      deformer.bind(deformable);
      scene.renderForSpecs();
      expect(deformable.bindings.size).toBe(1);

      // The wasm API has no topology edits yet, so simulate one.
      cage._topologyChanged.raiseEvent();
      expect(deformable.bindings.size).toBe(0);
      expect(deformer.needsRebind).toBe(true);

      deformer.rebind();
      scene.renderForSpecs();
      expect(deformable.bindings.size).toBe(1);
    });

    it("stops listening to its mesh when destroyed", function () {
      const cage = addCage();
      const deformer = SurfaceDeformer.fromMesh(cage);

      deformer.destroy();
      expect(cage._topologyChanged.numberOfListeners).toBe(0);
      expect(cage._afterUpdate.numberOfListeners).toBe(0);
      expect(cage._geometryChanged.numberOfListeners).toBe(0);
      expect(cage._destroyed.numberOfListeners).toBe(0);
    });

    it("is destroyed with its mesh", function () {
      const cage = addCage();
      const deformer = SurfaceDeformer.fromMesh(cage);
      const deformable = createDeformable([[0.5, -0.5, 1.0]]);
      deformer.bind(deformable);
      scene.renderForSpecs();

      editor.removeMesh(cage);
      expect(deformer.isDestroyed()).toBe(true);
      expect(deformable.bindings.size).toBe(0);
    });

    it("keeps a model's rest shape when bound", async function () {
      if (window.webglStub) {
        return;
      }

      const camera = scene.camera;
      camera.position = new Cartesian3(0.0, 0.0, 4.0);
      camera.direction = Cartesian3.negate(Cartesian3.UNIT_Z, new Cartesian3());
      camera.up = Cartesian3.clone(Cartesian3.UNIT_Y);
      camera.right = Cartesian3.clone(Cartesian3.UNIT_X);
      scene.backgroundColor = Color.BLACK;

      const primitive = await loadModelPrimitive();
      const cage = addCage();
      cage.show = false;

      let rest;
      expect(scene).toRenderAndCall(function (rgba) {
        rest = rgba;
      });
      expect(rest).not.toEqual([0, 0, 0, 255]);

      SurfaceDeformer.fromMesh(cage).bind(primitive);
      scene.renderForSpecs();
      expect(primitive._runtimePrimitive.deformerBindings.size).toBe(1);

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba).toEqualEpsilon(rest, 2);
      });
    });

    it("bakes the mesh's movement into a model's positions", async function () {
      if (window.webglStub) {
        return;
      }

      const primitive = await loadModelPrimitive();
      const deformer = SurfaceDeformer.fromMesh(addCage());
      deformer.bind(primitive);
      scene.renderForSpecs();
      const rest = readPositions(primitive);

      moveMesh([...primitive.deformerBindings][0], Cartesian3.UNIT_Z);
      deformer.bake(primitive);

      // The mesh's movement, in the model's space.
      const offset = Matrix3.multiplyByVector(
        Matrix3.inverse(
          Matrix4.getMatrix3(primitive.worldMatrix, new Matrix3()),
          new Matrix3(),
        ),
        Cartesian3.UNIT_Z,
        new Cartesian3(),
      );
      const baked = readPositions(primitive);
      for (let i = 0; i < rest.length; ++i) {
        expect(baked[i]).toEqualEpsilon(
          Cartesian3.add(rest[i], offset, new Cartesian3()),
          1e-5,
        );
      }
      expect([...primitive.deformerBindings].length).toBe(0);
    });
  },
  "WebGL",
);
