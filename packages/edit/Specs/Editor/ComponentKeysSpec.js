import { ComponentType } from "@cesium/mesh-editor";
import { ComponentKeys } from "../../index.js";

describe("Editor/ComponentKeys", function () {
  describe("getName", function () {
    it("gets each component type's property", function () {
      expect(ComponentKeys.getName(ComponentType.Vertex)).toBe("verts");
      expect(ComponentKeys.getName(ComponentType.Edge)).toBe("edges");
      expect(ComponentKeys.getName(ComponentType.Face)).toBe("faces");
    });
  });
});
