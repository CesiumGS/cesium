import {
  AttributeType,
  PrimitiveLoadPlan,
  ModelComponents,
} from "../../../Source/Cesium.js";
import createContext from "../../createContext.js";

describe(
  "Scene/ModelExperimental/PrimitiveLoadPlan",
  function () {
    function mockPrimitive() {
      const primitive = new ModelComponents.Primitive();

      // Simulate a simple case of 4 vertices making a 2-triangle quad:
      //
      // 3---2
      // | / |
      // 0---1
      const position = new ModelComponents.Attribute();
      position.count = 4;
      // prettier-ignore
      position.packedTypedArray = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        1, 1, 0,
        0, 1, 0
      ]);

      const indices = new ModelComponents.Indices();
      // prettier-ignore
      indices.typedArray = new Uint8Array([
        0, 1, 2,
        0, 2, 3
      ]);

      primitive.attributes.push(position);
      primitive.indices = indices;

      return primitive;
    }

    function mockLoadPlan() {
      const primitive = mockPrimitive();
      const loadPlan = new PrimitiveLoadPlan(primitive);

      loadPlan.indicesPlan = new PrimitiveLoadPlan.IndicesLoadPlan(
        primitive.indices
      );
      const [positions] = primitive.attributes;
      loadPlan.attributePlans.push(
        new PrimitiveLoadPlan.AttributeLoadPlan(positions)
      );

      return loadPlan;
    }

    // Outline 3 out of the 4 sides of the quad.
    //
    // 3---2
    //     |
    // 0---1
    // prettier-ignore
    const mockOutlineIndices = [
      0, 1,
      1, 2,
      2, 3
    ];

    const buffers = [];

    function expectOutlineCoordinates(primitive, outlineCoordinatesPlan) {
      expect(outlineCoordinatesPlan.loadBuffer).toBe(true);
      expect(outlineCoordinatesPlan.loadTypedArray).toBe(false);
      expect(outlineCoordinatesPlan.loadPackedTypedArray).toBe(false);

      const attribute = outlineCoordinatesPlan.attribute;
      expect(attribute.name).toBe("_OUTLINE_COORDINATES");
      expect(attribute.buffer).toBeDefined();
      buffers.push(attribute.buffer);
      expect(attribute.typedArray).not.toBeDefined();
      expect(attribute.type).toBe(AttributeType.VEC3);
      expect(attribute.normalized).toBe(false);
      expect(attribute.count).toBe(5);

      expect(primitive.outlineCoordinates).toBe(attribute);
    }

    let context;
    beforeAll(function () {
      context = createContext();
    });

    afterEach(function () {
      const length = buffers.length;
      for (let i = 0; i < length; i++) {
        const buffer = buffers[i];
        if (!buffer.isDestroyed()) {
          buffer.destroy();
        }
      }
      buffers.length = 0;
    });

    it("AttributeLoadPlan throws for undefined primitive", function () {
      expect(function () {
        return new PrimitiveLoadPlan.AttributeLoadPlan(undefined);
      }).toThrowDeveloperError();
    });

    it("AttributeLoadPlan constructs", function () {
      const attribute = new ModelComponents.Attribute();
      const attributePlan = new PrimitiveLoadPlan.AttributeLoadPlan(attribute);
      expect(attributePlan.attribute).toBe(attribute);
      expect(attributePlan.loadBuffer).toBe(false);
      expect(attributePlan.loadTypedArray).toBe(false);
      expect(attributePlan.loadPackedTypedArray).toBe(false);
    });

    it("IndicesLoadPlan throws for undefined indices", function () {
      expect(function () {
        return new PrimitiveLoadPlan.IndicesLoadPlan(undefined);
      }).toThrowDeveloperError();
    });

    it("IndicesLoadPlan constructs", function () {
      const indices = new ModelComponents.Indices();
      const indicesPlan = new PrimitiveLoadPlan.IndicesLoadPlan(indices);
      expect(indicesPlan.indices).toBe(indices);
      expect(indicesPlan.loadBuffer).toBe(false);
      expect(indicesPlan.loadTypedArray).toBe(false);
    });

    it("PrimitiveLoadPlan throws for undefined primitive", function () {
      expect(function () {
        return new PrimitiveLoadPlan(undefined);
      }).toThrowDeveloperError();
    });

    it("PrimitiveLoadPlan constructs", function () {
      const primitive = mockPrimitive();
      const loadPlan = new PrimitiveLoadPlan(primitive);

      expect(loadPlan.primitive).toBe(primitive);
      expect(loadPlan.attributePlans).toEqual([]);
      expect(loadPlan.indicesPlan).not.toBeDefined();
    });

    it("postProcess does nothing if there are no outlines", function () {
      const loadPlan = mockLoadPlan();
      const [positionPlan] = loadPlan.attributePlans;
      const indicesPlan = loadPlan.indicesPlan;

      // loadPlan.needsOutlines was not set to true, so postProcess should do
      // nothing
      positionPlan.loadBuffer = true;
      indicesPlan.loadBuffer = true;
      loadPlan.postProcess(context);

      // No attribute is created for the outline coordinates
      expect(loadPlan.attributePlans.length).toBe(1);
      const [outputPositionPlan] = loadPlan.attributePlans;
      expect(outputPositionPlan).toBe(positionPlan);

      // Normally the loaders will have already created buffers, but this
      // is intentionally not done here so an undefined buffer means a no-op
      expect(positionPlan.attribute.buffer).not.toBeDefined();
      expect(indicesPlan.indices.buffer).not.toBeDefined();
    });

    it("postProcess processes CESIUM_primitive_outline as a buffer", function () {
      const loadPlan = mockLoadPlan();
      const [positionPlan] = loadPlan.attributePlans;
      const indicesPlan = loadPlan.indicesPlan;

      loadPlan.needsOutlines = true;
      loadPlan.outlineIndices = mockOutlineIndices;

      positionPlan.loadBuffer = true;
      indicesPlan.loadBuffer = true;
      loadPlan.postProcess(context);

      // A new attribute is created for the outline coordinates
      expect(loadPlan.attributePlans.length).toBe(2);
      const [
        outputPositionPlan,
        outlineCoordinatesPlan,
      ] = loadPlan.attributePlans;
      expect(outputPositionPlan).toBe(positionPlan);
      expectOutlineCoordinates(loadPlan.primitive, outlineCoordinatesPlan);

      const attribute = positionPlan.attribute;
      expect(attribute.buffer).toBeDefined();
      buffers.push(attribute.buffer);
      expect(attribute.typedArray).not.toBeDefined();
      expect(attribute.packedTypedArray).not.toBeDefined();

      const indices = indicesPlan.indices;
      expect(indices.buffer).toBeDefined();
      buffers.push(indices.buffer);
      expect(indices.typedArray).not.toBeDefined();
    });

    it("postProcess processes CESIUM_primitive_outline as typed arrays", function () {
      const loadPlan = mockLoadPlan();
      const [positionPlan] = loadPlan.attributePlans;
      const indicesPlan = loadPlan.indicesPlan;

      // These will be modified by the outline generation step so save a copy
      const originalPositions = positionPlan.attribute.packedTypedArray.slice();

      loadPlan.needsOutlines = true;
      loadPlan.outlineIndices = mockOutlineIndices;

      positionPlan.loadTypedArray = true;
      positionPlan.loadPackedTypedArray = true;
      indicesPlan.loadTypedArray = true;
      loadPlan.postProcess(context);

      // A new attribute is created for the outline coordinates
      expect(loadPlan.attributePlans.length).toBe(2);
      const [
        outputPositionPlan,
        outlineCoordinatesPlan,
      ] = loadPlan.attributePlans;
      expect(outputPositionPlan).toBe(positionPlan);
      expectOutlineCoordinates(loadPlan.primitive, outlineCoordinatesPlan);

      const attribute = positionPlan.attribute;
      expect(attribute.buffer).not.toBeDefined();
      const typedArray = attribute.typedArray;

      // The outline generation process will copy vertex 0
      const originalLength = originalPositions.length;
      const expectedPositions = new Float32Array(originalLength + 3);
      expectedPositions.set(originalPositions);
      expectedPositions[originalLength] = originalPositions[0];
      expectedPositions[originalLength + 1] = originalPositions[1];
      expectedPositions[originalLength + 2] = originalPositions[2];

      expect(typedArray).toEqual(new Uint8Array(expectedPositions.buffer));
      expect(attribute.packedTypedArray).toEqual(expectedPositions);

      const indices = indicesPlan.indices;
      expect(indices.buffer).not.toBeDefined();

      // prettier-ignore
      const expectedIndices = new Uint8Array([
        0, 1, 2,
        4, 2, 3 // 4 is a copy of vertex 0
      ]);
      expect(indices.typedArray).toEqual(expectedIndices);
    });

    it("postProcess processes CESIUM_primitive_outline as both a buffer and typed array", function () {
      const loadPlan = mockLoadPlan();
      const [positionPlan] = loadPlan.attributePlans;
      const indicesPlan = loadPlan.indicesPlan;

      // These will be modified by the outline generation step so save a copy
      const originalPositions = positionPlan.attribute.packedTypedArray.slice();

      loadPlan.needsOutlines = true;
      loadPlan.outlineIndices = mockOutlineIndices;

      positionPlan.loadBuffer = true;
      positionPlan.loadTypedArray = true;
      positionPlan.loadPackedTypedArray = true;
      indicesPlan.loadBuffer = true;
      indicesPlan.loadTypedArray = true;
      loadPlan.postProcess(context);

      // A new attribute is created for the outline coordinates
      expect(loadPlan.attributePlans.length).toBe(2);
      const [
        outputPositionPlan,
        outlineCoordinatesPlan,
      ] = loadPlan.attributePlans;
      expect(outputPositionPlan).toBe(positionPlan);
      expectOutlineCoordinates(loadPlan.primitive, outlineCoordinatesPlan);

      const attribute = positionPlan.attribute;
      expect(attribute.buffer).toBeDefined();
      buffers.push(attribute.buffer);
      const typedArray = attribute.typedArray;

      // The outline generation process will copy vertex 0
      const originalLength = originalPositions.length;
      const expectedPositions = new Float32Array(originalLength + 3);
      expectedPositions.set(originalPositions);
      expectedPositions[originalLength] = originalPositions[0];
      expectedPositions[originalLength + 1] = originalPositions[1];
      expectedPositions[originalLength + 2] = originalPositions[2];

      expect(typedArray).toEqual(new Uint8Array(expectedPositions.buffer));
      expect(attribute.packedTypedArray).toEqual(expectedPositions);

      const indices = indicesPlan.indices;
      expect(indices.buffer).toBeDefined();
      buffers.push(indices.buffer);

      // prettier-ignore
      const expectedIndices = new Uint8Array([
        0, 1, 2,
        4, 2, 3 // 4 is a copy of vertex 0
      ]);
      expect(indices.typedArray).toEqual(expectedIndices);
    });
  },
  "WebGL"
);
