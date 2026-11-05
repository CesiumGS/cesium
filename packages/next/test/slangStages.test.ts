import { describe, expect, it } from "vitest";
import { slangStages } from "../src/scene/slangStages.ts";

describe("slangStages", () => {
  it("finds stages by their definitions, not by mentions in comments", () => {
    const source = `import cesium;
// Add vertexMain(VertexInput, inout VertexOutput) to move vertices.
/* fragmentMain(...) below */
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {}`;
    expect(slangStages(source)).toEqual({ vertex: false, fragment: true });
  });

  it("finds both stages", () => {
    const source = `public void vertexMain(VertexInput v, inout VertexOutput o) {}
void fragmentMain(FragmentInput f, inout MaterialOutput m) {}`;
    expect(slangStages(source)).toEqual({ vertex: true, fragment: true });
  });
});
