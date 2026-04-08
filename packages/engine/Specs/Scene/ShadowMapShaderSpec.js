import { ShaderSource } from "../../index.js";
import ShadowMapShader from "../../Source/Scene/ShadowMapShader.js";

describe("Scene/ShadowMapShader", function () {
  describe("getShadowCastShaderKeyword", function () {
    it("includes hasDiscard in the keyword", function () {
      const keyword1 = ShadowMapShader.getShadowCastShaderKeyword(
        false,
        false,
        true,
        true,
        false,
      );
      const keyword2 = ShadowMapShader.getShadowCastShaderKeyword(
        false,
        false,
        true,
        true,
        true,
      );
      expect(keyword1).not.toEqual(keyword2);
      expect(keyword1).toContain("false");
      expect(keyword2).toContain("true");
    });
  });

  describe("createShadowCastFragmentShader", function () {
    function makeShaderSource(source) {
      return new ShaderSource({
        sources: [source],
      });
    }

    it("opaque without discard does not call original main", function () {
      const fs = makeShaderSource("void main() { out_FragColor = vec4(1.0); }");
      const result = ShadowMapShader.createShadowCastFragmentShader(
        fs,
        false,
        true,
        true,
        false,
      );
      // The last source is the new main() — it should NOT call czm_shadow_cast_main
      const newMain = result.sources[result.sources.length - 1];
      expect(newMain).not.toContain("czm_shadow_cast_main()");
    });

    it("opaque with discard calls original main to preserve clipping", function () {
      const fs = makeShaderSource(
        "void main() { if (clipped) { discard; } out_FragColor = vec4(1.0); }",
      );
      const result = ShadowMapShader.createShadowCastFragmentShader(
        fs,
        false,
        true,
        true,
        true,
      );
      const newMain = result.sources[result.sources.length - 1];
      expect(newMain).toContain("czm_shadow_cast_main()");
    });

    it("translucent always calls original main", function () {
      const fs = makeShaderSource(
        "void main() { out_FragColor = vec4(1.0, 1.0, 1.0, 0.5); }",
      );
      const result = ShadowMapShader.createShadowCastFragmentShader(
        fs,
        false,
        true,
        false,
        false,
      );
      const newMain = result.sources[result.sources.length - 1];
      expect(newMain).toContain("czm_shadow_cast_main()");
    });

    it("opaque with discard and point light calls original main", function () {
      const fs = makeShaderSource(
        "void main() { if (clipped) { discard; } out_FragColor = vec4(1.0); }",
      );
      const result = ShadowMapShader.createShadowCastFragmentShader(
        fs,
        true,
        false,
        true,
        true,
      );
      const newMain = result.sources[result.sources.length - 1];
      expect(newMain).toContain("czm_shadow_cast_main()");
      expect(newMain).toContain("shadowMap_lightPositionEC");
    });
  });
});
