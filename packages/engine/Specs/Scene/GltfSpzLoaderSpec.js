import GltfSpzLoader, {
  estimateSpzMemoryBytes,
  getSpzInfoFromGltf,
} from "../../Source/Scene/GltfSpzLoader.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe("Scene/GltfSpzLoader", function () {
  const spzDataBase64 =
    "H4sIAAAAAAAAA71SwQnDQAw7uG836Cfb9FcKXag7dIe8O4JHySAB162JHgEHKYQInzGOLHTn3G/PR2+tXeP0S6RpbkP/RRboRI4IZJ3IIj+taGjmSEplXomgCUABBtCHPQT0wUcf4vAGJjxMs9d41XjXMdbxORpxDzvrbLxGCWlo6733q5oyYIoNmriQaRsuqNOiILMTtlihyIqPP5m2YYoNZSmmLMWUpci/Bm3DFXlnVUGmbZhiQ3kOV5bi/FK+X6yM/usGAAA=";

  function decodeBase64(value) {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  }

  it("derives point count and spherical harmonics degree from glTF JSON", function () {
    const gltf = {
      accessors: [
        {
          count: 4913000,
        },
      ],
    };

    const primitive = {
      attributes: {
        POSITION: 0,
        _SH_DEGREE_1_COEF_0: 1,
        _SH_DEGREE_3_COEF_0: 2,
      },
    };

    expect(getSpzInfoFromGltf(gltf, primitive)).toEqual({
      numPoints: 4913000,
      shDegree: 3,
    });
  });

  it("returns undefined when glTF metadata needed for the estimate is missing", function () {
    const gltf = {
      accessors: [],
    };

    const primitive = {
      attributes: {},
    };

    expect(getSpzInfoFromGltf(gltf, primitive)).toBeUndefined();
  });

  it("estimates SPZ decode memory usage", function () {
    expect(estimateSpzMemoryBytes(4913000, 3)).toBe(2318936000);
  });

  it("loads the bufferView specified by the SPZ extension", async function () {
    const gltf = {};
    const primitive = {};
    const spz = {
      bufferView: 1,
    };
    const gltfResource = {};
    const baseResource = {};
    const bufferViewLoader = {
      typedArray: new Uint8Array([1, 2, 3, 4]),
      load: jasmine.createSpy("load").and.returnValue(Promise.resolve()),
    };
    const resourceCache = function () {};
    resourceCache.getBufferViewLoader = jasmine
      .createSpy("getBufferViewLoader")
      .and.returnValue(bufferViewLoader);
    resourceCache.unload = jasmine.createSpy("unload");

    const loader = new GltfSpzLoader({
      resourceCache: resourceCache,
      gltf: gltf,
      primitive: primitive,
      spz: spz,
      gltfResource: gltfResource,
      baseResource: baseResource,
    });

    await loader.load();

    expect(resourceCache.getBufferViewLoader).toHaveBeenCalledWith({
      gltf: gltf,
      bufferViewId: 1,
      gltfResource: gltfResource,
      baseResource: baseResource,
    });
  });

  it("decodes SPZ data in a worker", async function () {
    const gltf = {
      accessors: [{ count: 27 }],
    };
    const primitive = {
      attributes: {
        POSITION: 0,
        _SH_DEGREE_3_COEF_0: 1,
      },
    };
    const spz = {
      bufferView: 0,
    };
    const bufferViewLoader = {
      typedArray: decodeBase64(spzDataBase64),
      load: jasmine.createSpy("load").and.resolveTo(),
    };
    const resourceCache = function () {};
    resourceCache.getBufferViewLoader = jasmine
      .createSpy("getBufferViewLoader")
      .and.returnValue(bufferViewLoader);
    resourceCache.unload = jasmine.createSpy("unload");

    const loader = new GltfSpzLoader({
      resourceCache: resourceCache,
      gltf: gltf,
      primitive: primitive,
      spz: spz,
      gltfResource: {},
      baseResource: {},
    });

    await loader.load();
    await pollToPromise(() => loader.process({}));

    const result = loader.decodedData.gcloud;
    expect(result.numPoints).toBe(27);
    expect(result.shDegree).toBe(3);
    expect(result.positions.BYTES_PER_ELEMENT).toBe(
      Float32Array.BYTES_PER_ELEMENT,
    );
    expect(result.positions.length).toBe(81);
    expect(result.sh.BYTES_PER_ELEMENT).toBe(Float32Array.BYTES_PER_ELEMENT);
    expect(result.sh.length).toBe(1215);
    expect(bufferViewLoader.typedArray.byteLength).toBe(200);
  });
});
