import { AttributeType } from "@cesium/core";
import {
  GeometryAttributeDescriptor,
  VertexAttributeSemantic,
} from "../../index.js";

describe("Scene/GeometryAttributeDescriptor", function () {
  it("derives the type of built-in semantics", function () {
    const expected = {
      [VertexAttributeSemantic.POSITION]: AttributeType.VEC3,
      [VertexAttributeSemantic.NORMAL]: AttributeType.VEC3,
      [VertexAttributeSemantic.TANGENT]: AttributeType.VEC4,
      [VertexAttributeSemantic.TEXCOORD]: AttributeType.VEC2,
      [VertexAttributeSemantic.COLOR]: AttributeType.VEC4,
      [VertexAttributeSemantic.JOINTS]: AttributeType.VEC4,
      [VertexAttributeSemantic.WEIGHTS]: AttributeType.VEC4,
      [VertexAttributeSemantic.FEATURE_ID]: AttributeType.SCALAR,
      [VertexAttributeSemantic.SCALE]: AttributeType.VEC3,
      [VertexAttributeSemantic.ROTATION]: AttributeType.VEC4,
      [VertexAttributeSemantic.CUMULATIVE_DISTANCE]: AttributeType.SCALAR,
    };

    for (const [semantic, type] of Object.entries(expected)) {
      const descriptor = new GeometryAttributeDescriptor({ semantic });
      expect(descriptor.type).withContext(semantic).toBe(type);
    }
  });

  it("derives the component count from the type", function () {
    const counts = {
      [AttributeType.SCALAR]: 1,
      [AttributeType.VEC2]: 2,
      [AttributeType.VEC3]: 3,
      [AttributeType.VEC4]: 4,
      [AttributeType.MAT2]: 4,
      [AttributeType.MAT3]: 9,
      [AttributeType.MAT4]: 16,
    };

    for (const [type, componentCount] of Object.entries(counts)) {
      const descriptor = new GeometryAttributeDescriptor({
        semantic: "_CUSTOM",
        type,
      });
      expect(descriptor.componentCount).withContext(type).toBe(componentCount);
    }
  });

  it("defaults the set index of built-in semantics that have one", function () {
    const texCoord = new GeometryAttributeDescriptor({
      semantic: VertexAttributeSemantic.TEXCOORD,
    });
    expect(texCoord.setIndex).toBe(0);

    const texCoord1 = new GeometryAttributeDescriptor({
      semantic: VertexAttributeSemantic.TEXCOORD,
      setIndex: 1,
    });
    expect(texCoord1.setIndex).toBe(1);
  });

  it("ignores the set index of built-in semantics that don't have one", function () {
    const position = new GeometryAttributeDescriptor({
      semantic: VertexAttributeSemantic.POSITION,
      setIndex: 2,
    });
    expect(position.setIndex).toBeUndefined();
  });

  it("supports custom semantics", function () {
    const temperature = new GeometryAttributeDescriptor({
      semantic: "_TEMPERATURE",
      type: AttributeType.SCALAR,
    });
    expect(temperature.semantic).toBe("_TEMPERATURE");
    expect(temperature.setIndex).toBeUndefined();
    expect(temperature.type).toBe(AttributeType.SCALAR);
    expect(temperature.componentCount).toBe(1);
  });

  it("ignores the set index of custom semantics", function () {
    const temperature = new GeometryAttributeDescriptor({
      semantic: "_TEMPERATURE",
      setIndex: 1,
      type: AttributeType.SCALAR,
    });
    expect(temperature.setIndex).toBeUndefined();
  });

  it("equals compares semantic and set index", function () {
    const texCoord0 = new GeometryAttributeDescriptor({
      semantic: VertexAttributeSemantic.TEXCOORD,
    });
    expect(
      texCoord0.equals(
        new GeometryAttributeDescriptor({
          semantic: VertexAttributeSemantic.TEXCOORD,
          setIndex: 0,
        }),
      ),
    ).toBe(true);
    expect(
      texCoord0.equals(
        new GeometryAttributeDescriptor({
          semantic: VertexAttributeSemantic.TEXCOORD,
          setIndex: 1,
        }),
      ),
    ).toBe(false);
    expect(
      texCoord0.equals(
        new GeometryAttributeDescriptor({
          semantic: VertexAttributeSemantic.COLOR,
        }),
      ),
    ).toBe(false);
    expect(texCoord0.equals(undefined)).toBe(false);
  });

  it("equals ignores the type", function () {
    const scalar = new GeometryAttributeDescriptor({
      semantic: "_TEMPERATURE",
      type: AttributeType.SCALAR,
    });
    const vector = new GeometryAttributeDescriptor({
      semantic: "_TEMPERATURE",
      type: AttributeType.VEC3,
    });
    expect(scalar.equals(vector)).toBe(true);
  });

  it("equals distinguishes custom semantics by their full name", function () {
    const temperature0 = new GeometryAttributeDescriptor({
      semantic: "_TEMPERATURE_0",
      type: AttributeType.SCALAR,
    });
    const temperature1 = new GeometryAttributeDescriptor({
      semantic: "_TEMPERATURE_1",
      type: AttributeType.SCALAR,
    });
    expect(temperature0.equals(temperature1)).toBe(false);
  });

  it("throws without options", function () {
    expect(function () {
      return new GeometryAttributeDescriptor();
    }).toThrowDeveloperError();
  });

  it("throws without a semantic", function () {
    expect(function () {
      return new GeometryAttributeDescriptor({});
    }).toThrowDeveloperError();
  });

  it("throws if a custom semantic has no type", function () {
    expect(function () {
      return new GeometryAttributeDescriptor({ semantic: "_TEMPERATURE" });
    }).toThrowDeveloperError();
  });

  it("throws if the type doesn't match a built-in semantic", function () {
    expect(function () {
      return new GeometryAttributeDescriptor({
        semantic: VertexAttributeSemantic.NORMAL,
        type: AttributeType.VEC4,
      });
    }).toThrowDeveloperError();
  });

  it("throws if the set index is negative", function () {
    expect(function () {
      return new GeometryAttributeDescriptor({
        semantic: VertexAttributeSemantic.TEXCOORD,
        setIndex: -1,
      });
    }).toThrowDeveloperError();
  });
});
