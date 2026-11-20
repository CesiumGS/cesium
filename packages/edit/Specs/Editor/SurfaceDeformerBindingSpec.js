import {
  AxisAlignedBoundingBox,
  Cartesian3,
  Event,
  Matrix3,
  Matrix4,
  PixelDatatype,
  PixelFormat,
} from "@cesium/core";
import { DataTexture } from "@cesium/engine";
import { SurfaceDeformer, SurfaceDeformerBinding } from "../../index.js";
import createContext from "../../../../Specs/createContext.js";

describe(
  "Editor/SurfaceDeformerBinding",
  function () {
    let context;

    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    // A triangle whose frame isn't the identity.
    const rest = [
      [1.0, 0.0, 0.0],
      [3.0, 1.0, 0.0],
      [0.0, 2.0, 1.0],
    ];
    const coordinates = [0.25, 0.5, 2.0];

    function createPositionTexture(positions) {
      const texture = new DataTexture({
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.FLOAT,
      });
      texture.upload(
        context,
        Float32Array.from(positions.flatMap((position) => [...position, 0.0])),
      );
      return texture;
    }

    // Evaluates the binding's shader for a vertex bound to the triangle, and
    // expects its position and jacobian. The vertex is at its position when
    // bound, unless positionMC is given.
    function expectDeformation(options) {
      const { current, bindMatrix, expectedPosition, expectedJacobian } =
        options;
      const positionMC =
        options.positionMC ??
        Matrix4.multiplyByPoint(
          bindMatrix,
          computeFrame(rest).position,
          new Cartesian3(),
        );
      const positionTexture = createPositionTexture(current);
      const restPositionTexture = createPositionTexture(rest);
      const binding = new SurfaceDeformerBinding({
        deformer: {
          _getShaderLines: SurfaceDeformer.prototype._getShaderLines,
        },
        vertexBuffer: { destroy: () => {} },
        positionTexture,
        restPositionTexture,
        bindMatrix,
      });

      const names = {
        triangle: "vec3(0.0, 1.0, 2.0)",
        frameCoordinates: `vec3(${coordinates.map((c) => c.toFixed(2))})`,
      };
      const uniformMap = {
        u_positionMC: () => positionMC,
        u_expectedPosition: () => expectedPosition,
        u_expectedJacobian: () => expectedJacobian,
      };
      let declarations = "";
      for (const [name, uniform] of Object.entries(binding.uniforms)) {
        names[name] = `u_${name}`;
        uniformMap[`u_${name}`] = uniform.value;
        const type = uniform.type.startsWith("sampler")
          ? `highp ${uniform.type}`
          : uniform.type;
        declarations += `uniform ${type} u_${name};\n`;
      }

      const fragmentShader =
        `${declarations}` +
        "uniform vec3 u_positionMC;\n" +
        "uniform vec3 u_expectedPosition;\n" +
        "uniform mat3 u_expectedJacobian;\n" +
        "vec3 deform(in vec3 positionMC, out mat3 jacobian) {\n" +
        `${binding.getShaderLines(names).join("\n")}\n` +
        "}\n" +
        "void main() {\n" +
        "  mat3 jacobian;\n" +
        "  vec3 position = deform(u_positionMC, jacobian);\n" +
        "  mat3 difference = jacobian - u_expectedJacobian;\n" +
        "  float error = max(length(position - u_expectedPosition), max(length(difference[0]), max(length(difference[1]), length(difference[2]))));\n" +
        "  out_FragColor = error < 1e-5 ? vec4(0.0, 1.0, 0.0, 1.0) : vec4(1.0, 0.0, 0.0, 1.0);\n" +
        "}\n";

      expect({ context, fragmentShader, uniformMap }).contextToRender([
        0, 255, 0, 255,
      ]);

      binding.destroy();
      positionTexture.destroy();
    }

    // The triangle's frame: the point at the coordinates, and its edges and
    // normal as matrix columns.
    function computeFrame(positions) {
      const [p0, p1, p2] = positions.map((p) => Cartesian3.fromArray(p));
      const e1 = Cartesian3.subtract(p1, p0, new Cartesian3());
      const e2 = Cartesian3.subtract(p2, p0, new Cartesian3());
      const normal = Cartesian3.normalize(
        Cartesian3.cross(e1, e2, new Cartesian3()),
        new Cartesian3(),
      );
      const [a, b, c] = coordinates;
      const position = Cartesian3.clone(p0);
      for (const [vector, scale] of [
        [e1, a],
        [e2, b],
        [normal, c],
      ]) {
        Cartesian3.add(
          position,
          Cartesian3.multiplyByScalar(vector, scale, new Cartesian3()),
          position,
        );
      }
      const matrix = new Matrix3(
        e1.x,
        e2.x,
        normal.x,
        e1.y,
        e2.y,
        normal.y,
        e1.z,
        e2.z,
        normal.z,
      );
      return { position, matrix };
    }

    // The position and jacobian a deformation from rest to current should have.
    function computeExpected(current, bindMatrix) {
      const restFrame = computeFrame(rest);
      const currentFrame = computeFrame(current);
      const linear = Matrix4.getMatrix3(bindMatrix, new Matrix3());
      const jacobian = Matrix3.multiply(
        linear,
        Matrix3.multiply(
          currentFrame.matrix,
          Matrix3.inverse(restFrame.matrix, new Matrix3()),
          new Matrix3(),
        ),
        new Matrix3(),
      );
      Matrix3.multiply(
        jacobian,
        Matrix3.inverse(linear, new Matrix3()),
        jacobian,
      );
      return {
        expectedPosition: Matrix4.multiplyByPoint(
          bindMatrix,
          currentFrame.position,
          new Cartesian3(),
        ),
        expectedJacobian: jacobian,
      };
    }

    function rotate(positions, rotation) {
      return positions.map((p) =>
        Cartesian3.pack(
          Matrix3.multiplyByVector(
            rotation,
            Cartesian3.fromArray(p),
            new Cartesian3(),
          ),
          [],
        ),
      );
    }

    it("is the identity at rest", function () {
      const expected = computeExpected(rest, Matrix4.IDENTITY);
      expect(expected.expectedJacobian).toEqualEpsilon(Matrix3.IDENTITY, 1e-12);

      expectDeformation({
        current: rest,
        bindMatrix: Matrix4.IDENTITY,
        ...expected,
      });
    });

    it("rotates with its triangle", function () {
      const rotation = Matrix3.fromRotationZ(Math.PI / 2.0);
      const current = rotate(rest, rotation);
      const expected = computeExpected(current, Matrix4.IDENTITY);
      expect(expected.expectedJacobian).toEqualEpsilon(rotation, 1e-12);

      expectDeformation({ current, bindMatrix: Matrix4.IDENTITY, ...expected });
    });

    it("stretches with its triangle", function () {
      const scale = new Cartesian3(2.0, 1.0, 1.0);
      const current = rest.map(([x, y, z]) => [scale.x * x, y, z]);
      const expected = computeExpected(current, Matrix4.IDENTITY);

      // Within the triangle's plane, the jacobian is the stretch.
      const [p0, p1, p2] = rest.map((p) => Cartesian3.fromArray(p));
      for (const edge of [
        Cartesian3.subtract(p1, p0, new Cartesian3()),
        Cartesian3.subtract(p2, p0, new Cartesian3()),
      ]) {
        expect(
          Matrix3.multiplyByVector(
            expected.expectedJacobian,
            edge,
            new Cartesian3(),
          ),
        ).toEqualEpsilon(
          Cartesian3.multiplyComponents(edge, scale, new Cartesian3()),
          1e-12,
        );
      }

      expectDeformation({ current, bindMatrix: Matrix4.IDENTITY, ...expected });
    });

    it("maps the local transform into the deformable's space", function () {
      const current = rotate(rest, Matrix3.fromRotationZ(Math.PI / 2.0));
      const bindMatrix = Matrix4.fromRotationTranslation(
        Matrix3.fromRotationX(Math.PI / 2.0),
        new Cartesian3(1.0, 2.0, 3.0),
      );

      expectDeformation({
        current,
        bindMatrix,
        ...computeExpected(current, bindMatrix),
      });
    });

    it("moves a vertex whose rest position changed since it was bound", function () {
      const current = rotate(rest, Matrix3.fromRotationZ(Math.PI / 2.0));
      const expected = computeExpected(current, Matrix4.IDENTITY);
      const restChange = new Cartesian3(5.0, -1.0, 2.0);

      expectDeformation({
        current,
        bindMatrix: Matrix4.IDENTITY,
        positionMC: Cartesian3.add(
          computeFrame(rest).position,
          restChange,
          new Cartesian3(),
        ),
        expectedPosition: Cartesian3.add(
          expected.expectedPosition,
          restChange,
          new Cartesian3(),
        ),
        expectedJacobian: expected.expectedJacobian,
      });
    });

    it("leaves normals unchanged when its triangle collapses", function () {
      const current = [
        [0.0, 0.0, 0.0],
        [1.0, 0.0, 0.0],
        [2.0, 0.0, 0.0],
      ];
      const [a, b] = coordinates;
      expectDeformation({
        current,
        bindMatrix: Matrix4.IDENTITY,
        expectedPosition: new Cartesian3(a + 2.0 * b, 0.0, 0.0),
        expectedJacobian: Matrix3.IDENTITY,
      });
    });

    describe("bounding box", function () {
      let deformer;

      beforeEach(function () {
        deformer = { _bounds: undefined, _boundsChanged: new Event() };
      });

      function createBinding(bindMatrix) {
        return new SurfaceDeformerBinding({
          deformer,
          vertexBuffer: { destroy: () => {} },
          positionTexture: {},
          restPositionTexture: { destroy: () => {} },
          bindMatrix,
          boundsCoefficients: { maxOvershoot: 0.5, maxNormalDistance: 1.0 },
        });
      }

      const meshBounds = new AxisAlignedBoundingBox(
        new Cartesian3(0.0, 0.0, 0.0),
        new Cartesian3(2.0, 4.0, 0.0),
      );

      it("is undefined until the mesh's bounds are set", function () {
        const binding = createBinding(Matrix4.IDENTITY);
        expect(
          binding.computeDeformedBoundingBox(new AxisAlignedBoundingBox()),
        ).toBeUndefined();
      });

      it("changes with its deformer's bounds", function () {
        const binding = createBinding(Matrix4.IDENTITY);
        expect(binding.deformedBoundingBoxChanged).toBe(
          deformer._boundsChanged,
        );
      });

      it("expands the mesh's bounds by its coefficients", function () {
        const binding = createBinding(Matrix4.IDENTITY);
        deformer._bounds = meshBounds;

        // Each axis grows by 0.5 * extent + 1.0.
        const box = binding.computeDeformedBoundingBox(
          new AxisAlignedBoundingBox(),
        );
        expect(box.minimum).toEqual(new Cartesian3(-2.0, -3.0, -1.0));
        expect(box.maximum).toEqual(new Cartesian3(4.0, 7.0, 1.0));
      });

      it("maps the box into the deformable's space", function () {
        const bindMatrix = Matrix4.fromRotationTranslation(
          Matrix3.fromRotationZ(Math.PI / 2.0),
          new Cartesian3(10.0, 0.0, 0.0),
        );
        const binding = createBinding(bindMatrix);
        deformer._bounds = meshBounds;

        const box = binding.computeDeformedBoundingBox(
          new AxisAlignedBoundingBox(),
        );
        expect(box.minimum).toEqualEpsilon(
          new Cartesian3(3.0, -2.0, -1.0),
          1e-12,
        );
        expect(box.maximum).toEqualEpsilon(
          new Cartesian3(13.0, 4.0, 1.0),
          1e-12,
        );
      });

      it("includes how far the rest positions moved since binding", function () {
        const binding = createBinding(Matrix4.IDENTITY);
        deformer._bounds = meshBounds;

        binding.addRestDisplacement(
          new AxisAlignedBoundingBox(
            new Cartesian3(-1.0, 0.0, 0.0),
            new Cartesian3(0.0, 2.0, 0.0),
          ),
        );
        binding.addRestDisplacement(
          new AxisAlignedBoundingBox(
            new Cartesian3(0.0, 0.0, 0.0),
            new Cartesian3(0.0, 1.0, 3.0),
          ),
        );

        const box = binding.computeDeformedBoundingBox(
          new AxisAlignedBoundingBox(),
        );
        expect(box.minimum).toEqual(new Cartesian3(-3.0, -3.0, -1.0));
        expect(box.maximum).toEqual(new Cartesian3(4.0, 10.0, 4.0));
        expect(box.center).toEqual(new Cartesian3(0.5, 3.5, 1.5));
      });
    });
  },
  "WebGL",
);
