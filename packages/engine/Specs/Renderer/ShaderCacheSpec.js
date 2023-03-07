import { ShaderCache, ShaderSource } from "../../index.js";
import createContext from "../../../../Specs/createContext.js";

describe(
  "Renderer/ShaderCache",
  function () {
    let context;

    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    it("adds and removes", function () {
      const vs = "in vec4 position; void main() { gl_Position = position; }";
      const fs = "void main() { out_FragColor = vec4(1.0); }";

      const cache = new ShaderCache(context);

      const sp = cache.getShaderProgram({
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
        },
      });

      expect(sp._cachedShader.count).toEqual(1);
      expect(cache.numberOfShaders).toEqual(1);

      cache.releaseShaderProgram(sp);
      expect(sp.isDestroyed()).toEqual(false);
      expect(cache.numberOfShaders).toEqual(1);

      cache.destroyReleasedShaderPrograms();
      expect(sp.isDestroyed()).toEqual(true);
      expect(cache.numberOfShaders).toEqual(0);

      cache.destroy();
    });

    it("adds and removes 2", function () {
      const vs = "in vec4 position; void main() { gl_Position = position; }";
      const fs = "void main() { out_FragColor = vec4(1.0); }";

      const cache = new ShaderCache(context);
      const sp = cache.getShaderProgram({
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
        },
      });
      expect(sp._cachedShader.count).toEqual(1);

      sp.destroy();
      expect(sp.isDestroyed()).toEqual(false);

      cache.destroyReleasedShaderPrograms();
      expect(sp.isDestroyed()).toEqual(true);

      cache.destroy();
    });

    it("has a cache hit", function () {
      const vs = "in vec4 position; void main() { gl_Position = position; }";
      const fs = "void main() { out_FragColor = vec4(1.0); }";

      // These functions can be expensive for large shaders, so they should
      // only be called the first time a shader is created.
      spyOn(
        ShaderSource.prototype,
        "createCombinedVertexShader"
      ).and.callThrough();
      spyOn(
        ShaderSource.prototype,
        "createCombinedFragmentShader"
      ).and.callThrough();

      const cache = new ShaderCache(context);
      const sp = cache.getShaderProgram({
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
        },
      });
      const sp2 = cache.getShaderProgram({
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
        },
      });

      expect(sp).toBe(sp2);
      expect(sp._cachedShader.count).toEqual(2);
      expect(cache.numberOfShaders).toEqual(1);

      expect(
        ShaderSource.prototype.createCombinedVertexShader
      ).toHaveBeenCalledTimes(1);
      expect(
        ShaderSource.prototype.createCombinedFragmentShader
      ).toHaveBeenCalledTimes(1);

      sp.destroy();
      sp2.destroy();
      cache.destroyReleasedShaderPrograms();

      expect(sp.isDestroyed()).toEqual(true);
      expect(cache.numberOfShaders).toEqual(0);

      cache.destroy();
    });

    it("cache handles unordered attributeLocations dictionary", function () {
      const vs = "in vec4 position; void main() { gl_Position = position; }";
      const fs = "void main() { out_FragColor = vec4(1.0); }";

      // Create a case where JSON.stringify(x) may produce two different results
      // without sorting the keys
      const attributeLocations = {
        position: 0,
        normal: 1,
        color: 2,
      };
      const attributeLocationsReordered = {
        color: 2,
        position: 0,
        normal: 1,
      };

      // These functions can be expensive for large shaders, so they should
      // only be called the first time a shader is created.
      spyOn(
        ShaderSource.prototype,
        "createCombinedVertexShader"
      ).and.callThrough();
      spyOn(
        ShaderSource.prototype,
        "createCombinedFragmentShader"
      ).and.callThrough();

      const cache = new ShaderCache(context);
      const sp = cache.getShaderProgram({
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: attributeLocations,
      });
      const sp2 = cache.getShaderProgram({
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: attributeLocationsReordered,
      });

      expect(sp).toBe(sp2);
      expect(sp._cachedShader.count).toEqual(2);
      expect(cache.numberOfShaders).toEqual(1);

      expect(
        ShaderSource.prototype.createCombinedVertexShader
      ).toHaveBeenCalledTimes(1);
      expect(
        ShaderSource.prototype.createCombinedFragmentShader
      ).toHaveBeenCalledTimes(1);

      sp.destroy();
      sp2.destroy();
      cache.destroyReleasedShaderPrograms();

      expect(sp.isDestroyed()).toEqual(true);
      expect(cache.numberOfShaders).toEqual(0);

      cache.destroy();
    });

    it("replaces a shader program", function () {
      const vs = "in vec4 position; void main() { gl_Position = position; }";
      const fs = "void main() { out_FragColor = vec4(1.0); }";
      const fs2 = "void main() { out_FragColor = vec4(0.5); }";
      const attributeLocations = {
        position: 0,
      };

      const cache = new ShaderCache(context);
      const sp = cache.replaceShaderProgram({
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: attributeLocations,
      });

      const sp2 = cache.replaceShaderProgram({
        shaderProgram: sp,
        vertexShaderSource: vs,
        fragmentShaderSource: fs2,
        attributeLocations: attributeLocations,
      });

      expect(sp._cachedShader.count).toEqual(0);
      expect(sp2._cachedShader.count).toEqual(1);

      cache.destroy();
    });

    it("avoids thrashing", function () {
      const vs = "in vec4 position; void main() { gl_Position = position; }";
      const fs = "void main() { out_FragColor = vec4(1.0); }";

      const cache = new ShaderCache(context);
      const sp = cache.getShaderProgram({
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
        },
      });
      sp.destroy();
      const sp2 = cache.getShaderProgram({
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
        },
      }); // still cache hit

      cache.destroyReleasedShaderPrograms(); // does not destroy
      expect(sp.isDestroyed()).toEqual(false);
      expect(sp2.isDestroyed()).toEqual(false);

      sp2.destroy();
      cache.destroyReleasedShaderPrograms(); // destroys

      expect(sp.isDestroyed()).toEqual(true);
      expect(sp2.isDestroyed()).toEqual(true);

      cache.destroy();
    });

    it("create derived shader program", function () {
      const vs = "in vec4 position; void main() { gl_Position = position; }";
      const fs = "void main() { out_FragColor = vec4(1.0); }";

      const cache = new ShaderCache(context);
      const sp = cache.getShaderProgram({
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
        },
      });

      const keyword = "derived";
      let spDerived = cache.getDerivedShaderProgram(sp, keyword);
      expect(spDerived).not.toBeDefined();

      const fsDerived = "void main() { out_FragColor = vec4(vec3(1.0), 0.5); }";
      spDerived = cache.createDerivedShaderProgram(sp, keyword, {
        vertexShaderSource: vs,
        fragmentShaderSource: fsDerived,
        attributeLocations: {
          position: 0,
        },
      });
      expect(spDerived).toBeDefined();

      cache.destroy();
    });

    it("replaces derived shader program", function () {
      const vs = "in vec4 position; void main() { gl_Position = position; }";
      const fs = "void main() { out_FragColor = vec4(1.0); }";

      const cache = new ShaderCache(context);
      const sp = cache.getShaderProgram({
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
        },
      });
      const derivedKeywords = sp._cachedShader.derivedKeywords;

      const keyword = "derived";
      const fsDerived = "void main() { out_FragColor = vec4(vec3(1.0), 0.5); }";
      const spDerived = cache.replaceDerivedShaderProgram(sp, keyword, {
        vertexShaderSource: vs,
        fragmentShaderSource: fsDerived,
        attributeLocations: {
          position: 0,
        },
      });

      expect(spDerived).toBeDefined();
      expect(derivedKeywords.length).toBe(1);

      const fsDerived2 =
        "void main() { out_FragColor = vec4(vec3(0.5), 0.5); }";
      const spDerived2 = cache.replaceDerivedShaderProgram(sp, keyword, {
        vertexShaderSource: vs,
        fragmentShaderSource: fsDerived2,
        attributeLocations: {
          position: 0,
        },
      });

      expect(spDerived.isDestroyed()).toBe(true);
      expect(spDerived2.isDestroyed()).toBe(false);
      expect(derivedKeywords.length).toBe(1);

      cache.destroy();
    });

    it("destroying a shader program destroys its derived shaders", function () {
      const vs = "in vec4 position; void main() { gl_Position = position; }";
      const fs = "void main() { out_FragColor = vec4(1.0); }";

      const cache = new ShaderCache(context);
      const sp = cache.getShaderProgram({
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
        },
      });

      const keyword = "derived";
      const fsDerived = "void main() { out_FragColor = vec4(vec3(1.0), 0.5); }";
      const spDerived = cache.createDerivedShaderProgram(sp, keyword, {
        vertexShaderSource: vs,
        fragmentShaderSource: fsDerived,
        attributeLocations: {
          position: 0,
        },
      });
      expect(spDerived).toBeDefined();

      sp.destroy();
      cache.destroyReleasedShaderPrograms();

      expect(sp.isDestroyed()).toEqual(true);
      expect(spDerived.isDestroyed()).toEqual(true);

      cache.destroy();
    });

    it("is destroyed", function () {
      const vs = "in vec4 position; void main() { gl_Position = position; }";
      const fs = "void main() { out_FragColor = vec4(1.0); }";

      const cache = new ShaderCache(context);
      const sp = cache.getShaderProgram({
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: {
          position: 0,
        },
      });

      cache.destroy();

      expect(sp.isDestroyed()).toEqual(true);
      expect(cache.isDestroyed()).toEqual(true);
    });

    it("is not destroyed", function () {
      const cache = new ShaderCache(context);
      expect(cache.isDestroyed()).toEqual(false);
    });
  },
  "WebGL"
);
