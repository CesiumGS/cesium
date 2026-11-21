import { AttributeType, ComponentDatatype } from "@cesium/core";
import {
  GeometryAttributeDescriptor,
  GeometryAttributeDomain,
  VertexAttributeSemantic,
} from "@cesium/engine";
import {
  AttributeComponentType,
  AttributeDomain,
  AttributeResult,
} from "@cesium/mesh-editor";
import { WasmMeshAttributeTranslator } from "../../index.js";

describe("Editor/WasmMeshAttributeTranslator", function () {
  function createDescriptor(type, componentDatatype) {
    return new GeometryAttributeDescriptor({
      semantic: "_VALUE",
      type,
      componentDatatype,
    });
  }

  describe("getUnsupportedReason", function () {
    it("supports scalars and vectors of 32-bit or smaller numbers", function () {
      for (const datatype of [
        ComponentDatatype.FLOAT,
        ComponentDatatype.BYTE,
        ComponentDatatype.UNSIGNED_SHORT,
        ComponentDatatype.INT,
      ]) {
        for (const type of [AttributeType.SCALAR, AttributeType.VEC4]) {
          expect(
            WasmMeshAttributeTranslator.getUnsupportedReason(
              createDescriptor(type, datatype),
            ),
          ).toBeUndefined();
        }
      }
    });

    it("rejects other datatypes and types", function () {
      for (const descriptor of [
        createDescriptor(AttributeType.SCALAR, ComponentDatatype.DOUBLE),
        createDescriptor(AttributeType.SCALAR, undefined),
        createDescriptor(AttributeType.MAT2, ComponentDatatype.FLOAT),
      ]) {
        expect(
          WasmMeshAttributeTranslator.getUnsupportedReason(descriptor),
        ).toEqual(jasmine.any(String));
      }
    });
  });

  it("getArrayType gets a 32-bit array of the datatype's kind", function () {
    const getArrayType = (datatype) =>
      WasmMeshAttributeTranslator.getArrayType(
        createDescriptor(AttributeType.SCALAR, datatype),
      );
    expect(getArrayType(ComponentDatatype.FLOAT)).toBe(Float32Array);
    expect(getArrayType(ComponentDatatype.SHORT)).toBe(Int32Array);
    expect(getArrayType(ComponentDatatype.UNSIGNED_BYTE)).toBe(Uint32Array);
  });

  it("toWasmDomain translates every domain", function () {
    const { toWasmDomain } = WasmMeshAttributeTranslator;
    expect(toWasmDomain(GeometryAttributeDomain.VERTEX)).toBe(
      AttributeDomain.Vertex,
    );
    expect(toWasmDomain(GeometryAttributeDomain.CORNER)).toBe(
      AttributeDomain.Corner,
    );
    expect(toWasmDomain(GeometryAttributeDomain.EDGE)).toBe(
      AttributeDomain.Edge,
    );
    expect(toWasmDomain(GeometryAttributeDomain.FACE)).toBe(
      AttributeDomain.Face,
    );
  });

  describe("createDefaultValue", function () {
    const { createDefaultValue } = WasmMeshAttributeTranslator;

    it("creates an array of the attribute's storage type", function () {
      const scalar = createDefaultValue(
        createDescriptor(AttributeType.SCALAR, ComponentDatatype.FLOAT),
        0.5,
      );
      expect(scalar).toEqual(new Float32Array([0.5]));

      const vector = createDescriptor(
        AttributeType.VEC2,
        ComponentDatatype.SHORT,
      );
      expect(createDefaultValue(vector, [1, -1])).toEqual(
        new Int32Array([1, -1]),
      );
    });

    it("throws if the value doesn't fit the attribute's type", function () {
      const vector = createDescriptor(
        AttributeType.VEC2,
        ComponentDatatype.FLOAT,
      );
      expect(() => createDefaultValue(vector, 0)).toThrowDeveloperError();
      expect(() =>
        createDefaultValue(vector, [0, 0, 0]),
      ).toThrowDeveloperError();

      const integer = createDescriptor(
        AttributeType.SCALAR,
        ComponentDatatype.UNSIGNED_INT,
      );
      expect(() => createDefaultValue(integer, 0.5)).toThrowDeveloperError();
    });
  });

  describe("toDescriptor", function () {
    function toDescriptor(name, options = {}) {
      return WasmMeshAttributeTranslator.toDescriptor({
        name,
        domain: AttributeDomain.Vertex,
        componentType: AttributeComponentType.Float32,
        componentCount: 1,
        ...options,
      });
    }

    it("splits built-in names into their semantic and set index", function () {
      const texCoord = toDescriptor("TEXCOORD_1", { componentCount: 2 });
      expect(texCoord.semantic).toBe(VertexAttributeSemantic.TEXCOORD);
      expect(texCoord.setIndex).toBe(1);

      const position = toDescriptor("POSITION", { componentCount: 3 });
      expect(position.semantic).toBe(VertexAttributeSemantic.POSITION);
      expect(position.setIndex).toBeUndefined();
    });

    it("keeps custom names whole, even if they end in a number", function () {
      const descriptor = toDescriptor("_TEMPERATURE_1");
      expect(descriptor.semantic).toBe("_TEMPERATURE_1");
      expect(descriptor.setIndex).toBeUndefined();
    });

    it("translates the domain, type and datatype", function () {
      const descriptor = toDescriptor("_VALUE", {
        domain: AttributeDomain.Corner,
        componentType: AttributeComponentType.Uint32,
        componentCount: 3,
      });
      expect(descriptor.domain).toBe(GeometryAttributeDomain.CORNER);
      expect(descriptor.type).toBe(AttributeType.VEC3);
      expect(descriptor.componentDatatype).toBe(ComponentDatatype.UNSIGNED_INT);
      expect(
        toDescriptor("_VALUE", { componentType: AttributeComponentType.Int32 })
          .componentDatatype,
      ).toBe(ComponentDatatype.INT);
    });

    it("translates every domain", function () {
      const domains = [
        [AttributeDomain.Vertex, GeometryAttributeDomain.VERTEX],
        [AttributeDomain.Corner, GeometryAttributeDomain.CORNER],
        [AttributeDomain.Edge, GeometryAttributeDomain.EDGE],
        [AttributeDomain.Face, GeometryAttributeDomain.FACE],
      ];
      for (const [domain, expected] of domains) {
        expect(toDescriptor("_VALUE", { domain }).domain).toBe(expected);
      }
    });
  });

  describe("debugCheckAttributeResult", function () {
    it("passes for Ok", function () {
      expect(() =>
        WasmMeshAttributeTranslator.debugCheckAttributeResult(
          AttributeResult.Ok,
          "_VALUE",
        ),
      ).not.toThrow();
    });

    it("throws for every other result", function () {
      const results = Object.values(AttributeResult).filter(
        (result) => typeof result === "number" && result !== AttributeResult.Ok,
      );
      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(() =>
          WasmMeshAttributeTranslator.debugCheckAttributeResult(
            result,
            "_VALUE",
          ),
        )
          .withContext(AttributeResult[result])
          .toThrowDeveloperError();
      }
    });
  });
});
