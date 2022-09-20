import { VertexFormat } from "../../index.js";
import createPackableSpecs from "../../../../Specs/createPackableSpecs.js";;

describe("Core/VertexFormat", function () {
  it("clone", function () {
    const vertexFormat = new VertexFormat({
      position: true,
      normal: true,
    });
    const cloned = VertexFormat.clone(vertexFormat);
    expect(cloned).toBeInstanceOf(VertexFormat);
    expect(cloned).toEqual(vertexFormat);
  });

  it("clone uses result parameter if provided", function () {
    const vertexFormat = new VertexFormat({
      position: true,
      normal: true,
    });
    const result = new VertexFormat();
    const cloned = VertexFormat.clone(vertexFormat, result);
    expect(cloned).toBe(result);
    expect(cloned).toEqual(vertexFormat);
  });

  createPackableSpecs(VertexFormat, VertexFormat.POSITION_AND_NORMAL, [
    1.0,
    1.0,
    0.0,
    0.0,
    0.0,
    0.0,
  ]);
});
