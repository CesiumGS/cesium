import { ShaderSource } from "../../index.js";
import ShadowMapShader from "../../Source/Scene/ShadowMapShader.js";

describe("Scene/ShadowMapShader", function () {
  function makeShaderSource(source, defines) {
    return new ShaderSource({
      defines: defines,
      sources: [source],
    });
  }

  describe("hasClippingForShadowCast", function () {
    it("returns true when clipping plane define is present", function () {
      const fs = makeShaderSource(
        "void main() { out_FragColor = vec4(1.0); }",
        ["HAS_CLIPPING_PLANES"],
      );
      expect(ShadowMapShader.hasClippingForShadowCast(fs)).toBe(true);
    });

    it("returns true when clipping polygon define is present", function () {
      const fs = makeShaderSource(
        "void main() { out_FragColor = vec4(1.0); }",
        ["ENABLE_CLIPPING_POLYGONS"],
      );
      expect(ShadowMapShader.hasClippingForShadowCast(fs)).toBe(true);
    });

    it("returns false without clipping defines", function () {
      const fs = makeShaderSource(
        "void main() { out_FragColor = vec4(1.0); }",
        ["SOME_OTHER_DEFINE"],
      );
      expect(ShadowMapShader.hasClippingForShadowCast(fs)).toBe(false);
    });
  });

  describe("getShadowCastShaderKeyword", function () {
    it("includes hasClipping in the keyword", function () {
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
    });
  });

  describe("createShadowCastFragmentShader", function () {
    it("opaque without clipping does not call original main", function () {
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

    it("opaque with clipping calls original main so clipped fragments are discarded", function () {
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

    it("opaque with clipping and point light calls original main", function () {
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
