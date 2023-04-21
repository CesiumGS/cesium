import {
  ArticulationStageType,
  AttributeType,
  Axis,
  Cartesian2,
  Cartesian3,
  Cartesian4,
  combine,
  ComponentDatatype,
  defaultValue,
  GltfStructuralMetadataLoader,
  GltfIndexBufferLoader,
  GltfJsonLoader,
  GltfLoader,
  GltfTextureLoader,
  GltfVertexBufferLoader,
  IndexDatatype,
  InstanceAttributeSemantic,
  InterpolationType,
  JobScheduler,
  PrimitiveType,
  Matrix2,
  Matrix4,
  Math as CesiumMath,
  MetadataComponentType,
  MetadataType,
  ModelComponents,
  Resource,
  ResourceCache,
  ResourceLoaderState,
  RuntimeError,
  Sampler,
  Texture,
  TextureMagnificationFilter,
  TextureMinificationFilter,
  TextureWrap,
  VertexAttributeSemantic,
  Quaternion,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";
import generateJsonBuffer from "../../../../Specs/generateJsonBuffer.js";
import loaderProcess from "../../../../Specs/loaderProcess.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";
import waitForLoaderProcess from "../../../../Specs/waitForLoaderProcess.js";

describe(
  "Scene/GltfLoader",
  function () {
    const boxWithCredits =
      "./Data/Models/glTF-2.0/BoxWithCopyright/glTF/Box.gltf";
    const boxInterleaved =
      "./Data/Models/glTF-2.0/BoxInterleaved/glTF/BoxInterleaved.gltf";
    const boxTextured =
      "./Data/Models/glTF-2.0/BoxTextured/glTF/BoxTextured.gltf";
    const boxTexturedBinary =
      "./Data/Models/glTF-2.0/BoxTextured/glTF-Binary/BoxTextured.glb";
    const boxTexturedEmbedded =
      "./Data/Models/glTF-2.0/BoxTextured/glTF-Embedded/BoxTextured.gltf";
    const boxTexturedKtx2Basis =
      "./Data/Models/glTF-2.0/BoxTexturedKtx2Basis/glTF/BoxTexturedKtx2Basis.gltf";
    const boxTexturedKtx2BasisBinary =
      "./Data/Models/glTF-2.0/BoxTexturedKtx2Basis/glTF-Binary/BoxTexturedKtx2Basis.glb";
    const boxVertexColors =
      "./Data/Models/glTF-2.0/BoxVertexColors/glTF/BoxVertexColors.gltf";
    const simpleMorph =
      "./Data/Models/glTF-2.0/SimpleMorph/glTF/SimpleMorph.gltf";
    const simpleSkin = "./Data/Models/glTF-2.0/SimpleSkin/glTF/SimpleSkin.gltf";
    const animatedTriangle =
      "./Data/Models/glTF-2.0/AnimatedTriangle/glTF/AnimatedTriangle.gltf";
    const animatedMorphCube =
      "./Data/Models/glTF-2.0/AnimatedMorphCube/glTF/AnimatedMorphCube.gltf";
    const interpolationTest =
      "./Data/Models/glTF-2.0/InterpolationTest/glTF-Binary/InterpolationTest.glb";
    const triangle = "./Data/Models/glTF-2.0/Triangle/glTF/Triangle.gltf";
    const triangleWithoutIndices =
      "./Data/Models/glTF-2.0/TriangleWithoutIndices/glTF/TriangleWithoutIndices.gltf";
    const twoSidedPlane =
      "./Data/Models/glTF-2.0/TwoSidedPlane/glTF/TwoSidedPlane.gltf";
    const unlitTest = "./Data/Models/glTF-2.0/UnlitTest/glTF/UnlitTest.gltf";
    const microcosm = "./Data/Models/glTF-2.0/Microcosm/glTF/microcosm.gltf";
    const microcosmLegacy =
      "./Data/Models/glTF-2.0/Microcosm/glTF/microcosm_EXT_feature_metadata.gltf";
    const buildingsMetadata =
      "./Data/Models/glTF-2.0/BuildingsMetadata/glTF/buildings-metadata.gltf";
    const buildingsMetadataLegacy =
      "./Data/Models/glTF-2.0/BuildingsMetadata/glTF/buildings-metadata_EXT_feature_metadata.gltf";
    const weather = "./Data/Models/glTF-2.0/Weather/glTF/weather.gltf";
    const weatherLegacy =
      "./Data/Models/glTF-2.0/Weather/glTF/weather_EXT_feature_metadata.gltf";
    const pointCloudWithPropertyAttributes =
      "./Data/Models/glTF-2.0/PointCloudWithPropertyAttributes/glTF/PointCloudWithPropertyAttributes.gltf";
    const boxWithPropertyAttributes =
      "./Data/Models/glTF-2.0/BoxTexturedWithPropertyAttributes/glTF/BoxTexturedWithPropertyAttributes.gltf";
    const boxInstanced =
      "./Data/Models/glTF-2.0/BoxInstanced/glTF/box-instanced.gltf";
    const boxInstancedLegacy =
      "./Data/Models/glTF-2.0/BoxInstanced/glTF/box-instanced_EXT_feature_metadata.gltf";
    const boxInstancedInterleaved =
      "./Data/Models/glTF-2.0/BoxInstancedInterleaved/glTF/box-instanced-interleaved.gltf";
    const boxInstancedTranslation =
      "./Data/Models/glTF-2.0/BoxInstancedTranslation/glTF/box-instanced-translation.gltf";
    const boxInstancedTranslationMinMax =
      "./Data/Models/glTF-2.0/BoxInstancedTranslationWithMinMax/glTF/box-instanced-translation-min-max.gltf";
    const duckDraco = "./Data/Models/glTF-2.0/Duck/glTF-Draco/Duck.gltf";
    const boxMixedCompression =
      "./Data/Models/glTF-2.0/BoxMixedCompression/glTF/BoxMixedCompression.gltf";
    const boomBoxSpecularGlossiness =
      "./Data/Models/glTF-2.0/BoomBox/glTF-pbrSpecularGlossiness/BoomBox.gltf";
    const largeFeatureIdTexture =
      "./Data/Models/glTF-2.0/LargeFeatureIdTexture/glTF/LargeFeatureIdTexture.gltf";
    const boxArticulations =
      "./Data/Models/glTF-2.0/BoxArticulations/glTF/BoxArticulations.gltf";
    const boxWithPrimitiveOutline =
      "./Data/Models/glTF-2.0/BoxWithPrimitiveOutline/glTF/BoxWithPrimitiveOutline.gltf";
    const boxWithPrimitiveOutlineSharedVertices =
      "./Data/Models/glTF-2.0/BoxWithPrimitiveOutlineSharedVertices/glTF/BoxWithPrimitiveOutlineSharedVertices.gltf";
    const multiUvTest =
      "./Data/Models/glTF-2.0/MultiUVTest/glTF-Binary/MultiUVTest.glb";
    const boxCesiumRtc =
      "./Data/Models/glTF-2.0/BoxCesiumRtc/glTF/BoxCesiumRtc.gltf";
    const torusQuantized =
      "./Data/Models/glTF-2.0/TorusQuantized/glTF/TorusQuantized.gltf";
    const boxWeb3dQuantizedAttributes =
      "./Data/Models/glTF-2.0/BoxWeb3dQuantizedAttributes/glTF/BoxWeb3dQuantizedAttributes.gltf";

    let scene;
    const gltfLoaders = [];

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      const gltfLoadersLength = gltfLoaders.length;
      for (let i = 0; i < gltfLoadersLength; ++i) {
        const gltfLoader = gltfLoaders[i];
        if (!gltfLoader.isDestroyed()) {
          gltfLoader.destroy();
        }
      }
      gltfLoaders.length = 0;
      ResourceCache.clearForSpecs();
    });

    it("throws if gltfResource is undefined", function () {
      expect(function () {
        return new GltfVertexBufferLoader({
          gltfResource: undefined,
        });
      }).toThrowDeveloperError();
    });

    it("load throws if glTF JSON fails to load", async function () {
      const error = new Error("404 Not Found");
      spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
        Promise.reject(error)
      );

      const gltfResource = new Resource({
        url: "https://example.com/model.glb",
      });

      const gltfLoader = new GltfLoader({
        gltfResource: gltfResource,
        releaseGltfJson: true,
      });
      gltfLoaders.push(gltfLoader);

      await expectAsync(gltfLoader.load()).toBeRejectedWithError(
        RuntimeError,
        "Failed to load glTF\nFailed to load glTF: https://example.com/model.glb\n404 Not Found"
      );
    });

    function getOptions(gltfPath, options) {
      const resource = new Resource({
        url: gltfPath,
      });

      return combine(options, {
        gltfResource: resource,
        incrementallyLoadTextures: false, // Default to false if not supplied
      });
    }

    async function loadGltf(gltfPath, options) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);
      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      const targetScene = defaultValue(options.scene, scene);
      gltfLoaders.push(gltfLoader);
      await gltfLoader.load();
      await waitForLoaderProcess(gltfLoader, targetScene);
      return gltfLoader;
    }

    async function loadGltfFromJson(gltfPath, options) {
      const gltf = await Resource.fetchJson({
        url: gltfPath,
      });
      const loaderOptions = combine(options, {
        gltf: gltf,
        gltfResource: new Resource({
          url: gltfPath,
        }),
        incrementallyLoadTextures: false,
      });
      const gltfLoader = new GltfLoader(loaderOptions);
      gltfLoaders.push(gltfLoader);

      await gltfLoader.load();
      await waitForLoaderProcess(gltfLoader, scene);
      return gltfLoader;
    }

    async function loadModifiedGltfAndTest(gltfPath, options, modifyFunction) {
      let gltf = await Resource.fetchJson({
        url: gltfPath,
      });

      gltf = modifyFunction(gltf);

      spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
        Promise.resolve(generateJsonBuffer(gltf).buffer)
      );

      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      gltfLoaders.push(gltfLoader);

      await gltfLoader.load();
      await waitForLoaderProcess(gltfLoader, scene);

      return gltfLoader;
    }

    function getAttribute(attributes, semantic, setIndex) {
      const attributesLength = attributes.length;
      for (let i = 0; i < attributesLength; ++i) {
        const attribute = attributes[i];
        if (
          attribute.semantic === semantic &&
          attribute.setIndex === setIndex
        ) {
          return attribute;
        }
      }
      return undefined;
    }

    function getAttributeByName(attributes, name) {
      const attributesLength = attributes.length;
      for (let i = 0; i < attributesLength; ++i) {
        const attribute = attributes[i];
        if (attribute.name === name) {
          return attribute;
        }
      }
      return undefined;
    }

    it("preserves query string in url", async function () {
      const params = "?param1=1&param2=2";
      const url = boxTextured + params;
      const gltfLoader = new GltfLoader(getOptions(url));
      gltfLoaders.push(gltfLoader);
      await gltfLoader.load();
      const loaderResource = gltfLoader._gltfResource;
      expect(loaderResource.url).toEndWith(params);
    });

    it("releases GLB typed array when finished loading", function () {
      return loadGltf(boxTexturedBinary).then(function (gltfLoader) {
        expect(gltfLoader.components).toBeDefined();
        expect(gltfLoader._typedArray).not.toBeDefined();
      });
    });

    it("loads BoxInterleaved", function () {
      return loadGltf(boxInterleaved).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const childNode = rootNode.children[0];
        const primitive = childNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );

        expect(positionAttribute.buffer).toBeDefined();
        expect(positionAttribute.byteOffset).toBe(12);
        expect(positionAttribute.byteStride).toBe(24);

        expect(normalAttribute.buffer).toBeDefined();
        expect(normalAttribute.byteOffset).toBe(0);
        expect(normalAttribute.byteStride).toBe(24);

        expect(positionAttribute.buffer).toBe(normalAttribute.buffer);
        expect(positionAttribute.buffer.sizeInBytes).toBe(576);
      });
    });

    function loadsBoxTextured(gltfPath) {
      return loadGltf(gltfPath).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const nodes = components.nodes;
        const rootNode = scene.nodes[0];
        const childNode = rootNode.children[0];
        const primitive = childNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const texcoordAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.TEXCOORD,
          0
        );

        const indices = primitive.indices;
        const material = primitive.material;
        const metallicRoughness = material.metallicRoughness;

        // prettier-ignore
        const rootMatrix = new Matrix4(
          1.0, 0.0, 0.0, 0.0,
          0.0, 0.0, 1.0, 0.0,
          0.0, -1.0, 0.0, 0.0,
          0.0, 0.0, 0.0, 1.0
        );

        const childMatrix = Matrix4.IDENTITY;

        expect(rootNode.children.length).toBe(1);
        expect(rootNode.primitives.length).toBe(0);
        expect(rootNode.matrix).toEqual(rootMatrix);
        expect(rootNode.translation).toBeUndefined();
        expect(rootNode.rotation).toBeUndefined();
        expect(rootNode.scale).toBeUndefined();

        expect(childNode.children.length).toBe(0);
        expect(childNode.primitives.length).toBe(1);
        expect(childNode.matrix).toEqual(childMatrix);
        expect(childNode.translation).toBeUndefined();
        expect(childNode.rotation).toBeUndefined();
        expect(childNode.scale).toBeUndefined();

        expect(primitive.attributes.length).toBe(3);
        expect(primitive.primitiveType).toBe(PrimitiveType.TRIANGLES);

        expect(positionAttribute.name).toBe("POSITION");
        expect(positionAttribute.semantic).toBe(
          VertexAttributeSemantic.POSITION
        );
        expect(positionAttribute.setIndex).toBeUndefined();
        expect(positionAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.type).toBe(AttributeType.VEC3);
        expect(positionAttribute.normalized).toBe(false);
        expect(positionAttribute.count).toBe(24);
        expect(positionAttribute.min).toEqual(new Cartesian3(-0.5, -0.5, -0.5));
        expect(positionAttribute.max).toEqual(new Cartesian3(0.5, 0.5, 0.5));
        expect(positionAttribute.constant).toEqual(Cartesian3.ZERO);
        expect(positionAttribute.quantization).toBeUndefined();
        expect(positionAttribute.typedArray).toBeUndefined();
        expect(positionAttribute.buffer).toBeDefined();
        expect(positionAttribute.byteOffset).toBe(288);
        expect(positionAttribute.byteStride).toBe(12);

        expect(normalAttribute.name).toBe("NORMAL");
        expect(normalAttribute.semantic).toBe(VertexAttributeSemantic.NORMAL);
        expect(normalAttribute.setIndex).toBeUndefined();
        expect(normalAttribute.componentDatatype).toBe(ComponentDatatype.FLOAT);
        expect(normalAttribute.type).toBe(AttributeType.VEC3);
        expect(normalAttribute.normalized).toBe(false);
        expect(normalAttribute.count).toBe(24);
        expect(normalAttribute.min).toEqual(new Cartesian3(-1.0, -1.0, -1.0));
        expect(normalAttribute.max).toEqual(new Cartesian3(1.0, 1.0, 1.0));
        expect(normalAttribute.constant).toEqual(Cartesian3.ZERO);
        expect(normalAttribute.quantization).toBeUndefined();
        expect(normalAttribute.typedArray).toBeUndefined();
        expect(normalAttribute.buffer).toBeDefined();
        expect(normalAttribute.byteOffset).toBe(0);
        expect(normalAttribute.byteStride).toBe(12);

        expect(texcoordAttribute.name).toBe("TEXCOORD_0");
        expect(texcoordAttribute.semantic).toBe(
          VertexAttributeSemantic.TEXCOORD
        );
        expect(texcoordAttribute.setIndex).toBe(0);
        expect(texcoordAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(texcoordAttribute.type).toBe(AttributeType.VEC2);
        expect(texcoordAttribute.normalized).toBe(false);
        expect(texcoordAttribute.count).toBe(24);
        expect(texcoordAttribute.min).toEqual(new Cartesian2(0.0, 0.0));
        expect(texcoordAttribute.max).toEqual(new Cartesian2(6.0, 1.0));
        expect(texcoordAttribute.constant).toEqual(Cartesian2.ZERO);
        expect(texcoordAttribute.quantization).toBeUndefined();
        expect(texcoordAttribute.typedArray).toBeUndefined();
        expect(texcoordAttribute.buffer).toBeDefined();
        expect(texcoordAttribute.byteOffset).toBe(0);
        expect(texcoordAttribute.byteStride).toBe(8);

        expect(indices.indexDatatype).toBe(IndexDatatype.UNSIGNED_SHORT);
        expect(indices.count).toBe(36);
        expect(indices.buffer).toBeDefined();
        expect(indices.buffer.sizeInBytes).toBe(72);

        expect(positionAttribute.buffer).toBe(normalAttribute.buffer);
        expect(positionAttribute.buffer).not.toBe(texcoordAttribute.buffer);

        expect(positionAttribute.buffer.sizeInBytes).toBe(576);
        expect(texcoordAttribute.buffer.sizeInBytes).toBe(192);

        expect(metallicRoughness.baseColorFactor).toEqual(
          new Cartesian4(1.0, 1.0, 1.0, 1.0)
        );
        expect(metallicRoughness.metallicFactor).toBe(0.0);
        expect(metallicRoughness.roughnessFactor).toBe(1.0);
        expect(metallicRoughness.baseColorTexture.texture.width).toBe(256);
        expect(metallicRoughness.baseColorTexture.texture.height).toBe(256);
        expect(metallicRoughness.baseColorTexture.texCoord).toBe(0);

        const sampler = metallicRoughness.baseColorTexture.texture.sampler;
        expect(sampler.wrapS).toBe(TextureWrap.REPEAT);
        expect(sampler.wrapT).toBe(TextureWrap.REPEAT);
        expect(sampler.magnificationFilter).toBe(
          TextureMagnificationFilter.LINEAR
        );
        expect(sampler.minificationFilter).toBe(
          TextureMinificationFilter.NEAREST_MIPMAP_LINEAR
        );

        expect(nodes.length).toBe(2);
        expect(scene.nodes.length).toBe(1);
      });
    }

    it("loads BoxTextured", function () {
      return loadsBoxTextured(boxTextured);
    });

    it("loads BoxTexturedBinary", function () {
      return loadsBoxTextured(boxTexturedBinary);
    });

    it("loads BoxTexturedEmbedded", function () {
      return loadsBoxTextured(boxTexturedEmbedded);
    });

    it("loads BoxTextured with texture source removed", function () {
      function modifyGltf(gltf) {
        delete gltf.textures[0].source;
        return gltf;
      }

      return loadModifiedGltfAndTest(boxTextured, undefined, modifyGltf).then(
        function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const childNode = rootNode.children[0];
          const primitive = childNode.primitives[0];
          const material = primitive.material;
          const metallicRoughness = material.metallicRoughness;

          expect(metallicRoughness.baseColorTexture).toBeUndefined();
        }
      );
    });

    function loadsBoxTexturedKtx2Basis(gltfPath) {
      return loadGltf(gltfPath).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const childNode = rootNode.children[0];
        const primitive = childNode.primitives[0];
        const material = primitive.material;
        const metallicRoughness = material.metallicRoughness;

        const texture = metallicRoughness.baseColorTexture.texture;
        const sampler = texture.sampler;

        expect(texture.width).toBe(256);
        expect(texture.height).toBe(256);

        expect(sampler.wrapS).toBe(TextureWrap.REPEAT);
        expect(sampler.wrapT).toBe(TextureWrap.REPEAT);
        expect(sampler.magnificationFilter).toBe(
          TextureMagnificationFilter.LINEAR
        );
        expect(sampler.minificationFilter).toBe(
          TextureMinificationFilter.LINEAR
        );
      });
    }

    it("loads BoxTexturedKtx2Basis", function () {
      if (!scene.context.supportsBasis) {
        return;
      }
      return loadsBoxTexturedKtx2Basis(boxTexturedKtx2Basis);
    });

    it("loads BoxTexturedKtx2BasisBinary", function () {
      if (!scene.context.supportsBasis) {
        return;
      }
      return loadsBoxTexturedKtx2Basis(boxTexturedKtx2BasisBinary);
    });

    it("loads BoxVertexColors", function () {
      return loadGltf(boxVertexColors).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const childNode = rootNode.children[1];
        const primitive = childNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const texcoordAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.TEXCOORD,
          0
        );
        const colorAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.COLOR,
          0
        );

        expect(positionAttribute.buffer).toBeDefined();
        expect(positionAttribute.byteOffset).toBe(0);
        expect(positionAttribute.byteStride).toBe(12);

        expect(normalAttribute.buffer).toBeDefined();
        expect(normalAttribute.byteOffset).toBe(0);
        expect(normalAttribute.byteStride).toBe(12);

        expect(texcoordAttribute.buffer).toBeDefined();
        expect(texcoordAttribute.byteOffset).toBe(0);
        expect(texcoordAttribute.byteStride).toBe(8);

        expect(colorAttribute.name).toBe("COLOR_0");
        expect(colorAttribute.semantic).toBe(VertexAttributeSemantic.COLOR);
        expect(colorAttribute.setIndex).toBe(0);
        expect(colorAttribute.componentDatatype).toBe(ComponentDatatype.FLOAT);
        expect(colorAttribute.type).toBe(AttributeType.VEC4);
        expect(colorAttribute.normalized).toBe(false);
        expect(colorAttribute.count).toBe(24);
        expect(colorAttribute.min).toBeUndefined();
        expect(colorAttribute.max).toBeUndefined();
        expect(colorAttribute.constant).toEqual(Cartesian4.ZERO);
        expect(colorAttribute.quantization).toBeUndefined();
        expect(colorAttribute.typedArray).toBeUndefined();
        expect(colorAttribute.buffer).toBeDefined();
        expect(colorAttribute.byteOffset).toBe(0);
        expect(colorAttribute.byteStride).toBe(16);

        expect(colorAttribute.buffer.sizeInBytes).toBe(384);
      });
    });

    it("loads BoxVertexColors with default vertex colors", function () {
      function modifyGltf(gltf) {
        // Delete vertex color accessor's buffer view
        delete gltf.accessors[3].bufferView;
        return gltf;
      }

      return loadModifiedGltfAndTest(
        boxVertexColors,
        undefined,
        modifyGltf
      ).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const childNode = rootNode.children[1];
        const primitive = childNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const texcoordAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.TEXCOORD,
          0
        );
        const colorAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.COLOR,
          0
        );

        expect(positionAttribute.buffer).toBeDefined();
        expect(normalAttribute.buffer).toBeDefined();
        expect(texcoordAttribute.buffer).toBeDefined();

        expect(colorAttribute.buffer).toBeUndefined();
        expect(colorAttribute.typedArray).toBeUndefined();
        expect(colorAttribute.constant).toEqual(Cartesian4.ZERO);
      });
    });

    it("loads SimpleMorph", function () {
      return loadGltf(simpleMorph).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const morphTargets = primitive.morphTargets;
        const morphTarget0 = morphTargets[0];
        const morphTarget1 = morphTargets[1];
        const morphPositions0 = getAttribute(
          morphTarget0.attributes,
          VertexAttributeSemantic.POSITION
        );
        const morphPositions1 = getAttribute(
          morphTarget1.attributes,
          VertexAttributeSemantic.POSITION
        );

        expect(morphPositions0.name).toBe("POSITION");
        expect(morphPositions0.semantic).toBe(VertexAttributeSemantic.POSITION);
        expect(morphPositions0.setIndex).toBeUndefined();
        expect(morphPositions0.componentDatatype).toBe(ComponentDatatype.FLOAT);
        expect(morphPositions0.type).toBe(AttributeType.VEC3);
        expect(morphPositions0.normalized).toBe(false);
        expect(morphPositions0.count).toBe(3);
        expect(morphPositions0.min).toEqual(new Cartesian3(-1.0, 0.0, 0.0));
        expect(morphPositions0.max).toEqual(new Cartesian3(0.0, 1.0, 0.0));
        expect(morphPositions0.constant).toEqual(Cartesian3.ZERO);
        expect(morphPositions0.quantization).toBeUndefined();
        expect(morphPositions0.typedArray).toBeUndefined();
        expect(morphPositions0.buffer).toBeDefined();
        expect(morphPositions0.byteOffset).toBe(36);
        expect(morphPositions0.byteStride).toBe(12);

        expect(morphPositions1.name).toBe("POSITION");
        expect(morphPositions1.semantic).toBe(VertexAttributeSemantic.POSITION);
        expect(morphPositions1.setIndex).toBeUndefined();
        expect(morphPositions1.componentDatatype).toBe(ComponentDatatype.FLOAT);
        expect(morphPositions1.type).toBe(AttributeType.VEC3);
        expect(morphPositions1.normalized).toBe(false);
        expect(morphPositions1.count).toBe(3);
        expect(morphPositions1.min).toEqual(new Cartesian3(0.0, 0.0, 0.0));
        expect(morphPositions1.max).toEqual(new Cartesian3(1.0, 1.0, 0.0));
        expect(morphPositions1.constant).toEqual(Cartesian3.ZERO);
        expect(morphPositions1.quantization).toBeUndefined();
        expect(morphPositions1.typedArray).toBeUndefined();
        expect(morphPositions1.buffer).toBeDefined();
        expect(morphPositions1.byteOffset).toBe(72);
        expect(morphPositions1.byteStride).toBe(12);

        expect(positionAttribute.buffer).toBe(morphPositions0.buffer);
        expect(positionAttribute.buffer).toBe(morphPositions1.buffer);
        expect(positionAttribute.buffer.sizeInBytes).toBe(108);

        expect(rootNode.morphWeights).toEqual([0.5, 0.5]);
      });
    });

    it("loads SimpleMorph with default morph weights", function () {
      function modifyGltf(gltf) {
        // Delete morph weights
        delete gltf.meshes[0].weights;
        return gltf;
      }

      return loadModifiedGltfAndTest(simpleMorph, undefined, modifyGltf).then(
        function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          expect(rootNode.morphWeights).toEqual([0.0, 0.0]);
        }
      );
    });

    it("loads SimpleSkin", function () {
      return loadGltf(simpleSkin).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const nodes = components.nodes;
        const skin = rootNode.skin;
        const primitive = rootNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const jointsAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.JOINTS,
          0
        );
        const weightsAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.WEIGHTS,
          0
        );

        expect(positionAttribute.buffer).toBeDefined();
        expect(positionAttribute.byteOffset).toBe(0);
        expect(positionAttribute.byteStride).toBe(12);

        expect(jointsAttribute.name).toBe("JOINTS_0");
        expect(jointsAttribute.semantic).toBe(VertexAttributeSemantic.JOINTS);
        expect(jointsAttribute.setIndex).toBe(0);
        expect(jointsAttribute.componentDatatype).toBe(
          ComponentDatatype.UNSIGNED_SHORT
        );
        expect(jointsAttribute.type).toBe(AttributeType.VEC4);
        expect(jointsAttribute.normalized).toBe(false);
        expect(jointsAttribute.count).toBe(10);
        expect(jointsAttribute.min).toBeUndefined();
        expect(jointsAttribute.max).toBeUndefined();
        expect(jointsAttribute.constant).toEqual(Cartesian4.ZERO);
        expect(jointsAttribute.quantization).toBeUndefined();
        expect(jointsAttribute.typedArray).toBeUndefined();
        expect(jointsAttribute.buffer).toBeDefined();
        expect(jointsAttribute.byteOffset).toBe(0);
        expect(jointsAttribute.byteStride).toBe(16);

        expect(weightsAttribute.name).toBe("WEIGHTS_0");
        expect(weightsAttribute.semantic).toBe(VertexAttributeSemantic.WEIGHTS);
        expect(weightsAttribute.setIndex).toBe(0);
        expect(weightsAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(weightsAttribute.type).toBe(AttributeType.VEC4);
        expect(weightsAttribute.normalized).toBe(false);
        expect(weightsAttribute.count).toBe(10);
        expect(weightsAttribute.min).toBeUndefined();
        expect(weightsAttribute.max).toBeUndefined();
        expect(weightsAttribute.constant).toEqual(Cartesian4.ZERO);
        expect(weightsAttribute.quantization).toBeUndefined();
        expect(weightsAttribute.typedArray).toBeUndefined();
        expect(weightsAttribute.buffer).toBeDefined();
        expect(weightsAttribute.byteOffset).toBe(160);
        expect(weightsAttribute.byteStride).toBe(16);

        expect(components.skins).toEqual([skin]);

        expect(skin.joints.length).toBe(2);
        expect(skin.joints[0]).toBe(nodes[1]);
        expect(skin.joints[1]).toBe(nodes[2]);
        expect(skin.inverseBindMatrices).toEqual([
          // prettier-ignore
          Matrix4.fromColumnMajorArray([
            1.00000, 0.00000, 0.00000, 0.00000,
            0.00000, 1.00000, 0.00000, 0.00000,
            0.00000, 0.00000, 1.00000, 0.00000,
            0.00000, -1.00000, 0.00000, 1.00000
          ]),
          // prettier-ignore
          Matrix4.fromColumnMajorArray([
            1.00000, 0.00000, 0.00000, 0.00000,
            0.00000, 1.00000, 0.00000, 0.00000,
            0.00000, 0.00000, 1.00000, 0.00000,
            0.00000, -1.00000, 0.00000, 1.00000
          ]),
        ]);
      });
    });

    it("loads SimpleSkin with default inverse bind matrices", function () {
      function modifyGltf(gltf) {
        // Delete morph weights
        delete gltf.skins[0].inverseBindMatrices;
        return gltf;
      }

      return loadModifiedGltfAndTest(simpleSkin, undefined, modifyGltf).then(
        function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const skin = rootNode.skin;
          expect(skin.inverseBindMatrices).toEqual([
            Matrix4.IDENTITY,
            Matrix4.IDENTITY,
          ]);
        }
      );
    });

    it("loads AnimatedTriangle", function () {
      return loadGltf(animatedTriangle).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const animations = components.animations;
        const primitive = rootNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );

        expect(positionAttribute.buffer).toBeDefined();
        expect(positionAttribute.byteOffset).toBe(0);
        expect(positionAttribute.byteStride).toBe(12);

        const animation = animations[0];
        expect(animation.samplers.length).toEqual(1);

        const sampler = animation.samplers[0];
        const expectedInput = [0, 0.25, 0.5, 0.75, 1.0];
        const expectedOutput = [
          new Quaternion(0.0, 0.0, 0.0, 1.0),
          new Quaternion(0.0, 0.0, 0.707, 0.707),
          new Quaternion(0.0, 0.0, 1.0, 0.0),
          new Quaternion(0.0, 0.0, 0.707, -0.707),
          new Quaternion(0.0, 0.0, 0.0, 1.0),
        ];
        expect(sampler.input).toEqual(expectedInput);
        expect(sampler.interpolation).toEqual(InterpolationType.LINEAR);

        const length = expectedOutput.length;
        for (let i = 0; i < length; i++) {
          expect(
            Quaternion.equalsEpsilon(
              sampler.output[i],
              expectedOutput[i],
              CesiumMath.EPSILON3
            )
          ).toBe(true);
        }

        expect(animation.channels.length).toEqual(1);
        const channel = animation.channels[0];
        expect(channel.sampler).toBe(sampler);
        expect(channel.target.node).toBe(rootNode);
        expect(channel.target.path).toEqual(
          ModelComponents.AnimatedPropertyType.ROTATION
        );
      });
    });

    it("loads AnimatedMorphCube", function () {
      return loadGltf(animatedMorphCube).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const animations = components.animations;
        const primitive = rootNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );

        expect(positionAttribute.buffer).toBeDefined();
        expect(positionAttribute.byteOffset).toBe(0);
        expect(positionAttribute.byteStride).toBe(12);

        const animation = animations[0];
        expect(animation.samplers.length).toEqual(1);

        const sampler = animation.samplers[0];
        expect(sampler.input.length).toEqual(127);
        expect(sampler.interpolation).toEqual(InterpolationType.LINEAR);
        expect(sampler.output.length).toEqual(254);

        expect(animation.channels.length).toEqual(1);
        const channel = animation.channels[0];
        expect(channel.sampler).toBe(sampler);
        expect(channel.target.node).toBe(rootNode);
        expect(channel.target.path).toEqual(
          ModelComponents.AnimatedPropertyType.WEIGHTS
        );
      });
    });

    it("loads InterpolationTest", function () {
      return loadGltf(interpolationTest).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const nodes = components.nodes;
        const animations = components.animations;

        const stepScaleAnimation = animations[0];
        expect(stepScaleAnimation.samplers.length).toEqual(1);

        let sampler = stepScaleAnimation.samplers[0];
        expect(sampler.input.length).toEqual(sampler.output.length);
        expect(sampler.interpolation).toEqual(InterpolationType.STEP);
        expect(sampler.output[0] instanceof Cartesian3).toBe(true);

        expect(stepScaleAnimation.channels.length).toEqual(1);
        let channel = stepScaleAnimation.channels[0];
        expect(channel.sampler).toBe(sampler);
        expect(channel.target.node).toBe(nodes[0]);
        expect(channel.target.path).toEqual(
          ModelComponents.AnimatedPropertyType.SCALE
        );

        const cubicSplineRotation = animations[4];
        expect(cubicSplineRotation.samplers.length).toEqual(1);

        sampler = cubicSplineRotation.samplers[0];
        // For cubic spline interpolation, each keyframe requires 3 output entries
        expect(sampler.output.length).toEqual(sampler.input.length * 3);
        expect(sampler.interpolation).toEqual(InterpolationType.CUBICSPLINE);
        expect(sampler.output[0] instanceof Quaternion).toBe(true);

        expect(cubicSplineRotation.channels.length).toEqual(1);
        channel = cubicSplineRotation.channels[0];
        expect(channel.sampler).toBe(sampler);
        expect(channel.target.node).toBe(nodes[6]);
        expect(channel.target.path).toEqual(
          ModelComponents.AnimatedPropertyType.ROTATION
        );

        const linearTranslation = animations[8];
        expect(linearTranslation.samplers.length).toEqual(1);

        sampler = linearTranslation.samplers[0];
        expect(sampler.input.length).toEqual(sampler.output.length);
        expect(sampler.interpolation).toEqual(InterpolationType.LINEAR);
        expect(sampler.output[0] instanceof Cartesian3).toBe(true);

        expect(linearTranslation.channels.length).toEqual(1);
        channel = linearTranslation.channels[0];
        expect(channel.sampler).toBe(sampler);
        expect(channel.target.node).toBe(nodes[10]);
        expect(channel.target.path).toEqual(
          ModelComponents.AnimatedPropertyType.TRANSLATION
        );
      });
    });

    it("loads Triangle", function () {
      return loadGltf(triangle).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );

        expect(positionAttribute).toBeDefined();
        expect(primitive.indices).toBeDefined();
        expect(primitive.indices.indexDatatype).toBe(
          IndexDatatype.UNSIGNED_SHORT
        );
        expect(primitive.indices.count).toBe(3);
        expect(primitive.indices.buffer).toBeDefined();
      });
    });

    it("loads Triangle with indices buffer view removed", function () {
      function modifyGltf(gltf) {
        // Delete indices buffer view
        delete gltf.accessors[0].bufferView;
        return gltf;
      }

      return loadModifiedGltfAndTest(triangle, undefined, modifyGltf).then(
        function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const primitive = rootNode.primitives[0];
          const attributes = primitive.attributes;
          const positionAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.POSITION
          );

          expect(positionAttribute).toBeDefined();
          expect(primitive.indices).toBeUndefined();
        }
      );
    });

    it("loads TriangleWithoutIndices", function () {
      return loadGltf(triangleWithoutIndices).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );

        expect(positionAttribute).toBeDefined();
        expect(primitive.indices).toBeUndefined();
      });
    });

    it("loads TwoSidedPlane", function () {
      return loadGltf(twoSidedPlane).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const material = primitive.material;
        const metallicRoughness = material.metallicRoughness;
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const tangentAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.TANGENT
        );
        const texcoordAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.TEXCOORD,
          0
        );

        expect(positionAttribute).toBeDefined();
        expect(normalAttribute).toBeDefined();
        expect(tangentAttribute).toBeDefined();
        expect(texcoordAttribute).toBeDefined();

        expect(metallicRoughness.baseColorTexture.texture).toBeDefined();
        expect(
          metallicRoughness.metallicRoughnessTexture.texture
        ).toBeDefined();
        expect(material.normalTexture.texture).toBeDefined();
        expect(material.doubleSided).toBe(true);
      });
    });

    it("loads UnlitTest", function () {
      return loadGltf(unlitTest).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const node0 = scene.nodes[0];
        const node1 = scene.nodes[1];
        const primitive0 = node0.primitives[0];
        const primitive1 = node1.primitives[0];
        const material0 = primitive0.material;
        const material1 = primitive1.material;
        expect(material0.unlit).toBe(true);
        expect(material1.unlit).toBe(true);
      });
    });

    it("loads MultiUVTest", function () {
      return loadGltf(multiUvTest).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const material = primitive.material;
        const baseColorTexture = material.metallicRoughness.baseColorTexture;
        const emissiveTexture = material.emissiveTexture;

        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const tangentAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.TANGENT
        );
        const texcoordAttribute0 = getAttribute(
          attributes,
          VertexAttributeSemantic.TEXCOORD,
          0
        );
        const texcoordAttribute1 = getAttribute(
          attributes,
          VertexAttributeSemantic.TEXCOORD,
          1
        );

        expect(positionAttribute).toBeDefined();
        expect(normalAttribute).toBeDefined();
        expect(tangentAttribute).toBeDefined();
        expect(texcoordAttribute0).toBeDefined();
        expect(texcoordAttribute1).toBeDefined();

        expect(baseColorTexture.texCoord).toBe(0);
        expect(emissiveTexture.texCoord).toBe(1);
      });
    });

    it("loads Microcosm", function () {
      return loadGltf(microcosm).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const material = primitive.material;
        const baseColorTexture = material.metallicRoughness.baseColorTexture;
        const structuralMetadata = components.structuralMetadata;

        expect(baseColorTexture.texCoord).toBe(1);
        expect(primitive.featureIds.length).toBe(1);
        expect(primitive.propertyTextureIds).toEqual([0]);

        const featureIdTexture = primitive.featureIds[0];
        expect(featureIdTexture).toBeInstanceOf(
          ModelComponents.FeatureIdTexture
        );
        expect(featureIdTexture.featureCount).toEqual(256);
        expect(featureIdTexture.nullFeatureId).not.toBeDefined();
        expect(featureIdTexture.propertyTableId).toBe(0);
        expect(featureIdTexture.label).toBe("landCover");
        expect(featureIdTexture.positionalLabel).toBe("featureId_0");
        expect(featureIdTexture.textureReader.channels).toBe("r");
        expect(featureIdTexture.textureReader.texCoord).toBe(0);
        expect(featureIdTexture.textureReader.texture.width).toBe(256);
        expect(featureIdTexture.textureReader.texture.height).toBe(256);
        expect(featureIdTexture.textureReader.texture.sampler).toBe(
          Sampler.NEAREST
        );

        const classDefinition = structuralMetadata.schema.classes.landCover;
        const properties = classDefinition.properties;
        expect(properties.name.type).toBe(MetadataType.STRING);
        expect(properties.name.componentType).not.toBeDefined();
        expect(properties.color.type).toBe(MetadataType.VEC3);
        expect(properties.color.componentType).toBe(
          MetadataComponentType.UINT8
        );

        const propertyTable = structuralMetadata.getPropertyTable(0);
        expect(propertyTable.id).toEqual(0);
        expect(propertyTable.name).toEqual("Land Cover");
        expect(propertyTable.count).toBe(256);
        expect(propertyTable.class).toBe(classDefinition);
        expect(propertyTable.getProperty(0, "name")).toBe("Grassland");
        expect(propertyTable.getProperty(0, "color")).toEqual(
          new Cartesian3(118, 163, 11)
        );
        expect(propertyTable.getProperty(255, "name")).toBe("Building");
        expect(propertyTable.getProperty(255, "color")).toEqual(
          new Cartesian3(194, 194, 194)
        );

        const propertyTexture = structuralMetadata.getPropertyTexture(0);
        expect(propertyTexture.id).toEqual(0);
        expect(propertyTexture.name).toEqual("Vegetation");
        const vegetationProperty = propertyTexture.getProperty(
          "vegetationDensity"
        );

        expect(vegetationProperty.textureReader.texture.width).toBe(256);
        expect(vegetationProperty.textureReader.texture.height).toBe(256);
      });
    });

    it("loads Microcosm with EXT_feature_metadata", function () {
      return loadGltf(microcosmLegacy).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const material = primitive.material;
        const baseColorTexture = material.metallicRoughness.baseColorTexture;
        const structuralMetadata = components.structuralMetadata;

        expect(baseColorTexture.texCoord).toBe(1);
        expect(primitive.featureIds.length).toBe(1);
        expect(primitive.propertyTextureIds).toEqual([0]);

        const featureIdTexture = primitive.featureIds[0];
        expect(featureIdTexture).toBeInstanceOf(
          ModelComponents.FeatureIdTexture
        );
        expect(featureIdTexture.featureCount).toEqual(256);
        expect(featureIdTexture.nullFeatureId).not.toBeDefined();
        expect(featureIdTexture.propertyTableId).toBe(0);
        expect(featureIdTexture.label).not.toBeDefined();
        expect(featureIdTexture.positionalLabel).toBe("featureId_0");
        expect(featureIdTexture.textureReader.channels).toBe("r");
        expect(featureIdTexture.textureReader.texCoord).toBe(0);
        expect(featureIdTexture.textureReader.texture.width).toBe(256);
        expect(featureIdTexture.textureReader.texture.height).toBe(256);
        expect(featureIdTexture.textureReader.texture.sampler).toBe(
          Sampler.NEAREST
        );

        const classDefinition = structuralMetadata.schema.classes.landCover;
        const properties = classDefinition.properties;
        expect(properties.name.type).toBe(MetadataType.STRING);
        expect(properties.name.componentType).not.toBeDefined();
        expect(properties.color.type).toBe(MetadataType.SCALAR);
        expect(properties.color.componentType).toBe(
          MetadataComponentType.UINT8
        );
        expect(properties.color.arrayLength).toBe(3);

        const propertyTable = structuralMetadata.getPropertyTable(0);
        expect(propertyTable.id).toEqual("landCoverTable");
        expect(propertyTable.count).toBe(256);
        expect(propertyTable.class).toBe(classDefinition);
        expect(propertyTable.getProperty(0, "name")).toBe("Grassland");
        expect(propertyTable.getProperty(0, "color")).toEqual([118, 163, 11]);
        expect(propertyTable.getProperty(255, "name")).toBe("Building");
        expect(propertyTable.getProperty(255, "color")).toEqual([
          194,
          194,
          194,
        ]);

        const propertyTexture = structuralMetadata.getPropertyTexture(0);
        expect(propertyTexture.id).toEqual("vegetationTexture");
        const vegetationProperty = propertyTexture.getProperty(
          "vegetationDensity"
        );

        expect(vegetationProperty.textureReader.texture.width).toBe(256);
        expect(vegetationProperty.textureReader.texture.height).toBe(256);
      });
    });

    it("Loads model with multi-channel feature ID textures", function () {
      return loadGltf(largeFeatureIdTexture).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const material = primitive.material;
        const baseColorTexture = material.metallicRoughness.baseColorTexture;
        const structuralMetadata = components.structuralMetadata;
        expect(structuralMetadata).not.toBeDefined();

        expect(baseColorTexture.texCoord).toBe(0);
        expect(primitive.featureIds.length).toBe(7);
        expect(primitive.propertyTextureIds).toEqual([]);

        let featureIdTexture = primitive.featureIds[0];
        expect(featureIdTexture).toBeInstanceOf(
          ModelComponents.FeatureIdTexture
        );
        expect(featureIdTexture.featureCount).toEqual(1048576);
        expect(featureIdTexture.nullFeatureId).not.toBeDefined();
        expect(featureIdTexture.propertyTableId).not.toBeDefined();
        expect(featureIdTexture.label).toBe("idsRGBA");
        expect(featureIdTexture.positionalLabel).toBe("featureId_0");
        expect(featureIdTexture.textureReader.channels).toBe("rgba");
        expect(featureIdTexture.textureReader.texCoord).toBe(0);
        const texture = featureIdTexture.textureReader.texture;
        expect(texture.width).toBe(1024);
        expect(texture.height).toBe(1024);
        expect(texture.sampler).toBe(Sampler.NEAREST);

        featureIdTexture = primitive.featureIds[1];
        expect(featureIdTexture).toBeInstanceOf(
          ModelComponents.FeatureIdTexture
        );
        expect(featureIdTexture.featureCount).toEqual(1048576);
        expect(featureIdTexture.nullFeatureId).not.toBeDefined();
        expect(featureIdTexture.propertyTableId).not.toBeDefined();
        expect(featureIdTexture.label).toBe("idsRGB");
        expect(featureIdTexture.positionalLabel).toBe("featureId_1");
        expect(featureIdTexture.textureReader.channels).toBe("rgb");
        expect(featureIdTexture.textureReader.texCoord).toBe(0);
        // All the feature ID textures use the same glTF texture
        expect(featureIdTexture.textureReader.texture).toBe(texture);

        featureIdTexture = primitive.featureIds[2];
        expect(featureIdTexture).toBeInstanceOf(
          ModelComponents.FeatureIdTexture
        );
        expect(featureIdTexture.featureCount).toEqual(256);
        expect(featureIdTexture.nullFeatureId).not.toBeDefined();
        expect(featureIdTexture.propertyTableId).not.toBeDefined();
        expect(featureIdTexture.label).toBe("idsG");
        expect(featureIdTexture.positionalLabel).toBe("featureId_2");
        expect(featureIdTexture.textureReader.channels).toBe("g");
        expect(featureIdTexture.textureReader.texCoord).toBe(0);
        expect(featureIdTexture.textureReader.texture).toBe(texture);

        featureIdTexture = primitive.featureIds[3];
        expect(featureIdTexture).toBeInstanceOf(
          ModelComponents.FeatureIdTexture
        );
        expect(featureIdTexture.featureCount).toEqual(65536);
        expect(featureIdTexture.nullFeatureId).not.toBeDefined();
        expect(featureIdTexture.propertyTableId).not.toBeDefined();
        expect(featureIdTexture.label).toBe("idsBA");
        expect(featureIdTexture.positionalLabel).toBe("featureId_3");
        expect(featureIdTexture.textureReader.channels).toBe("ba");
        expect(featureIdTexture.textureReader.texCoord).toBe(0);
        expect(featureIdTexture.textureReader.texture).toBe(texture);

        featureIdTexture = primitive.featureIds[4];
        expect(featureIdTexture).toBeInstanceOf(
          ModelComponents.FeatureIdTexture
        );
        expect(featureIdTexture.featureCount).toEqual(65536);
        expect(featureIdTexture.nullFeatureId).not.toBeDefined();
        expect(featureIdTexture.propertyTableId).not.toBeDefined();
        expect(featureIdTexture.label).toBe("idsGR");
        expect(featureIdTexture.positionalLabel).toBe("featureId_4");
        expect(featureIdTexture.textureReader.channels).toBe("gr");
        expect(featureIdTexture.textureReader.texCoord).toBe(0);
        expect(featureIdTexture.textureReader.texture).toBe(texture);

        featureIdTexture = primitive.featureIds[5];
        expect(featureIdTexture).toBeInstanceOf(
          ModelComponents.FeatureIdTexture
        );
        expect(featureIdTexture.featureCount).toEqual(1048576);
        expect(featureIdTexture.nullFeatureId).not.toBeDefined();
        expect(featureIdTexture.propertyTableId).not.toBeDefined();
        expect(featureIdTexture.label).toBe("idsAGBB");
        expect(featureIdTexture.positionalLabel).toBe("featureId_5");
        expect(featureIdTexture.textureReader.channels).toBe("agbb");
        expect(featureIdTexture.textureReader.texCoord).toBe(0);
        expect(featureIdTexture.textureReader.texture).toBe(texture);

        featureIdTexture = primitive.featureIds[6];
        expect(featureIdTexture).toBeInstanceOf(
          ModelComponents.FeatureIdTexture
        );
        expect(featureIdTexture.featureCount).toEqual(255);
        expect(featureIdTexture.nullFeatureId).toBe(10);
        expect(featureIdTexture.propertyTableId).not.toBeDefined();
        expect(featureIdTexture.label).toBe("idsGWithNull");
        expect(featureIdTexture.positionalLabel).toBe("featureId_6");
        expect(featureIdTexture.textureReader.channels).toBe("g");
        expect(featureIdTexture.textureReader.texCoord).toBe(0);
        expect(featureIdTexture.textureReader.texture).toBe(texture);
      });
    });

    it("loads BuildingsMetadata", function () {
      return loadGltf(buildingsMetadata).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const childNode = rootNode.children[0];
        const primitive = childNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const featureIdAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.FEATURE_ID,
          0
        );
        const structuralMetadata = components.structuralMetadata;

        expect(positionAttribute).toBeDefined();
        expect(normalAttribute).toBeDefined();

        expect(featureIdAttribute.name).toBe("_FEATURE_ID_0");
        expect(featureIdAttribute.semantic).toBe(
          VertexAttributeSemantic.FEATURE_ID
        );
        expect(featureIdAttribute.setIndex).toBe(0);
        expect(featureIdAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(featureIdAttribute.type).toBe(AttributeType.SCALAR);
        expect(featureIdAttribute.normalized).toBe(false);
        expect(featureIdAttribute.count).toBe(240);
        expect(featureIdAttribute.min).toBe(0);
        expect(featureIdAttribute.max).toBe(9);
        expect(featureIdAttribute.constant).toBe(0);
        expect(featureIdAttribute.quantization).toBeUndefined();
        expect(featureIdAttribute.typedArray).toBeUndefined();
        expect(featureIdAttribute.buffer).toBeDefined();
        expect(featureIdAttribute.byteOffset).toBe(0);
        expect(featureIdAttribute.byteStride).toBe(4);

        expect(primitive.featureIds.length).toBe(2);
        expect(primitive.propertyTextureIds.length).toBe(0);

        // feature ID via accessor
        const featureIdAccessor = primitive.featureIds[0];
        expect(featureIdAccessor).toBeInstanceOf(
          ModelComponents.FeatureIdAttribute
        );
        expect(featureIdAccessor.featureCount).toEqual(10);
        expect(featureIdAccessor.nullFeatureId).not.toBeDefined();
        expect(featureIdAccessor.propertyTableId).toBe(0);
        expect(featureIdAccessor.setIndex).toBe(0);
        expect(featureIdAccessor.label).toBe("buildings");
        expect(featureIdAccessor.positionalLabel).toBe("featureId_0");

        // Default feature ID
        const featureIdDefault = primitive.featureIds[1];
        expect(featureIdDefault).toBeInstanceOf(
          ModelComponents.FeatureIdImplicitRange
        );
        expect(featureIdDefault.featureCount).toEqual(5);
        expect(featureIdDefault.nullFeatureId).not.toBeDefined();
        expect(featureIdDefault.propertyTableId).toBe(0);
        expect(featureIdDefault.setIndex).not.toBeDefined();
        expect(featureIdDefault.offset).toBe(0);
        expect(featureIdDefault.repeat).toBe(1);
        expect(featureIdDefault.label).toBe("defaultIdsTest");
        expect(featureIdDefault.positionalLabel).toBe("featureId_1");

        const classDefinition = structuralMetadata.schema.classes.building;
        const properties = classDefinition.properties;
        expect(properties.height.componentType).toBe(
          MetadataComponentType.FLOAT32
        );
        expect(properties.id.componentType).toBe(MetadataComponentType.INT32);

        const propertyTable = structuralMetadata.getPropertyTable(0);
        expect(propertyTable.id).toBe(0);
        expect(propertyTable.count).toBe(10);
        expect(propertyTable.class).toBe(classDefinition);
        expect(propertyTable.getProperty(0, "height")).toBe(78.15579986572266);
        expect(propertyTable.getProperty(0, "id")).toBe(0);
        expect(propertyTable.getProperty(9, "height")).toBe(79.63207244873047);
        expect(propertyTable.getProperty(9, "id")).toBe(9);

        // All of the buildings should have the year of 2022
        expect(propertyTable.getProperty(3, "year")).toBe("2022");
        expect(propertyTable.getProperty(5, "year")).toBe("2022");
        expect(propertyTable.getProperty(7, "year")).toBe("2022");

        // employee counts have a few noData values mixed in
        const expectedEmployeeCounts = [
          10,
          33,
          40,
          undefined,
          100,
          45,
          0,
          1,
          undefined,
          undefined,
        ];

        for (let i = 0; i < expectedEmployeeCounts.length; i++) {
          const expected = expectedEmployeeCounts[i];
          expect(propertyTable.getProperty(i, "employeeCount")).toBe(expected);
        }

        // the offset/scale from the property table should be used, so the
        // temperatures should be between the range 18-24°C rather than
        // the class property range of 0-100°C
        for (let i = 0; i < 10; i++) {
          const temperature = propertyTable.getProperty(
            i,
            "temperatureCelsius"
          );
          expect(temperature).toBeGreaterThanOrEqual(18);
          expect(temperature).toBeLessThanOrEqual(24);
        }
      });
    });

    it("loads BuildingsMetadata with EXT_feature_metadata", function () {
      return loadGltf(buildingsMetadataLegacy).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const childNode = rootNode.children[0];
        const primitive = childNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const featureIdAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.FEATURE_ID,
          0
        );
        const structuralMetadata = components.structuralMetadata;

        expect(positionAttribute).toBeDefined();
        expect(normalAttribute).toBeDefined();

        expect(featureIdAttribute.name).toBe("_FEATURE_ID_0");
        expect(featureIdAttribute.semantic).toBe(
          VertexAttributeSemantic.FEATURE_ID
        );
        expect(featureIdAttribute.setIndex).toBe(0);
        expect(featureIdAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(featureIdAttribute.type).toBe(AttributeType.SCALAR);
        expect(featureIdAttribute.normalized).toBe(false);
        expect(featureIdAttribute.count).toBe(240);
        expect(featureIdAttribute.min).toBe(0);
        expect(featureIdAttribute.max).toBe(9);
        expect(featureIdAttribute.constant).toBe(0);
        expect(featureIdAttribute.quantization).toBeUndefined();
        expect(featureIdAttribute.typedArray).toBeUndefined();
        expect(featureIdAttribute.buffer).toBeDefined();
        expect(featureIdAttribute.byteOffset).toBe(0);
        expect(featureIdAttribute.byteStride).toBe(4);

        expect(primitive.featureIds.length).toBe(2);
        expect(primitive.propertyTextureIds.length).toBe(0);

        // feature ID via accessor
        const featureIdAccessor = primitive.featureIds[0];
        expect(featureIdAccessor).toBeInstanceOf(
          ModelComponents.FeatureIdAttribute
        );
        expect(featureIdAccessor.featureCount).toEqual(10);
        expect(featureIdAccessor.nullFeatureId).not.toBeDefined();
        expect(featureIdAccessor.propertyTableId).toBe(0);
        expect(featureIdAccessor.setIndex).toBe(0);
        expect(featureIdAccessor.label).not.toBeDefined();
        expect(featureIdAccessor.positionalLabel).toBe("featureId_0");

        // feature ID range
        const featureIdDefault = primitive.featureIds[1];
        expect(featureIdDefault).toBeInstanceOf(
          ModelComponents.FeatureIdImplicitRange
        );
        expect(featureIdDefault.featureCount).toEqual(10);
        expect(featureIdDefault.nullFeatureId).not.toBeDefined();
        expect(featureIdDefault.propertyTableId).toBe(0);
        expect(featureIdDefault.setIndex).not.toBeDefined();
        expect(featureIdDefault.offset).toBe(0);
        expect(featureIdDefault.repeat).toBe(2);
        expect(featureIdDefault.label).not.toBeDefined();
        expect(featureIdDefault.positionalLabel).toBe("featureId_1");

        const classDefinition = structuralMetadata.schema.classes.building;
        const properties = classDefinition.properties;
        expect(properties.height.componentType).toBe(
          MetadataComponentType.FLOAT32
        );
        expect(properties.id.componentType).toBe(MetadataComponentType.INT32);

        const propertyTable = structuralMetadata.getPropertyTable(0);
        expect(propertyTable.id).toBe("buildings");
        expect(propertyTable.count).toBe(10);
        expect(propertyTable.class).toBe(classDefinition);
        expect(propertyTable.getProperty(0, "height")).toBe(78.15579986572266);
        expect(propertyTable.getProperty(0, "id")).toBe(0);
        expect(propertyTable.getProperty(9, "height")).toBe(79.63207244873047);
        expect(propertyTable.getProperty(9, "id")).toBe(9);

        // All of the buildings should have the year of 2022
        expect(propertyTable.getProperty(3, "year")).toBe("2022");
        expect(propertyTable.getProperty(5, "year")).toBe("2022");
        expect(propertyTable.getProperty(7, "year")).toBe("2022");

        // noData didn't exist in EXT_feature_metadata so this property should
        // not exist.
        expect(propertyTable.hasProperty(3, "employeeCount")).toBe(false);
      });
    });

    it("loads Weather", function () {
      return loadGltf(weather).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const featureIdAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.FEATURE_ID,
          0
        );
        const structuralMetadata = components.structuralMetadata;

        expect(primitive.primitiveType).toBe(PrimitiveType.POINTS);

        expect(positionAttribute).toBeDefined();
        expect(featureIdAttribute).toBeDefined();

        expect(primitive.featureIds.length).toBe(2);
        expect(primitive.propertyTextureIds.length).toBe(0);

        const featureIdAttributeMapping0 = primitive.featureIds[0];
        expect(featureIdAttributeMapping0).toBeInstanceOf(
          ModelComponents.FeatureIdImplicitRange
        );
        expect(featureIdAttributeMapping0.featureCount).toEqual(1000);
        expect(featureIdAttributeMapping0.nullFeatureId).not.toBeDefined();
        expect(featureIdAttributeMapping0.propertyTableId).toBe(1);
        expect(featureIdAttributeMapping0.offset).toBe(0);
        expect(featureIdAttributeMapping0.repeat).toBe(1);
        expect(featureIdAttributeMapping0.label).toBe("perPoint");
        expect(featureIdAttributeMapping0.positionalLabel).toBe("featureId_0");

        const featureIdAttributeMapping1 = primitive.featureIds[1];
        expect(featureIdAttributeMapping1).toBeInstanceOf(
          ModelComponents.FeatureIdAttribute
        );
        expect(featureIdAttributeMapping1.featureCount).toEqual(3);
        expect(featureIdAttributeMapping1.nullFeatureId).not.toBeDefined();
        expect(featureIdAttributeMapping1.propertyTableId).toBe(0);
        expect(featureIdAttributeMapping1.setIndex).toBe(0);
        expect(featureIdAttributeMapping1.label).toBe("town");
        expect(featureIdAttributeMapping1.positionalLabel).toBe("featureId_1");

        const weatherClass = structuralMetadata.schema.classes.weather;
        const weatherProperties = weatherClass.properties;
        expect(weatherProperties.airTemperature.componentType).toBe(
          MetadataComponentType.FLOAT32
        );
        expect(weatherProperties.airPressure.componentType).toBe(
          MetadataComponentType.FLOAT32
        );
        expect(weatherProperties.windVelocity.type).toBe(MetadataType.VEC3);
        expect(weatherProperties.windVelocity.componentType).toBe(
          MetadataComponentType.FLOAT32
        );

        const townClass = structuralMetadata.schema.classes.town;
        const townProperties = townClass.properties;
        expect(townProperties.name.type).toBe(MetadataType.STRING);
        expect(townProperties.name.componentCount).not.toBeDefined();
        expect(townProperties.population.type).toBe(MetadataType.SCALAR);
        expect(townProperties.population.componentType).toBe(
          MetadataComponentType.UINT16
        );

        const weatherTable = structuralMetadata.getPropertyTable(1);
        expect(weatherTable.id).toBe(1);
        expect(weatherTable.name).toBe("Weather");
        expect(weatherTable.count).toBe(1000);
        expect(weatherTable.class).toBe(weatherClass);
        expect(weatherTable.getProperty(0, "airTemperature")).toBe(
          22.120203018188477
        );
        expect(weatherTable.getProperty(0, "airPressure")).toBe(
          1.170711874961853
        );
        expect(weatherTable.getProperty(0, "windVelocity")).toEqual(
          new Cartesian3(1, 0.2964223027229309, 0.23619766533374786)
        );
        expect(weatherTable.getProperty(999, "airTemperature")).toBe(
          24.308320999145508
        );
        expect(weatherTable.getProperty(999, "airPressure")).toBe(
          1.1136815547943115
        );
        expect(weatherTable.getProperty(999, "windVelocity")).toEqual(
          new Cartesian3(1, 0.07490774989128113, 0.0022833053953945637)
        );

        const townTable = structuralMetadata.getPropertyTable(0);
        expect(townTable.id).toBe(0);
        expect(townTable.name).toBe("Town");
        expect(townTable.count).toBe(3);
        expect(townTable.class).toBe(townClass);
        expect(townTable.getProperty(0, "name")).toBe("Old Town");
        expect(townTable.getProperty(0, "population")).toBe(452);
        expect(townTable.getProperty(1, "name")).toBe("New Town");
        expect(townTable.getProperty(1, "population")).toBe(5234);
        expect(townTable.getProperty(2, "name")).toBe("Newer Town");
        expect(townTable.getProperty(2, "population")).toBe(34245);
      });
    });

    it("loads Weather with EXT_feature_metadata", function () {
      return loadGltf(weatherLegacy).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const featureIdAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.FEATURE_ID,
          0
        );
        const structuralMetadata = components.structuralMetadata;

        expect(primitive.primitiveType).toBe(PrimitiveType.POINTS);

        expect(positionAttribute).toBeDefined();
        expect(featureIdAttribute).toBeDefined();

        expect(primitive.featureIds.length).toBe(2);
        expect(primitive.propertyTextureIds.length).toBe(0);

        const featureIdAttributeMapping0 = primitive.featureIds[0];
        expect(featureIdAttributeMapping0).toBeInstanceOf(
          ModelComponents.FeatureIdImplicitRange
        );
        expect(featureIdAttributeMapping0.featureCount).toEqual(1000);
        expect(featureIdAttributeMapping0.nullFeatureId).not.toBeDefined();
        expect(featureIdAttributeMapping0.propertyTableId).toBe(1);
        expect(featureIdAttributeMapping0.offset).toBe(0);
        expect(featureIdAttributeMapping0.repeat).toBe(1);
        expect(featureIdAttributeMapping0.label).not.toBeDefined();
        expect(featureIdAttributeMapping0.positionalLabel).toBe("featureId_0");

        const featureIdAttributeMapping1 = primitive.featureIds[1];
        expect(featureIdAttributeMapping1).toBeInstanceOf(
          ModelComponents.FeatureIdAttribute
        );
        expect(featureIdAttributeMapping1.featureCount).toEqual(3);
        expect(featureIdAttributeMapping1.nullFeatureId).not.toBeDefined();
        expect(featureIdAttributeMapping1.propertyTableId).toBe(0);
        expect(featureIdAttributeMapping1.setIndex).toBe(0);
        expect(featureIdAttributeMapping1.label).not.toBeDefined();
        expect(featureIdAttributeMapping1.positionalLabel).toBe("featureId_1");

        const weatherClass = structuralMetadata.schema.classes.weather;
        const weatherProperties = weatherClass.properties;
        expect(weatherProperties.airTemperature.componentType).toBe(
          MetadataComponentType.FLOAT32
        );
        expect(weatherProperties.airPressure.componentType).toBe(
          MetadataComponentType.FLOAT32
        );
        expect(weatherProperties.windVelocity.type).toBe(MetadataType.SCALAR);
        expect(weatherProperties.windVelocity.componentType).toBe(
          MetadataComponentType.FLOAT32
        );
        expect(weatherProperties.windVelocity.arrayLength).toBe(3);

        const townClass = structuralMetadata.schema.classes.town;
        const townProperties = townClass.properties;
        expect(townProperties.name.type).toBe(MetadataType.STRING);
        expect(townProperties.name.componentType).not.toBeDefined();
        expect(townProperties.population.type).toBe(MetadataType.SCALAR);
        expect(townProperties.population.componentType).toBe(
          MetadataComponentType.UINT16
        );

        const weatherTable = structuralMetadata.getPropertyTable(1);
        expect(weatherTable.id).toBe("weatherTable");
        expect(weatherTable.count).toBe(1000);
        expect(weatherTable.class).toBe(weatherClass);
        expect(weatherTable.getProperty(0, "airTemperature")).toBe(
          22.120203018188477
        );
        expect(weatherTable.getProperty(0, "airPressure")).toBe(
          1.170711874961853
        );
        expect(weatherTable.getProperty(0, "windVelocity")).toEqual([
          1,
          0.2964223027229309,
          0.23619766533374786,
        ]);
        expect(weatherTable.getProperty(999, "airTemperature")).toBe(
          24.308320999145508
        );
        expect(weatherTable.getProperty(999, "airPressure")).toBe(
          1.1136815547943115
        );
        expect(weatherTable.getProperty(999, "windVelocity")).toEqual([
          1,
          0.07490774989128113,
          0.0022833053953945637,
        ]);

        const townTable = structuralMetadata.getPropertyTable(0);
        expect(townTable.id).toBe("townTable");
        expect(townTable.count).toBe(3);
        expect(townTable.class).toBe(townClass);
        expect(townTable.getProperty(0, "name")).toBe("Old Town");
        expect(townTable.getProperty(0, "population")).toBe(452);
        expect(townTable.getProperty(1, "name")).toBe("New Town");
        expect(townTable.getProperty(1, "population")).toBe(5234);
        expect(townTable.getProperty(2, "name")).toBe("Newer Town");
        expect(townTable.getProperty(2, "population")).toBe(34245);
      });
    });

    it("loads PointCloudWithPropertyAttributes", function () {
      return loadGltf(pointCloudWithPropertyAttributes).then(function (
        gltfLoader
      ) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const color0Attribute = getAttribute(
          attributes,
          VertexAttributeSemantic.COLOR,
          0
        );
        // custom attributes don't have a VertexAttributeSemantic
        const circleTAttribute = getAttributeByName(attributes, "_CIRCLE_T");
        const featureId0Attribute = getAttribute(
          attributes,
          VertexAttributeSemantic.FEATURE_ID,
          0
        );
        const featureId1Attribute = getAttribute(
          attributes,
          VertexAttributeSemantic.FEATURE_ID,
          1
        );
        const structuralMetadata = components.structuralMetadata;

        expect(primitive.primitiveType).toBe(PrimitiveType.POINTS);

        expect(positionAttribute).toBeDefined();
        expect(color0Attribute).toBeDefined();
        expect(circleTAttribute).toBeDefined();
        expect(featureId0Attribute).toBeDefined();
        expect(featureId1Attribute).toBeDefined();

        expect(primitive.featureIds.length).toBe(2);
        expect(primitive.propertyTextureIds.length).toBe(0);
        expect(primitive.propertyAttributeIds).toEqual([0]);

        const featureIdAttribute0 = primitive.featureIds[0];
        expect(featureIdAttribute0).toBeInstanceOf(
          ModelComponents.FeatureIdAttribute
        );
        expect(featureIdAttribute0.featureCount).toEqual(30);
        expect(featureIdAttribute0.nullFeatureId).not.toBeDefined();
        expect(featureIdAttribute0.propertyTableId).not.toBeDefined();
        expect(featureIdAttribute0.setIndex).toBe(0);
        expect(featureIdAttribute0.label).toBe("iteration");
        expect(featureIdAttribute0.positionalLabel).toBe("featureId_0");

        const featureIdAttribute1 = primitive.featureIds[1];
        expect(featureIdAttribute1).toBeInstanceOf(
          ModelComponents.FeatureIdAttribute
        );
        expect(featureIdAttribute1.featureCount).toEqual(20);
        expect(featureIdAttribute1.nullFeatureId).not.toBeDefined();
        expect(featureIdAttribute1.propertyTableId).not.toBeDefined();
        expect(featureIdAttribute1.setIndex).toBe(1);
        expect(featureIdAttribute1.label).toBe("pointId");
        expect(featureIdAttribute1.positionalLabel).toBe("featureId_1");

        const torusClass = structuralMetadata.schema.classes.torus;
        const torusProperties = torusClass.properties;
        const circleT = torusProperties.circleT;
        expect(circleT.type).toBe(MetadataType.SCALAR);
        expect(circleT.componentType).toBe(MetadataComponentType.FLOAT32);

        const iteration = torusProperties.iteration;
        expect(iteration.type).toBe(MetadataType.SCALAR);
        expect(iteration.componentType).toBe(MetadataComponentType.FLOAT32);

        const pointId = torusProperties.pointId;
        expect(pointId.type).toBe(MetadataType.SCALAR);
        expect(pointId.componentType).toBe(MetadataComponentType.FLOAT32);

        const propertyAttribute = structuralMetadata.getPropertyAttribute(0);
        expect(propertyAttribute.id).toBe(0);
        expect(propertyAttribute.name).not.toBeDefined();
        expect(propertyAttribute.class).toBe(torusClass);
        expect(propertyAttribute.getProperty("circleT").attribute).toBe(
          "_CIRCLE_T"
        );
        expect(propertyAttribute.getProperty("iteration").attribute).toBe(
          "_FEATURE_ID_0"
        );
        expect(propertyAttribute.getProperty("pointId").attribute).toBe(
          "_FEATURE_ID_1"
        );

        // A few more properties were added to test offset/scale
        const toroidalNormalized = propertyAttribute.getProperty(
          "toroidalNormalized"
        );
        expect(toroidalNormalized.attribute).toBe("_FEATURE_ID_0");
        expect(toroidalNormalized.hasValueTransform).toBe(true);
        expect(toroidalNormalized.offset).toBe(0);
        expect(toroidalNormalized.scale).toBe(0.034482758620689655);

        const poloidalNormalized = propertyAttribute.getProperty(
          "poloidalNormalized"
        );
        expect(poloidalNormalized.attribute).toBe("_FEATURE_ID_1");
        expect(poloidalNormalized.hasValueTransform).toBe(true);
        expect(poloidalNormalized.offset).toBe(0);
        expect(poloidalNormalized.scale).toBe(0.05263157894736842);

        // These two properties have offset/scale in both the class definition
        // and the property attribute. The latter should be used.
        const toroidalAngle = propertyAttribute.getProperty("toroidalAngle");
        expect(toroidalAngle.attribute).toBe("_FEATURE_ID_0");
        expect(toroidalAngle.hasValueTransform).toBe(true);
        expect(toroidalAngle.offset).toBe(0);
        expect(toroidalAngle.scale).toBe(0.21666156231653746);

        const poloidalAngle = propertyAttribute.getProperty("poloidalAngle");
        expect(poloidalAngle.attribute).toBe("_FEATURE_ID_1");
        expect(poloidalAngle.hasValueTransform).toBe(true);
        expect(poloidalAngle.offset).toBe(-3.141592653589793);
        expect(poloidalAngle.scale).toBe(0.3306939635357677);
      });
    });

    it("loads BoxTexturedWithPropertyAttributes", function () {
      return loadGltf(boxWithPropertyAttributes).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const nodes = components.nodes;
        const rootNode = scene.nodes[0];
        const childNode = rootNode.children[0];
        const primitive = childNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const texcoordAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.TEXCOORD,
          0
        );
        const warpMatrixAttribute = getAttributeByName(
          attributes,
          "_WARP_MATRIX"
        );
        const temperaturesAttribute = getAttributeByName(
          attributes,
          "_TEMPERATURES"
        );

        const indices = primitive.indices;
        const material = primitive.material;
        const metallicRoughness = material.metallicRoughness;

        expect(primitive.attributes.length).toBe(5);
        expect(primitive.primitiveType).toBe(PrimitiveType.TRIANGLES);

        expect(positionAttribute.name).toBe("POSITION");
        expect(positionAttribute.semantic).toBe(
          VertexAttributeSemantic.POSITION
        );
        expect(positionAttribute.setIndex).toBeUndefined();
        expect(positionAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.type).toBe(AttributeType.VEC3);
        expect(positionAttribute.normalized).toBe(false);
        expect(positionAttribute.count).toBe(24);
        expect(positionAttribute.min).toEqual(new Cartesian3(-0.5, -0.5, -0.5));
        expect(positionAttribute.max).toEqual(new Cartesian3(0.5, 0.5, 0.5));
        expect(positionAttribute.constant).toEqual(Cartesian3.ZERO);
        expect(positionAttribute.quantization).toBeUndefined();
        expect(positionAttribute.typedArray).toBeUndefined();
        expect(positionAttribute.buffer).toBeDefined();
        expect(positionAttribute.byteOffset).toBe(288);
        expect(positionAttribute.byteStride).toBe(12);

        expect(normalAttribute.name).toBe("NORMAL");
        expect(normalAttribute.semantic).toBe(VertexAttributeSemantic.NORMAL);
        expect(normalAttribute.setIndex).toBeUndefined();
        expect(normalAttribute.componentDatatype).toBe(ComponentDatatype.FLOAT);
        expect(normalAttribute.type).toBe(AttributeType.VEC3);
        expect(normalAttribute.normalized).toBe(false);
        expect(normalAttribute.count).toBe(24);
        expect(normalAttribute.min).toEqual(new Cartesian3(-1.0, -1.0, -1.0));
        expect(normalAttribute.max).toEqual(new Cartesian3(1.0, 1.0, 1.0));
        expect(normalAttribute.constant).toEqual(Cartesian3.ZERO);
        expect(normalAttribute.quantization).toBeUndefined();
        expect(normalAttribute.typedArray).toBeUndefined();
        expect(normalAttribute.buffer).toBeDefined();
        expect(normalAttribute.byteOffset).toBe(0);
        expect(normalAttribute.byteStride).toBe(12);

        expect(texcoordAttribute.name).toBe("TEXCOORD_0");
        expect(texcoordAttribute.semantic).toBe(
          VertexAttributeSemantic.TEXCOORD
        );
        expect(texcoordAttribute.setIndex).toBe(0);
        expect(texcoordAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(texcoordAttribute.type).toBe(AttributeType.VEC2);
        expect(texcoordAttribute.normalized).toBe(false);
        expect(texcoordAttribute.count).toBe(24);
        expect(texcoordAttribute.min).toEqual(new Cartesian2(0.0, 0.0));
        expect(texcoordAttribute.max).toEqual(new Cartesian2(6.0, 1.0));
        expect(texcoordAttribute.constant).toEqual(Cartesian2.ZERO);
        expect(texcoordAttribute.quantization).toBeUndefined();
        expect(texcoordAttribute.typedArray).toBeUndefined();
        expect(texcoordAttribute.buffer).toBeDefined();
        expect(texcoordAttribute.byteOffset).toBe(0);
        expect(texcoordAttribute.byteStride).toBe(8);

        expect(warpMatrixAttribute.name).toBe("_WARP_MATRIX");
        expect(warpMatrixAttribute.semantic).toBeUndefined();
        expect(warpMatrixAttribute.setIndex).toBeUndefined();
        expect(warpMatrixAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(warpMatrixAttribute.type).toBe(AttributeType.MAT2);
        expect(warpMatrixAttribute.normalized).toBe(false);
        expect(warpMatrixAttribute.count).toBe(24);
        expect(warpMatrixAttribute.min).toBeUndefined();
        expect(warpMatrixAttribute.max).toBeUndefined();
        expect(warpMatrixAttribute.constant).toEqual(Matrix2.ZERO);
        expect(warpMatrixAttribute.quantization).toBeUndefined();
        expect(warpMatrixAttribute.typedArray).toBeUndefined();
        expect(warpMatrixAttribute.buffer).toBeDefined();
        expect(warpMatrixAttribute.byteOffset).toBe(0);
        expect(warpMatrixAttribute.byteStride).toBe(16);

        expect(temperaturesAttribute.name).toBe("_TEMPERATURES");
        expect(temperaturesAttribute.semantic).toBeUndefined();
        expect(temperaturesAttribute.setIndex).toBeUndefined();
        expect(temperaturesAttribute.componentDatatype).toBe(
          ComponentDatatype.UNSIGNED_SHORT
        );
        expect(temperaturesAttribute.type).toBe(AttributeType.VEC2);
        expect(temperaturesAttribute.normalized).toBe(true);
        expect(temperaturesAttribute.count).toBe(24);
        expect(temperaturesAttribute.min).toBeUndefined();
        expect(temperaturesAttribute.max).toBeUndefined();
        expect(temperaturesAttribute.constant).toEqual(Cartesian2.ZERO);
        expect(temperaturesAttribute.quantization).toBeUndefined();
        expect(temperaturesAttribute.typedArray).toBeUndefined();
        expect(temperaturesAttribute.buffer).toBeDefined();
        expect(temperaturesAttribute.byteOffset).toBe(0);
        expect(temperaturesAttribute.byteStride).toBe(4);

        expect(indices.indexDatatype).toBe(IndexDatatype.UNSIGNED_SHORT);
        expect(indices.count).toBe(36);
        expect(indices.buffer).toBeDefined();
        expect(indices.buffer.sizeInBytes).toBe(72);

        expect(positionAttribute.buffer).toBe(normalAttribute.buffer);
        expect(positionAttribute.buffer).not.toBe(texcoordAttribute.buffer);

        expect(positionAttribute.buffer.sizeInBytes).toBe(576);
        expect(texcoordAttribute.buffer.sizeInBytes).toBe(192);

        expect(metallicRoughness.baseColorFactor).toEqual(
          new Cartesian4(1.0, 1.0, 1.0, 1.0)
        );
        expect(metallicRoughness.metallicFactor).toBe(0.0);
        expect(metallicRoughness.roughnessFactor).toBe(1.0);
        expect(metallicRoughness.baseColorTexture.texture.width).toBe(256);
        expect(metallicRoughness.baseColorTexture.texture.height).toBe(256);
        expect(metallicRoughness.baseColorTexture.texCoord).toBe(0);

        const sampler = metallicRoughness.baseColorTexture.texture.sampler;
        expect(sampler.wrapS).toBe(TextureWrap.REPEAT);
        expect(sampler.wrapT).toBe(TextureWrap.REPEAT);
        expect(sampler.magnificationFilter).toBe(
          TextureMagnificationFilter.LINEAR
        );
        expect(sampler.minificationFilter).toBe(
          TextureMinificationFilter.NEAREST_MIPMAP_LINEAR
        );

        expect(nodes.length).toBe(2);
        expect(scene.nodes.length).toBe(1);

        const structuralMetadata = components.structuralMetadata;
        const boxClass = structuralMetadata.schema.classes.warpedBox;
        const boxProperties = boxClass.properties;

        const warpMatrixProperty = boxProperties.warpMatrix;
        expect(warpMatrixProperty.type).toBe(MetadataType.MAT2);
        expect(warpMatrixProperty.componentType).toBe(
          MetadataComponentType.FLOAT32
        );
        expect(warpMatrixProperty.hasValueTransform).toBe(false);

        const transformedWarpMatrixProperty =
          boxProperties.transformedWarpMatrix;
        expect(transformedWarpMatrixProperty.type).toBe(MetadataType.MAT2);
        expect(transformedWarpMatrixProperty.componentType).toBe(
          MetadataComponentType.FLOAT32
        );
        expect(transformedWarpMatrixProperty.hasValueTransform).toBe(true);
        expect(transformedWarpMatrixProperty.offset).toEqual([
          0.5,
          0.5,
          0.5,
          0.5,
        ]);
        expect(transformedWarpMatrixProperty.scale).toEqual([2, 2, 2, 2]);

        const temperaturesProperty = boxProperties.temperatures;
        expect(temperaturesProperty.type).toBe(MetadataType.VEC2);
        expect(temperaturesProperty.componentType).toBe(
          MetadataComponentType.UINT16
        );
        expect(temperaturesProperty.normalized).toBe(true);
        expect(temperaturesProperty.hasValueTransform).toBe(true);
        expect(temperaturesProperty.offset).toEqual([20, 10]);
        expect(temperaturesProperty.scale).toEqual([5, 20]);

        const propertyAttribute = structuralMetadata.getPropertyAttribute(0);
        expect(propertyAttribute.id).toBe(0);
        expect(propertyAttribute.name).toBeUndefined();
        expect(propertyAttribute.class).toBe(boxClass);

        const warpMatrix = propertyAttribute.getProperty("warpMatrix");
        expect(warpMatrix.attribute).toBe("_WARP_MATRIX");
        expect(warpMatrix.hasValueTransform).toBe(false);

        const transformedWarpMatrix = propertyAttribute.getProperty(
          "transformedWarpMatrix"
        );
        expect(transformedWarpMatrix.attribute).toBe("_WARP_MATRIX");
        expect(transformedWarpMatrix.hasValueTransform).toBe(true);
        expect(transformedWarpMatrix.offset).toEqual(
          new Matrix2(0.5, 0.5, 0.5, 0.5)
        );
        expect(transformedWarpMatrix.scale).toEqual(new Matrix2(2, 2, 2, 2));

        const temperatures = propertyAttribute.getProperty("temperatures");
        expect(temperatures.attribute).toBe("_TEMPERATURES");
        expect(temperatures.hasValueTransform).toBe(true);
        expect(temperatures.offset).toEqual(new Cartesian2(20, 10));
        expect(temperatures.scale).toEqual(new Cartesian2(5, 20));
      });
    });

    describe("loads instanced models", function () {
      let sceneWithNoInstancing;

      beforeAll(function () {
        // Disable instancing extension.
        sceneWithNoInstancing = createScene({
          contextOptions: {
            requestWebgl1: true,
          },
        });
        sceneWithNoInstancing.context._instancedArrays = undefined;
      });

      function verifyBoxInstancedAttributes(loader, options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        const interleaved = defaultValue(options.interleaved, false);
        const instancingDisabled = defaultValue(
          options.instancingDisabled,
          false
        );

        const components = loader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const instances = rootNode.instances;
        const instancedAttributes = instances.attributes;
        const translationAttribute = getAttribute(
          instancedAttributes,
          InstanceAttributeSemantic.TRANSLATION
        );
        const rotationAttribute = getAttribute(
          instancedAttributes,
          InstanceAttributeSemantic.ROTATION
        );
        const scaleAttribute = getAttribute(
          instancedAttributes,
          InstanceAttributeSemantic.SCALE
        );
        const featureIdAttribute = getAttribute(
          instancedAttributes,
          InstanceAttributeSemantic.FEATURE_ID,
          0
        );

        expect(positionAttribute).toBeDefined();
        expect(normalAttribute).toBeDefined();

        expect(translationAttribute.semantic).toBe(
          InstanceAttributeSemantic.TRANSLATION
        );
        expect(translationAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(translationAttribute.type).toBe(AttributeType.VEC3);
        expect(translationAttribute.normalized).toBe(false);
        expect(translationAttribute.count).toBe(4);
        expect(translationAttribute.min).toBeUndefined();
        expect(translationAttribute.max).toBeUndefined();
        expect(translationAttribute.constant).toEqual(Cartesian3.ZERO);
        expect(translationAttribute.quantization).toBeUndefined();
        expect(translationAttribute.typedArray).toEqual(
          new Float32Array([-2, 2, 0, -2, -2, 0, 2, -2, 0, 2, 2, 0])
        );
        expect(translationAttribute.buffer).toBeUndefined();
        expect(translationAttribute.byteOffset).toBe(0);
        expect(translationAttribute.byteStride).toBeUndefined();

        expect(rotationAttribute.semantic).toBe(
          InstanceAttributeSemantic.ROTATION
        );
        expect(rotationAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(rotationAttribute.type).toBe(AttributeType.VEC4);
        expect(rotationAttribute.normalized).toBe(false);
        expect(rotationAttribute.count).toBe(4);
        expect(rotationAttribute.min).toBeUndefined();
        expect(rotationAttribute.max).toBeUndefined();
        expect(rotationAttribute.constant).toEqual(Cartesian4.ZERO);
        expect(rotationAttribute.quantization).toBeUndefined();
        expect(rotationAttribute.typedArray).toEqual(
          // prettier-ignore
          new Float32Array([
            0.3826833963394165, 0, 0, 0.9238795042037964,
            0.3535534143447876, 0.3535534143447876, 0.1464466005563736, 0.8535534143447876,
            0.46193981170654297, 0.19134169816970825, 0.46193981170654297, 0.7325378060340881,
            0.5319756865501404, 0.022260000929236412, 0.43967971205711365, 0.7233173847198486,
          ])
        );
        expect(rotationAttribute.buffer).toBeUndefined();
        expect(rotationAttribute.byteOffset).toBe(0);
        expect(rotationAttribute.byteStride).toBeUndefined();

        expect(scaleAttribute.semantic).toBe(InstanceAttributeSemantic.SCALE);
        expect(scaleAttribute.componentDatatype).toBe(ComponentDatatype.FLOAT);
        expect(scaleAttribute.type).toBe(AttributeType.VEC3);
        expect(scaleAttribute.normalized).toBe(false);
        expect(scaleAttribute.count).toBe(4);
        expect(scaleAttribute.min).toBeUndefined();
        expect(scaleAttribute.max).toBeUndefined();
        expect(scaleAttribute.constant).toEqual(Cartesian3.ZERO);
        expect(scaleAttribute.quantization).toBeUndefined();
        expect(scaleAttribute.typedArray).toEqual(
          // prettier-ignore
          new Float32Array([
            0.6000000238418579, 0.699999988079071, 1,
            1, 1, 0.5,
            0.75, 0.20000000298023224, 0.5,
            0.800000011920929, 0.6000000238418579, 0.8999999761581421,
          ])
        );
        expect(scaleAttribute.buffer).toBeUndefined();
        expect(scaleAttribute.byteOffset).toBe(0);
        expect(scaleAttribute.byteStride).toBeUndefined();

        expect(featureIdAttribute.setIndex).toBe(0);
        expect(featureIdAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(featureIdAttribute.type).toBe(AttributeType.SCALAR);
        expect(featureIdAttribute.normalized).toBe(false);
        expect(featureIdAttribute.count).toBe(4);
        expect(featureIdAttribute.min).toBeUndefined();
        expect(featureIdAttribute.max).toBeUndefined();
        expect(featureIdAttribute.constant).toBe(0);
        expect(featureIdAttribute.quantization).toBeUndefined();
        // The feature IDs should only be loaded as a typed array
        // if instancing is disabled.
        if (instancingDisabled) {
          expect(featureIdAttribute.typedArray).toEqual(
            new Float32Array([0, 0, 1, 1])
          );
          expect(featureIdAttribute.buffer).toBeUndefined();
        } else {
          expect(featureIdAttribute.typedArray).toBeUndefined();
          expect(featureIdAttribute.buffer).toBeDefined();
        }

        if (interleaved && !instancingDisabled) {
          expect(featureIdAttribute.byteOffset).toBe(40);
          expect(featureIdAttribute.byteStride).toBe(44);
        } else if (instancingDisabled) {
          // Feature IDs are available in a packed array.
          expect(featureIdAttribute.byteOffset).toBe(0);
          expect(featureIdAttribute.byteStride).toBeUndefined();
        } else {
          expect(featureIdAttribute.byteOffset).toBe(0);
          expect(featureIdAttribute.byteStride).toBe(4);
        }
      }

      function verifyBoxInstancedStructuralMetadata(loader) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const instances = rootNode.instances;

        expect(instances.featureIds.length).toBe(2);

        const featureIdAttributeMapping0 = instances.featureIds[0];
        expect(featureIdAttributeMapping0).toBeInstanceOf(
          ModelComponents.FeatureIdImplicitRange
        );
        expect(featureIdAttributeMapping0.featureCount).toEqual(4);
        expect(featureIdAttributeMapping0.nullFeatureId).not.toBeDefined();
        expect(featureIdAttributeMapping0.propertyTableId).toBe(0);
        expect(featureIdAttributeMapping0.offset).toBe(0);
        expect(featureIdAttributeMapping0.repeat).toBe(1);
        expect(featureIdAttributeMapping0.label).toBe("perInstance");
        expect(featureIdAttributeMapping0.positionalLabel).toBe(
          "instanceFeatureId_0"
        );

        const featureIdAttributeMapping1 = instances.featureIds[1];
        expect(featureIdAttributeMapping1).toBeInstanceOf(
          ModelComponents.FeatureIdAttribute
        );
        expect(featureIdAttributeMapping1.featureCount).toEqual(2);
        expect(featureIdAttributeMapping1.nullFeatureId).not.toBeDefined();
        expect(featureIdAttributeMapping1.propertyTableId).toBe(1);
        expect(featureIdAttributeMapping1.setIndex).toBe(0);
        expect(featureIdAttributeMapping1.label).toBe("section");
        expect(featureIdAttributeMapping1.positionalLabel).toBe(
          "instanceFeatureId_1"
        );

        const boxClass = structuralMetadata.schema.classes.box;
        const boxProperties = boxClass.properties;
        expect(boxProperties.name.type).toBe(MetadataType.STRING);
        expect(boxProperties.name.componentType).not.toBeDefined();
        expect(boxProperties.volume.componentType).toBe(
          MetadataComponentType.FLOAT32
        );

        const sectionClass = structuralMetadata.schema.classes.section;
        const sectionProperties = sectionClass.properties;
        expect(sectionProperties.name.type).toBe(MetadataType.STRING);
        expect(sectionProperties.name.componentType).not.toBeDefined();
        expect(sectionProperties.id.type).toBe(MetadataType.SCALAR);
        expect(sectionProperties.id.componentType).toBe(
          MetadataComponentType.UINT16
        );

        const boxTable = structuralMetadata.getPropertyTable(0);
        expect(boxTable.id).toBe(0);
        expect(boxTable.name).toBe("Box");
        expect(boxTable.count).toBe(4);
        expect(boxTable.class).toBe(boxClass);
        expect(boxTable.getProperty(0, "name")).toBe("top left");
        expect(boxTable.getProperty(0, "volume")).toBe(0.41999998688697815);
        expect(boxTable.getProperty(1, "name")).toBe("bottom left");
        expect(boxTable.getProperty(1, "volume")).toBe(0.5);
        expect(boxTable.getProperty(2, "name")).toBe("bottom right");
        expect(boxTable.getProperty(2, "volume")).toBe(0.07500000298023224);
        expect(boxTable.getProperty(3, "name")).toBe("top right");
        expect(boxTable.getProperty(3, "volume")).toBe(0.4320000112056732);

        const sectionTable = structuralMetadata.getPropertyTable(1);
        expect(sectionTable.id).toBe(1);
        expect(sectionTable.name).toBe("Section");
        expect(sectionTable.count).toBe(2);
        expect(sectionTable.class).toBe(sectionClass);
        expect(sectionTable.getProperty(0, "name")).toBe("left");
        expect(sectionTable.getProperty(0, "id")).toBe(10293);
        expect(sectionTable.getProperty(1, "name")).toBe("right");
        expect(sectionTable.getProperty(1, "id")).toBe(54923);
      }

      function verifyBoxInstancedStructuralMetadataLegacy(loader) {
        const components = loader.components;
        const structuralMetadata = components.structuralMetadata;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const instances = rootNode.instances;

        expect(instances.featureIds.length).toBe(2);

        const featureIdAttributeMapping0 = instances.featureIds[0];
        expect(featureIdAttributeMapping0).toBeInstanceOf(
          ModelComponents.FeatureIdImplicitRange
        );
        expect(featureIdAttributeMapping0.featureCount).toEqual(4);
        expect(featureIdAttributeMapping0.nullFeatureId).not.toBeDefined();
        expect(featureIdAttributeMapping0.propertyTableId).toBe(0);
        expect(featureIdAttributeMapping0.offset).toBe(0);
        expect(featureIdAttributeMapping0.repeat).toBe(1);
        expect(featureIdAttributeMapping0.label).not.toBeDefined();
        expect(featureIdAttributeMapping0.positionalLabel).toBe(
          "instanceFeatureId_0"
        );

        const featureIdAttributeMapping1 = instances.featureIds[1];
        expect(featureIdAttributeMapping1).toBeInstanceOf(
          ModelComponents.FeatureIdAttribute
        );
        expect(featureIdAttributeMapping1.featureCount).toEqual(2);
        expect(featureIdAttributeMapping1.nullFeatureId).not.toBeDefined();
        expect(featureIdAttributeMapping1.propertyTableId).toBe(1);
        expect(featureIdAttributeMapping1.setIndex).toBe(0);
        expect(featureIdAttributeMapping1.label).not.toBeDefined();
        expect(featureIdAttributeMapping1.positionalLabel).toBe(
          "instanceFeatureId_1"
        );

        const boxClass = structuralMetadata.schema.classes.box;
        const boxProperties = boxClass.properties;
        expect(boxProperties.name.type).toBe(MetadataType.STRING);
        expect(boxProperties.name.componentType).not.toBeDefined();
        expect(boxProperties.volume.componentType).toBe(
          MetadataComponentType.FLOAT32
        );

        const sectionClass = structuralMetadata.schema.classes.section;
        const sectionProperties = sectionClass.properties;
        expect(sectionProperties.name.type).toBe(MetadataType.STRING);
        expect(sectionProperties.name.componentType).not.toBeDefined();
        expect(sectionProperties.id.type).toBe(MetadataType.SCALAR);
        expect(sectionProperties.id.componentType).toBe(
          MetadataComponentType.UINT16
        );

        const boxTable = structuralMetadata.getPropertyTable(0);
        expect(boxTable.id).toBe("boxTable");
        expect(boxTable.count).toBe(4);
        expect(boxTable.class).toBe(boxClass);
        expect(boxTable.getProperty(0, "name")).toBe("top left");
        expect(boxTable.getProperty(0, "volume")).toBe(0.41999998688697815);
        expect(boxTable.getProperty(1, "name")).toBe("bottom left");
        expect(boxTable.getProperty(1, "volume")).toBe(0.5);
        expect(boxTable.getProperty(2, "name")).toBe("bottom right");
        expect(boxTable.getProperty(2, "volume")).toBe(0.07500000298023224);
        expect(boxTable.getProperty(3, "name")).toBe("top right");
        expect(boxTable.getProperty(3, "volume")).toBe(0.4320000112056732);

        const sectionTable = structuralMetadata.getPropertyTable(1);
        expect(sectionTable.id).toBe("sectionTable");
        expect(sectionTable.count).toBe(2);
        expect(sectionTable.class).toBe(sectionClass);
        expect(sectionTable.getProperty(0, "name")).toBe("left");
        expect(sectionTable.getProperty(0, "id")).toBe(10293);
        expect(sectionTable.getProperty(1, "name")).toBe("right");
        expect(sectionTable.getProperty(1, "id")).toBe(54923);
      }

      it("loads BoxInstanced", function () {
        return loadGltf(boxInstanced).then(function (gltfLoader) {
          verifyBoxInstancedAttributes(gltfLoader);
          verifyBoxInstancedStructuralMetadata(gltfLoader);
        });
      });

      it("loads BoxInstanced with EXT_feature_metadata", function () {
        return loadGltf(boxInstancedLegacy).then(function (gltfLoader) {
          verifyBoxInstancedAttributes(gltfLoader);
          verifyBoxInstancedStructuralMetadataLegacy(gltfLoader);
        });
      });

      it("loads BoxInstanced when WebGL instancing is disabled on WebGL 1", function () {
        const options = {
          scene: sceneWithNoInstancing,
        };
        return loadGltf(boxInstanced, options).then(function (gltfLoader) {
          verifyBoxInstancedAttributes(gltfLoader, {
            instancingDisabled: true,
          });
          verifyBoxInstancedStructuralMetadata(gltfLoader);
        });
      });

      it("loads BoxInstanced with default feature ids", function () {
        function modifyGltf(gltf) {
          // Delete feature ID accessor's buffer view
          delete gltf.accessors[6].bufferView;
          return gltf;
        }

        return loadModifiedGltfAndTest(
          boxInstanced,
          undefined,
          modifyGltf
        ).then(function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const instances = rootNode.instances;
          const instancedAttributes = instances.attributes;
          const featureIdAttribute = getAttribute(
            instancedAttributes,
            InstanceAttributeSemantic.FEATURE_ID,
            0
          );

          expect(featureIdAttribute.buffer).toBeUndefined();
          expect(featureIdAttribute.typedArray).toBeUndefined();
          expect(featureIdAttribute.constant).toEqual(0.0);
        });
      });

      it("loads BoxInstancedInterleaved", function () {
        return loadGltf(boxInstancedInterleaved).then(function (gltfLoader) {
          verifyBoxInstancedAttributes(gltfLoader, {
            interleaved: true,
          });
        });
      });

      it("loads BoxInstancedInterleaved with instancing disabled", function () {
        const options = {
          scene: sceneWithNoInstancing,
        };
        return loadGltf(boxInstancedInterleaved, options).then(function (
          gltfLoader
        ) {
          verifyBoxInstancedAttributes(gltfLoader, {
            interleaved: true,
            instancingDisabled: true,
          });
        });
      });

      function verifyBoxInstancedTranslation(
        loader,
        expectMinMax,
        expectBufferDefined,
        expectTypedArrayDefined
      ) {
        const components = loader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const instances = rootNode.instances;
        const instancedAttributes = instances.attributes;
        const translationAttribute = getAttribute(
          instancedAttributes,
          InstanceAttributeSemantic.TRANSLATION
        );

        expect(positionAttribute).toBeDefined();
        expect(normalAttribute).toBeDefined();

        expect(translationAttribute.semantic).toBe(
          InstanceAttributeSemantic.TRANSLATION
        );
        expect(translationAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(translationAttribute.type).toBe(AttributeType.VEC3);
        expect(translationAttribute.normalized).toBe(false);
        expect(translationAttribute.count).toBe(4);

        if (expectMinMax) {
          expect(translationAttribute.min).toEqual(new Cartesian3(-2, -2, 0));
          expect(translationAttribute.max).toEqual(new Cartesian3(2, 2, 0));
        } else {
          expect(translationAttribute.min).toBeUndefined();
          expect(translationAttribute.max).toBeUndefined();
        }

        expect(translationAttribute.constant).toEqual(Cartesian3.ZERO);
        expect(translationAttribute.quantization).toBeUndefined();

        if (expectTypedArrayDefined) {
          expect(translationAttribute.typedArray).toEqual(
            new Float32Array([-2, 2, 0, -2, -2, 0, 2, -2, 0, 2, 2, 0])
          );
        } else {
          expect(translationAttribute.typedArray).toBeUndefined();
          expect(translationAttribute.byteOffset).toBe(0);
        }

        if (expectBufferDefined) {
          expect(translationAttribute.buffer).toBeDefined();
          expect(translationAttribute.byteOffset).toBe(0);
          expect(translationAttribute.byteStride).toBe(12);
        } else {
          expect(translationAttribute.buffer).toBeUndefined();
          // Byte stride is undefined for typed arrays.
          expect(translationAttribute.byteOffset).toBe(0);
          expect(translationAttribute.byteStride).toBeUndefined();
        }
      }

      it("loads BoxInstancedTranslation", function () {
        return loadGltf(boxInstancedTranslation).then(function (gltfLoader) {
          // The translation accessor does not have a min/max, so it must load
          // the typed array in addition to the buffer.
          const expectMinMax = false;
          const expectBufferDefined = true;
          const expectTypedArrayDefined = true;

          verifyBoxInstancedTranslation(
            gltfLoader,
            expectMinMax,
            expectBufferDefined,
            expectTypedArrayDefined
          );
        });
      });

      it("loads BoxInstancedTranslation when WebGL instancing is disabled", function () {
        const options = {
          scene: sceneWithNoInstancing,
        };
        return loadGltf(boxInstancedTranslation, options).then(function (
          gltfLoader
        ) {
          const expectMinMax = false;
          const expectBufferDefined = false;
          const expectTypedArrayDefined = true;

          verifyBoxInstancedTranslation(
            gltfLoader,
            expectMinMax,
            expectBufferDefined,
            expectTypedArrayDefined
          );
        });
      });

      it("loads BoxInstancedTranslationWithMinMax", function () {
        return loadGltf(boxInstancedTranslationMinMax).then(function (
          gltfLoader
        ) {
          // The translation accessor does have a min/max, so it only needs to
          // load the buffer.
          const expectMinMax = true;
          const expectBufferDefined = true;
          const expectTypedArrayDefined = false;

          verifyBoxInstancedTranslation(
            gltfLoader,
            expectMinMax,
            expectBufferDefined,
            expectTypedArrayDefined
          );
        });
      });
    });

    it("loads Duck", function () {
      return loadGltf(duckDraco).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const childNode = rootNode.children[0];
        const primitive = childNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const texcoordAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.TEXCOORD,
          0
        );
        const positionQuantization = positionAttribute.quantization;
        const normalQuantization = normalAttribute.quantization;
        const texcoordQuantization = texcoordAttribute.quantization;

        const indices = primitive.indices;

        expect(positionAttribute.name).toBe("POSITION");
        expect(positionAttribute.semantic).toBe(
          VertexAttributeSemantic.POSITION
        );
        expect(positionAttribute.setIndex).toBeUndefined();
        expect(positionAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(positionAttribute.type).toBe(AttributeType.VEC3);
        expect(positionAttribute.normalized).toBe(false);
        expect(positionAttribute.count).toBe(2399);
        expect(positionAttribute.min).toEqual(
          new Cartesian3(
            -69.37933953401223,
            9.848530453475558,
            -61.40903695222513
          )
        );
        expect(positionAttribute.max).toEqual(
          new Cartesian3(
            96.26074059602396,
            164.09024489374352,
            54.029730459044615
          )
        );
        expect(positionAttribute.constant).toEqual(Cartesian3.ZERO);
        expect(positionAttribute.typedArray).toBeUndefined();
        expect(positionAttribute.buffer).toBeDefined();
        expect(positionAttribute.byteOffset).toBe(0);
        expect(positionAttribute.byteStride).toBeUndefined();
        expect(positionQuantization.octEncoded).toBe(false);
        expect(positionQuantization.normalizationRange).toEqual(
          new Cartesian3(2047, 2047, 2047)
        );
        expect(positionQuantization.quantizedVolumeOffset).toEqual(
          new Cartesian3(
            -69.29850006103516,
            9.929369926452637,
            -61.32819747924805
          )
        );
        expect(positionQuantization.quantizedVolumeDimensions).toEqual(
          new Cartesian3(
            165.4783935546875,
            165.4783935546875,
            165.4783935546875
          )
        );
        expect(positionQuantization.componentDatatype).toBe(
          ComponentDatatype.UNSIGNED_SHORT
        );
        expect(positionQuantization.type).toBe(AttributeType.VEC3);

        expect(normalAttribute.name).toBe("NORMAL");
        expect(normalAttribute.semantic).toBe(VertexAttributeSemantic.NORMAL);
        expect(normalAttribute.setIndex).toBeUndefined();
        expect(normalAttribute.componentDatatype).toBe(ComponentDatatype.FLOAT);
        expect(normalAttribute.type).toBe(AttributeType.VEC3);
        expect(normalAttribute.normalized).toBe(false);
        expect(normalAttribute.count).toBe(2399);
        expect(normalAttribute.min).toEqual(
          new Cartesian3(
            -1.0069254898557476,
            -1.0078414940366558,
            -1.007673468543034
          )
        );
        expect(normalAttribute.max).toEqual(
          new Cartesian3(
            1.0083384775647932,
            1.007422473383885,
            1.0075904988775068
          )
        );
        expect(normalAttribute.constant).toEqual(Cartesian3.ZERO);
        expect(normalAttribute.typedArray).toBeUndefined();
        expect(normalAttribute.buffer).toBeDefined();
        expect(normalAttribute.byteOffset).toBe(0);
        expect(normalAttribute.byteStride).toBeUndefined();
        expect(normalQuantization.octEncoded).toBe(true);
        expect(normalQuantization.normalizationRange).toBe(255);
        expect(normalQuantization.quantizedVolumeOffset).toBeUndefined();
        expect(normalQuantization.quantizedVolumeDimensions).toBeUndefined();
        expect(normalQuantization.componentDatatype).toBe(
          ComponentDatatype.UNSIGNED_BYTE
        );
        expect(normalQuantization.type).toBe(AttributeType.VEC2);

        expect(texcoordAttribute.name).toBe("TEXCOORD_0");
        expect(texcoordAttribute.semantic).toBe(
          VertexAttributeSemantic.TEXCOORD
        );
        expect(texcoordAttribute.setIndex).toBe(0);
        expect(texcoordAttribute.componentDatatype).toBe(
          ComponentDatatype.FLOAT
        );
        expect(texcoordAttribute.type).toBe(AttributeType.VEC2);
        expect(texcoordAttribute.normalized).toBe(false);
        expect(texcoordAttribute.count).toBe(2399);
        expect(texcoordAttribute.min).toEqual(
          new Cartesian2(0.025470511450678954, 0.019024537339121947)
        );
        expect(texcoordAttribute.max).toEqual(
          new Cartesian2(0.9846059706495423, 0.9809754626608782)
        );
        expect(texcoordAttribute.constant).toEqual(Cartesian2.ZERO);
        expect(texcoordAttribute.typedArray).toBeUndefined();
        expect(texcoordAttribute.buffer).toBeDefined();
        expect(texcoordAttribute.byteOffset).toBe(0);
        expect(texcoordAttribute.byteStride).toBeUndefined();
        expect(texcoordQuantization.octEncoded).toBe(false);
        expect(texcoordQuantization.normalizationRange).toEqual(
          new Cartesian2(1023, 1023)
        );
        expect(texcoordQuantization.quantizedVolumeOffset).toEqual(
          new Cartesian2(0.026409000158309937, 0.01996302604675293)
        );
        expect(texcoordQuantization.quantizedVolumeDimensions).toEqual(
          new Cartesian2(0.9600739479064941, 0.9600739479064941)
        );
        expect(texcoordQuantization.componentDatatype).toBe(
          ComponentDatatype.UNSIGNED_SHORT
        );
        expect(texcoordQuantization.type).toBe(AttributeType.VEC2);

        expect(indices.indexDatatype).toBe(IndexDatatype.UNSIGNED_SHORT);
        expect(indices.count).toBe(12636);
        expect(indices.buffer).toBeDefined();
        expect(indices.buffer.sizeInBytes).toBe(25272);

        expect(positionAttribute.buffer).not.toBe(normalAttribute.buffer);
        expect(positionAttribute.buffer).not.toBe(texcoordAttribute.buffer);

        expect(positionAttribute.buffer.sizeInBytes).toBe(14394);
        expect(normalAttribute.buffer.sizeInBytes).toBe(4798);
        expect(texcoordAttribute.buffer.sizeInBytes).toBe(9596);
      });
    });

    it("loads BoxMixedCompression", function () {
      return loadGltf(boxMixedCompression).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const texcoordAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.TEXCOORD,
          0
        );

        expect(positionAttribute.quantization).toBeDefined();
        expect(normalAttribute.quantization).toBeUndefined();
        expect(texcoordAttribute.quantization).toBeDefined();
      });
    });

    it("loads Boom Box", function () {
      const textureCreate = spyOn(Texture, "create").and.callThrough();

      return loadGltf(boomBoxSpecularGlossiness).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const material = primitive.material;
        const specularGlossiness = material.specularGlossiness;

        expect(components.upAxis).toBe(Axis.Y);
        expect(components.forwardAxis).toBe(Axis.Z);
        expect(material.occlusionTexture.texture.width).toBe(256);
        expect(material.normalTexture.texture.width).toBe(256);
        expect(material.emissiveTexture.texture.width).toBe(256);
        expect(specularGlossiness.diffuseTexture.texture.width).toBe(256);
        expect(specularGlossiness.specularGlossinessTexture.texture.width).toBe(
          256
        );

        expect(specularGlossiness.diffuseFactor).toEqual(
          new Cartesian4(1.0, 1.0, 1.0, 1.0)
        );
        expect(specularGlossiness.specularFactor).toEqual(
          new Cartesian3(1.0, 1.0, 1.0)
        );
        expect(specularGlossiness.glossinessFactor).toBe(0.5);

        // Does not load metallic roughness textures
        expect(textureCreate.calls.count()).toBe(5);
      });
    });

    it("loads BoxArticulations", function () {
      return loadGltf(boxArticulations).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        expect(rootNode.articulationName).toEqual("SampleArticulation");

        const articulations = components.articulations;
        expect(articulations.length).toEqual(1);

        const articulation = articulations[0];
        expect(articulation.name).toEqual("SampleArticulation");

        const stages = articulation.stages;
        expect(stages.length).toEqual(10);

        const xTranslateStage = stages[0];
        expect(xTranslateStage.name).toEqual("MoveX");
        expect(xTranslateStage.type).toEqual(ArticulationStageType.XTRANSLATE);
        expect(xTranslateStage.minimumValue).toEqual(-1000.0);
        expect(xTranslateStage.maximumValue).toEqual(1000.0);
        expect(xTranslateStage.initialValue).toEqual(0.0);

        const yTranslateStage = stages[1];
        expect(yTranslateStage.name).toEqual("MoveY");
        expect(yTranslateStage.type).toEqual(ArticulationStageType.YTRANSLATE);
        expect(yTranslateStage.minimumValue).toEqual(-1000.0);
        expect(yTranslateStage.maximumValue).toEqual(1000.0);
        expect(yTranslateStage.initialValue).toEqual(0.0);

        const zTranslateStage = stages[2];
        expect(zTranslateStage.name).toEqual("MoveZ");
        expect(zTranslateStage.type).toEqual(ArticulationStageType.ZTRANSLATE);
        expect(zTranslateStage.minimumValue).toEqual(-1000.0);
        expect(zTranslateStage.maximumValue).toEqual(1000.0);
        expect(zTranslateStage.initialValue).toEqual(0.0);

        const yRotateStage = stages[3];
        expect(yRotateStage.name).toEqual("Yaw");
        expect(yRotateStage.type).toEqual(ArticulationStageType.YROTATE);
        expect(yRotateStage.minimumValue).toEqual(-360.0);
        expect(yRotateStage.maximumValue).toEqual(360.0);
        expect(yRotateStage.initialValue).toEqual(0.0);

        const xRotateStage = stages[4];
        expect(xRotateStage.name).toEqual("Pitch");
        expect(xRotateStage.type).toEqual(ArticulationStageType.XROTATE);
        expect(xRotateStage.minimumValue).toEqual(-360.0);
        expect(xRotateStage.maximumValue).toEqual(360.0);
        expect(xRotateStage.initialValue).toEqual(0.0);

        const zRotateStage = stages[5];
        expect(zRotateStage.name).toEqual("Roll");
        expect(zRotateStage.type).toEqual(ArticulationStageType.ZROTATE);
        expect(zRotateStage.minimumValue).toEqual(-360.0);
        expect(zRotateStage.maximumValue).toEqual(360.0);
        expect(zRotateStage.initialValue).toEqual(0.0);

        const uniformScaleStage = stages[6];
        expect(uniformScaleStage.name).toEqual("Size");
        expect(uniformScaleStage.type).toEqual(
          ArticulationStageType.UNIFORMSCALE
        );
        expect(uniformScaleStage.minimumValue).toEqual(0.0);
        expect(uniformScaleStage.maximumValue).toEqual(1.0);
        expect(uniformScaleStage.initialValue).toEqual(1.0);

        const xScaleStage = stages[7];
        expect(xScaleStage.name).toEqual("SizeX");
        expect(xScaleStage.type).toEqual(ArticulationStageType.XSCALE);
        expect(xScaleStage.minimumValue).toEqual(0.0);
        expect(xScaleStage.maximumValue).toEqual(1.0);
        expect(xScaleStage.initialValue).toEqual(1.0);

        const yScaleStage = stages[8];
        expect(yScaleStage.name).toEqual("SizeY");
        expect(yScaleStage.type).toEqual(ArticulationStageType.YSCALE);
        expect(yScaleStage.minimumValue).toEqual(0.0);
        expect(yScaleStage.maximumValue).toEqual(1.0);
        expect(yScaleStage.initialValue).toEqual(1.0);

        const zScaleStage = stages[9];
        expect(zScaleStage.name).toEqual("SizeZ");
        expect(zScaleStage.type).toEqual(ArticulationStageType.ZSCALE);
        expect(zScaleStage.minimumValue).toEqual(0.0);
        expect(zScaleStage.maximumValue).toEqual(1.0);
        expect(zScaleStage.initialValue).toEqual(1.0);
      });
    });

    it("loads model with CESIUM_RTC", function () {
      return loadGltf(boxCesiumRtc).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const expectedTransform = Matrix4.fromTranslation(
          new Cartesian3(6378137, 0, 0)
        );
        expect(components.transform).toEqual(expectedTransform);
      });
    });

    it("loads TorusQuantized", function () {
      return loadGltf(torusQuantized).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const primitive = scene.nodes[0].primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );

        expect(positionAttribute.buffer).toBeDefined();
        expect(positionAttribute.byteOffset).toBe(0);
        expect(positionAttribute.byteStride).toBe(4);
        expect(positionAttribute.normalized).toBe(true);

        // For KHR_mesh_quantization with a normalized POSITION attribute,
        // the min and max must be dequantized.
        const dequantizedValue = 127 / 255.0;
        expect(positionAttribute.min).toEqual(new Cartesian3(0.0, 0.0, 0.0));
        expect(positionAttribute.max).toEqual(
          new Cartesian3(dequantizedValue, dequantizedValue, dequantizedValue)
        );

        expect(normalAttribute.buffer).toBeDefined();
        expect(normalAttribute.byteOffset).toBe(0);
        expect(normalAttribute.byteStride).toBe(4);
        expect(normalAttribute.min).not.toBeDefined();
        expect(normalAttribute.max).not.toBeDefined();
      });
    });

    it("loads WEB3D_quantized_attributes extension", function () {
      return loadGltf(boxWeb3dQuantizedAttributes).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const primitive = scene.nodes[0].primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const scalarAttribute = getAttributeByName(attributes, "_SCALAR_TEST");

        const positionQuantization = positionAttribute.quantization;
        expect(positionQuantization).toBeDefined();
        expect(positionQuantization.quantizedVolumeOffset).toEqual(
          new Cartesian3(-0.5, -0.5, -0.5)
        );
        expect(positionQuantization.quantizedVolumeStepSize).toEqual(
          new Cartesian3(
            0.000015259021896696422,
            0.000015259021896696422,
            0.000015259021896696422
          )
        );
        expect(positionAttribute.min).toEqual(new Cartesian3(-0.5, -0.5, -0.5));
        expect(positionAttribute.max).toEqual(new Cartesian3(0.5, 0.5, 0.5));

        const normalQuantization = normalAttribute.quantization;
        expect(normalQuantization).toBeDefined();
        expect(normalQuantization.quantizedVolumeOffset).toEqual(
          new Cartesian3(-1.0, -1.0, -1.0)
        );
        expect(normalQuantization.quantizedVolumeStepSize).toEqual(
          new Cartesian3(
            0.000030518043793392844,
            0.000030518043793392844,
            0.000030518043793392844
          )
        );

        const scalarQuantization = scalarAttribute.quantization;
        expect(scalarQuantization).toBeDefined();
        expect(scalarQuantization.quantizedVolumeOffset).toBe(1);
        expect(scalarQuantization.quantizedVolumeStepSize).toBe(0);
        expect(scalarAttribute.min).toEqual(1);
        expect(scalarAttribute.max).toEqual(1);
      });
    });

    it("loads model from parsed JSON object", function () {
      return loadGltfFromJson(triangle).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const rootNode = scene.nodes[0];
        const primitive = rootNode.primitives[0];
        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );

        expect(positionAttribute).toBeDefined();
        expect(primitive.indices).toBeDefined();
        expect(primitive.indices.indexDatatype).toBe(
          IndexDatatype.UNSIGNED_SHORT
        );
        expect(primitive.indices.count).toBe(3);
        expect(primitive.indices.buffer).toBeDefined();
      });
    });

    it("models share the same resources", function () {
      const textureCreate = spyOn(Texture, "create").and.callThrough();

      return Promise.all([loadGltf(duckDraco), loadGltf(duckDraco)]).then(
        function (gltfLoaders) {
          const cacheEntries = ResourceCache.cacheEntries;
          for (const cacheKey in cacheEntries) {
            if (cacheEntries.hasOwnProperty(cacheKey)) {
              const cacheEntry = cacheEntries[cacheKey];
              expect(cacheEntry.referenceCount).toBe(2);
            }
          }

          expect(textureCreate.calls.count()).toBe(1);

          gltfLoaders[0].destroy();
          gltfLoaders[1].destroy();
        }
      );
    });

    it("releases glTF JSON after parse", function () {
      const destroyGltfJsonLoader = spyOn(
        GltfJsonLoader.prototype,
        "destroy"
      ).and.callThrough();

      const options = {
        releaseGltfJson: true,
      };

      return loadGltf(triangle, options).then(function (gltfLoader) {
        expect(destroyGltfJsonLoader).toHaveBeenCalled();
      });
    });

    it("releases glTF JSON after unload", function () {
      const destroyGltfJsonLoader = spyOn(
        GltfJsonLoader.prototype,
        "destroy"
      ).and.callThrough();

      const options = {
        releaseGltfJson: false,
      };

      return loadGltf(triangle, options).then(function (gltfLoader) {
        expect(destroyGltfJsonLoader).not.toHaveBeenCalled();
        gltfLoader.destroy();
        expect(destroyGltfJsonLoader).toHaveBeenCalled();
      });
    });

    it("creates GPU resources asynchronously", function () {
      const jobSchedulerExecute = spyOn(
        JobScheduler.prototype,
        "execute"
      ).and.callThrough();

      const options = {
        asynchronous: true,
      };

      return loadGltf(triangle, options).then(function (gltfLoader) {
        expect(jobSchedulerExecute).toHaveBeenCalled();
      });
    });

    it("creates GPU resources synchronously", function () {
      const jobSchedulerExecute = spyOn(
        JobScheduler.prototype,
        "execute"
      ).and.callThrough();

      const options = {
        asynchronous: false,
      };

      return loadGltf(triangle, options).then(function (gltfLoader) {
        expect(jobSchedulerExecute).not.toHaveBeenCalled();
      });
    });

    it("becomes ready before textures are loaded when incrementallyLoadTextures is true", async function () {
      const textureCreate = spyOn(Texture, "create").and.callThrough();

      const options = {
        incrementallyLoadTextures: true,
      };

      let resolver;
      const promise = new Promise((resolve) => {
        resolver = resolve;
      });
      spyOn(Resource.prototype, "fetchImage").and.returnValue(promise);

      const gltfLoader = await loadGltf(boxTextured, options);
      expect(textureCreate).not.toHaveBeenCalled();

      const image = new Image();
      image.src =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
      resolver(image);

      // Continue processing to load in textures
      await pollToPromise(function () {
        loaderProcess(gltfLoader, scene);
        return gltfLoader._textureLoaders.every(function (loader) {
          return (
            loader._state === ResourceLoaderState.READY ||
            loader._state === ResourceLoaderState.FAILED
          );
        });
      });

      expect(textureCreate).toHaveBeenCalled();
    });

    it("sets default transform", function () {
      return loadGltf(microcosm).then(function (gltfLoader) {
        expect(gltfLoader.components.transform).toEqual(Matrix4.IDENTITY);
      });
    });

    it("destroys glTF loader", function () {
      const destroyStructuralMetadataLoader = spyOn(
        GltfStructuralMetadataLoader.prototype,
        "destroy"
      ).and.callThrough();

      const destroyVertexBufferLoader = spyOn(
        GltfVertexBufferLoader.prototype,
        "destroy"
      ).and.callThrough();

      const destroyIndexBufferLoader = spyOn(
        GltfIndexBufferLoader.prototype,
        "destroy"
      ).and.callThrough();

      const destroyTextureLoader = spyOn(
        GltfTextureLoader.prototype,
        "destroy"
      ).and.callThrough();

      return loadGltf(microcosm).then(function (gltfLoader) {
        expect(gltfLoader.components).toBeDefined();
        expect(gltfLoader.isDestroyed()).toBe(false);

        gltfLoader.destroy();

        expect(gltfLoader.components).not.toBeDefined();

        expect(destroyStructuralMetadataLoader.calls.count()).toBe(1);
        expect(destroyVertexBufferLoader.calls.count()).toBe(3);
        expect(destroyIndexBufferLoader.calls.count()).toBe(1);
        expect(destroyTextureLoader.calls.count()).toBe(3);
      });
    });

    it("process throws if image resource fails to load", async function () {
      spyOn(Resource.prototype, "fetchImage").and.callFake(function () {
        const error = new Error("404 Not Found");
        return Promise.reject(error);
      });

      const destroyVertexBufferLoader = spyOn(
        GltfVertexBufferLoader.prototype,
        "destroy"
      ).and.callThrough();

      const destroyIndexBufferLoader = spyOn(
        GltfIndexBufferLoader.prototype,
        "destroy"
      ).and.callThrough();

      const destroyTextureLoader = spyOn(
        GltfTextureLoader.prototype,
        "destroy"
      ).and.callThrough();

      const options = {
        releaseGltfJson: true,
      };

      const gltfLoader = new GltfLoader(getOptions(boxTextured, options));
      gltfLoaders.push(gltfLoader);
      await gltfLoader.load();

      await expectAsync(
        waitForLoaderProcess(gltfLoader, scene)
      ).toBeRejectedWithError(
        RuntimeError,
        "Failed to load glTF\nFailed to load texture\nFailed to load image: CesiumLogoFlat.png\n404 Not Found"
      );

      expect(destroyVertexBufferLoader.calls.count()).toBe(2);
      expect(destroyIndexBufferLoader.calls.count()).toBe(1);
      expect(destroyTextureLoader.calls.count()).toBe(1);
    });

    function resolveGltfJsonAfterDestroy(rejectPromise) {
      const gltf = {
        asset: {
          version: "2.0",
        },
      };
      const arrayBuffer = generateJsonBuffer(gltf).buffer;

      const fetchPromise = new Promise(function (resolve, reject) {
        if (rejectPromise) {
          reject(new Error());
        } else {
          resolve(arrayBuffer);
        }
      });
      spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
        fetchPromise
      );

      const gltfUri = "https://example.com/model.glb";

      const gltfResource = new Resource({
        url: gltfUri,
      });

      const gltfLoader = new GltfLoader({
        gltfResource: gltfResource,
      });

      expect(gltfLoader.components).not.toBeDefined();

      const promise = gltfLoader.load();
      gltfLoader.destroy();

      return promise.then(function () {
        expect(gltfLoader.components).not.toBeDefined();
        expect(gltfLoader.isDestroyed()).toBe(true);
      });
    }

    it("handles resolving glTF JSON after destroy", function () {
      return resolveGltfJsonAfterDestroy(false);
    });

    it("handles rejecting glTF JSON after destroy", function () {
      return resolveGltfJsonAfterDestroy(true);
    });

    describe("loadIndicesForWireframe", function () {
      let sceneWithWebgl1;

      beforeAll(function () {
        sceneWithWebgl1 = createScene({
          contextOptions: {
            requestWebgl1: true,
          },
        });
      });

      afterAll(function () {
        sceneWithWebgl1.destroyForSpecs();
      });

      it("loads indices in buffer and typed array for wireframes in WebGL1", function () {
        return loadGltf(triangle, {
          loadIndicesForWireframe: true,
          scene: sceneWithWebgl1,
        }).then(function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const primitive = rootNode.primitives[0];
          const attributes = primitive.attributes;
          const positionAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.POSITION
          );

          expect(positionAttribute).toBeDefined();
          expect(primitive.indices).toBeDefined();
          expect(primitive.indices.indexDatatype).toBe(
            IndexDatatype.UNSIGNED_SHORT
          );
          expect(primitive.indices.count).toBe(3);
          expect(primitive.indices.typedArray).toBeDefined();
          expect(primitive.indices.buffer).toBeDefined();
        });
      });

      it("loads indices in buffer only for wireframes in WebGL2", function () {
        const customScene = createScene();
        customScene.context._webgl2 = true;

        return loadGltf(triangle, {
          loadIndicesForWireframe: true,
          scene: customScene,
        }).then(function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const primitive = rootNode.primitives[0];
          const attributes = primitive.attributes;
          const positionAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.POSITION
          );

          expect(positionAttribute).toBeDefined();
          expect(primitive.indices).toBeDefined();
          expect(primitive.indices.indexDatatype).toBe(
            IndexDatatype.UNSIGNED_SHORT
          );
          expect(primitive.indices.count).toBe(3);
          expect(primitive.indices.typedArray).not.toBeDefined();
          expect(primitive.indices.buffer).toBeDefined();

          customScene.destroyForSpecs();
        });
      });
    });

    describe("loadAttributesAsTypedArray", function () {
      it("loads vertex attributes and indices as typed arrays", function () {
        const options = {
          loadAttributesAsTypedArray: true,
        };

        return loadGltf(boxInterleaved, options).then(function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const childNode = rootNode.children[0];
          const primitive = childNode.primitives[0];
          const attributes = primitive.attributes;
          const positionAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.POSITION
          );
          const normalAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.NORMAL
          );

          expect(positionAttribute.buffer).toBeUndefined();
          expect(positionAttribute.typedArray).toBeDefined();
          expect(positionAttribute.byteOffset).toBe(0);
          expect(positionAttribute.byteStride).toBeUndefined();
          expect(positionAttribute.typedArray.byteLength).toBe(288);

          expect(normalAttribute.buffer).toBeUndefined();
          expect(normalAttribute.typedArray).toBeDefined();
          expect(normalAttribute.byteOffset).toBe(0);
          expect(normalAttribute.byteStride).toBeUndefined();
          expect(normalAttribute.typedArray.byteLength).toBe(288);

          expect(primitive.indices).toBeDefined();
          expect(primitive.indices.typedArray).toBeDefined();
        });
      });

      it("loads instanced attributes as typed arrays only", function () {
        const options = {
          loadAttributesAsTypedArray: true,
        };

        return loadGltf(boxInstancedTranslationMinMax, options).then(function (
          gltfLoader
        ) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const primitive = rootNode.primitives[0];
          const attributes = primitive.attributes;
          const positionAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.POSITION
          );
          const normalAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.NORMAL
          );
          const instances = rootNode.instances;
          const instancedAttributes = instances.attributes;
          const translationAttribute = getAttribute(
            instancedAttributes,
            InstanceAttributeSemantic.TRANSLATION
          );

          expect(positionAttribute).toBeDefined();
          expect(normalAttribute).toBeDefined();

          expect(translationAttribute.semantic).toBe(
            InstanceAttributeSemantic.TRANSLATION
          );
          expect(translationAttribute.componentDatatype).toBe(
            ComponentDatatype.FLOAT
          );
          expect(translationAttribute.type).toBe(AttributeType.VEC3);
          expect(translationAttribute.normalized).toBe(false);
          expect(translationAttribute.count).toBe(4);
          expect(translationAttribute.min).toEqual(new Cartesian3(-2, -2, 0));
          expect(translationAttribute.max).toEqual(new Cartesian3(2, 2, 0));
          expect(translationAttribute.constant).toEqual(Cartesian3.ZERO);
          expect(translationAttribute.quantization).toBeUndefined();
          expect(translationAttribute.typedArray).toBeDefined();
          expect(translationAttribute.buffer).toBeUndefined();
          expect(translationAttribute.byteOffset).toBe(0);
          expect(translationAttribute.byteStride).toBeUndefined();
        });
      });
    });

    describe("loadAttributesFor2D", function () {
      it("loads position attribute as buffer and typed array for 2D projection", function () {
        const options = {
          loadAttributesFor2D: true,
        };

        return loadGltf(boxInterleaved, options).then(function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const childNode = rootNode.children[0];
          const primitive = childNode.primitives[0];
          const attributes = primitive.attributes;
          const positionAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.POSITION
          );
          const normalAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.NORMAL
          );

          expect(positionAttribute.buffer).toBeDefined();
          expect(positionAttribute.typedArray).toBeDefined();
          expect(positionAttribute.byteOffset).toBe(12);
          expect(positionAttribute.byteStride).toBe(24);

          // Typed arrays of other attributes should not be defined
          expect(normalAttribute.buffer).toBeDefined();
          expect(normalAttribute.typedArray).toBeUndefined();
          expect(normalAttribute.byteOffset).toBe(0);
          expect(normalAttribute.byteStride).toBe(24);

          expect(positionAttribute.typedArray.byteLength).toBe(288);
        });
      });

      it("loads position attribute as buffer only if model is instanced", function () {
        const options = {
          loadAttributesFor2D: true,
        };

        return loadGltf(boxInstanced, options).then(function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const primitive = rootNode.primitives[0];
          const attributes = primitive.attributes;

          // Projecting instanced models to 2D doesn't require the position
          // attribute to be loaded as a typed array.
          const positionAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.POSITION
          );
          expect(positionAttribute.buffer).toBeDefined();
          expect(positionAttribute.typedArray).toBeUndefined();
        });
      });

      it("loads instanced attributes as typed arrays for 2D", function () {
        const options = {
          loadAttributesFor2D: true,
        };

        return loadGltf(boxInstanced, options).then(function (gltfLoader) {
          // Since the instances have rotation attributes, they should be
          // loaded in as typed arrays only anyway. This ensures no additional
          // buffers are created for 2D.
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];

          const instances = rootNode.instances;
          const instancedAttributes = instances.attributes;
          const translationAttribute = getAttribute(
            instancedAttributes,
            InstanceAttributeSemantic.TRANSLATION
          );
          expect(translationAttribute.typedArray).toBeDefined();
          expect(translationAttribute.buffer).toBeUndefined();

          const rotationAttribute = getAttribute(
            instancedAttributes,
            InstanceAttributeSemantic.ROTATION
          );
          expect(rotationAttribute.typedArray).toBeDefined();
          expect(rotationAttribute.buffer).toBeUndefined();

          const scaleAttribute = getAttribute(
            instancedAttributes,
            InstanceAttributeSemantic.SCALE
          );
          expect(scaleAttribute.typedArray).toBeDefined();
          expect(scaleAttribute.buffer).toBeUndefined();

          const featureIdAttribute = getAttribute(
            instancedAttributes,
            InstanceAttributeSemantic.FEATURE_ID,
            0
          );
          expect(featureIdAttribute.typedArray).toBeUndefined();
          expect(featureIdAttribute.buffer).toBeDefined();
        });
      });

      it("loads instanced translation without min/max as typed array for 2D", function () {
        const options = {
          loadAttributesFor2D: true,
        };

        return loadGltf(boxInstancedTranslation, options).then(function (
          gltfLoader
        ) {
          // Since the translation attribute has no min / max readily defined,
          // it will load in as a typed array in addition to a buffer in order
          // to find these bounds at runtime.
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const primitive = rootNode.primitives[0];
          const attributes = primitive.attributes;
          const positionAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.POSITION
          );
          const normalAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.NORMAL
          );
          const instances = rootNode.instances;
          const instancedAttributes = instances.attributes;
          const translationAttribute = getAttribute(
            instancedAttributes,
            InstanceAttributeSemantic.TRANSLATION
          );

          expect(positionAttribute).toBeDefined();
          expect(normalAttribute).toBeDefined();

          expect(translationAttribute.semantic).toBe(
            InstanceAttributeSemantic.TRANSLATION
          );
          expect(translationAttribute.componentDatatype).toBe(
            ComponentDatatype.FLOAT
          );
          expect(translationAttribute.type).toBe(AttributeType.VEC3);
          expect(translationAttribute.normalized).toBe(false);
          expect(translationAttribute.count).toBe(4);
          expect(translationAttribute.constant).toEqual(Cartesian3.ZERO);
          expect(translationAttribute.quantization).toBeUndefined();
          expect(translationAttribute.typedArray).toBeDefined();
          expect(translationAttribute.buffer).toBeDefined();
          expect(translationAttribute.byteOffset).toBe(0);
          expect(translationAttribute.byteStride).toBe(12);
        });
      });

      it("loads instanced translation with min/max as buffer and typed array for 2D", function () {
        const options = {
          loadAttributesFor2D: true,
        };

        return loadGltf(boxInstancedTranslationMinMax, options).then(function (
          gltfLoader
        ) {
          // Typed arrays are necessary for 2D projection, so this should load
          // both a buffer and a typed array for the attribute.
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const primitive = rootNode.primitives[0];
          const attributes = primitive.attributes;
          const positionAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.POSITION
          );
          const normalAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.NORMAL
          );
          const instances = rootNode.instances;
          const instancedAttributes = instances.attributes;
          const translationAttribute = getAttribute(
            instancedAttributes,
            InstanceAttributeSemantic.TRANSLATION
          );

          expect(positionAttribute).toBeDefined();
          expect(normalAttribute).toBeDefined();

          expect(translationAttribute.semantic).toBe(
            InstanceAttributeSemantic.TRANSLATION
          );
          expect(translationAttribute.componentDatatype).toBe(
            ComponentDatatype.FLOAT
          );
          expect(translationAttribute.type).toBe(AttributeType.VEC3);
          expect(translationAttribute.normalized).toBe(false);
          expect(translationAttribute.count).toBe(4);
          expect(translationAttribute.min).toEqual(new Cartesian3(-2, -2, 0));
          expect(translationAttribute.max).toEqual(new Cartesian3(2, 2, 0));
          expect(translationAttribute.constant).toEqual(Cartesian3.ZERO);
          expect(translationAttribute.quantization).toBeUndefined();
          expect(translationAttribute.typedArray).toBeDefined();
          expect(translationAttribute.buffer).toBeDefined();
          expect(translationAttribute.byteOffset).toBe(0);
          expect(translationAttribute.byteStride).toBe(12);
        });
      });
    });

    describe("loadForClassification", function () {
      it("loads model without feature IDs for classification", function () {
        const options = {
          loadForClassification: true,
        };

        return loadGltf(boxVertexColors, options).then(function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const childNode = rootNode.children[1];
          const primitive = childNode.primitives[0];
          const attributes = primitive.attributes;
          const positionAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.POSITION
          );
          const normalAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.NORMAL
          );
          const texcoordAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.TEXCOORD,
            0
          );
          const colorAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.COLOR,
            0
          );

          expect(positionAttribute).toBeDefined();
          expect(normalAttribute).toBeUndefined();
          expect(texcoordAttribute).toBeDefined();
          expect(colorAttribute).toBeUndefined();

          expect(positionAttribute.buffer).toBeDefined();
          expect(texcoordAttribute.buffer).toBeDefined();
        });
      });

      it("loads model with feature IDs for classification", function () {
        const options = {
          loadForClassification: true,
        };

        return loadGltf(buildingsMetadata, options).then(function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const childNode = rootNode.children[0];
          const primitive = childNode.primitives[0];
          const attributes = primitive.attributes;
          const positionAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.POSITION
          );
          const normalAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.NORMAL
          );
          const featureIdAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.FEATURE_ID,
            0
          );

          expect(positionAttribute).toBeDefined();
          expect(positionAttribute.buffer).toBeDefined();
          expect(positionAttribute.typedArray).toBeUndefined();

          // Normals are not loaded in for classification models.
          expect(normalAttribute).toBeUndefined();

          expect(featureIdAttribute.name).toBe("_FEATURE_ID_0");
          expect(featureIdAttribute.semantic).toBe(
            VertexAttributeSemantic.FEATURE_ID
          );
          expect(featureIdAttribute.setIndex).toBe(0);
          expect(featureIdAttribute.buffer).toBeDefined();
          expect(featureIdAttribute.typedArray).toBeDefined();

          const indices = primitive.indices;
          expect(indices.buffer).toBeDefined();
          expect(indices.typedArray).toBeDefined();
        });
      });

      it("ignores morph targets for classification", function () {
        const options = {
          loadForClassification: true,
        };

        return loadGltf(simpleMorph, options).then(function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const primitive = rootNode.primitives[0];
          const attributes = primitive.attributes;
          const positionAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.POSITION
          );
          expect(positionAttribute).toBeDefined();
          expect(positionAttribute.buffer).toBeDefined();

          const morphTargets = primitive.morphTargets;
          expect(morphTargets.length).toBe(0);
        });
      });

      it("ignores skins for classification", function () {
        const options = {
          loadForClassification: true,
        };

        return loadGltf(simpleSkin, options).then(function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];

          const skin = rootNode.skin;
          expect(skin).toBeUndefined();

          const primitive = rootNode.primitives[0];
          const attributes = primitive.attributes;
          const positionAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.POSITION
          );
          const jointsAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.JOINTS,
            0
          );
          const weightsAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.WEIGHTS,
            0
          );

          expect(positionAttribute).toBeDefined();
          expect(positionAttribute.buffer).toBeDefined();

          expect(jointsAttribute).toBeUndefined();
          expect(weightsAttribute).toBeUndefined();

          expect(components.skins.length).toBe(0);
        });
      });

      it("ignores animations for classification", function () {
        const options = {
          loadForClassification: true,
        };

        return loadGltf(animatedTriangle, options).then(function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];

          const primitive = rootNode.primitives[0];
          const attributes = primitive.attributes;
          const positionAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.POSITION
          );

          expect(positionAttribute).toBeDefined();
          expect(positionAttribute.buffer).toBeDefined();

          const animations = components.animations;
          expect(animations.length).toBe(0);
        });
      });

      it("ignores normal textures for classification", function () {
        const options = {
          loadForClassification: true,
        };

        return loadGltf(twoSidedPlane, options).then(function (gltfLoader) {
          const components = gltfLoader.components;
          const scene = components.scene;
          const rootNode = scene.nodes[0];
          const primitive = rootNode.primitives[0];
          const attributes = primitive.attributes;
          const positionAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.POSITION
          );
          const normalAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.NORMAL
          );
          const tangentAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.TANGENT
          );
          const texcoordAttribute = getAttribute(
            attributes,
            VertexAttributeSemantic.TEXCOORD,
            0
          );

          expect(positionAttribute).toBeDefined();
          expect(texcoordAttribute).toBeDefined();
          expect(normalAttribute).toBeUndefined();
          expect(tangentAttribute).toBeUndefined();

          const material = primitive.material;
          expect(material.normalTexture).toBeUndefined();
        });
      });

      it("throws when loading instanced model for classification", async function () {
        const options = {
          loadForClassification: true,
        };

        await expectAsync(
          loadGltf(boxInstanced, options)
        ).toBeRejectedWithError(
          RuntimeError,
          "Failed to load glTF\nModels with the EXT_mesh_gpu_instancing extension cannot be used for classification."
        );
      });

      it("throws when loading non-triangle mesh for classification", async function () {
        const options = {
          loadForClassification: true,
        };

        await expectAsync(
          loadGltf(pointCloudWithPropertyAttributes, options)
        ).toBeRejectedWithError(
          RuntimeError,
          "Failed to load glTF\nOnly triangle meshes can be used for classification."
        );
      });
    });

    it("loads model with CESIUM_primitive_outline", function () {
      return loadGltf(boxWithPrimitiveOutline).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const [rootNode] = scene.nodes;
        const [primitive] = rootNode.primitives;

        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const texCoordAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.TEXCOORD,
          0
        );

        expect(positionAttribute).toBeDefined();
        expect(normalAttribute).toBeDefined();
        expect(texCoordAttribute).toBeDefined();

        const indices = primitive.indices;
        expect(indices).toBeDefined();
        expect(indices.buffer).toBeDefined();
        expect(indices.typedArray).toBeUndefined();
        expect(indices.count).toBe(36);

        const outlineCoordinates = primitive.outlineCoordinates;
        expect(outlineCoordinates).toBeDefined();
        expect(outlineCoordinates.name).toBe("_OUTLINE_COORDINATES");
        expect(outlineCoordinates.count).toBe(24);
        expect(outlineCoordinates.semantic).not.toBeDefined();
        expect(outlineCoordinates.type).toBe(AttributeType.VEC3);
        expect(outlineCoordinates.buffer).toBeDefined();
        expect(outlineCoordinates.typedArray).not.toBeDefined();
      });
    });

    it("loads model with CESIUM_primitive_outline with shared vertices", function () {
      return loadGltf(boxWithPrimitiveOutlineSharedVertices).then(function (
        gltfLoader
      ) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const [rootNode] = scene.nodes;
        const [primitive] = rootNode.primitives;

        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const texCoordAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.TEXCOORD,
          0
        );

        expect(positionAttribute).toBeDefined();
        expect(normalAttribute).not.toBeDefined();
        expect(texCoordAttribute).not.toBeDefined();

        const indices = primitive.indices;
        expect(indices).toBeDefined();
        expect(indices.buffer).toBeDefined();
        expect(indices.typedArray).not.toBeDefined();
        expect(indices.count).toBe(36);

        const outlineCoordinates = primitive.outlineCoordinates;
        expect(outlineCoordinates).toBeDefined();
        expect(outlineCoordinates.name).toBe("_OUTLINE_COORDINATES");
        // the model originally had 8 vertices, but some are duplicated
        // when generating outlines
        expect(outlineCoordinates.count).toBe(16);
        expect(outlineCoordinates.semantic).not.toBeDefined();
        expect(outlineCoordinates.type).toBe(AttributeType.VEC3);
        expect(outlineCoordinates.buffer).toBeDefined();
        expect(outlineCoordinates.typedArray).not.toBeDefined();
      });
    });

    it("does not load CESIUM_primitive_outline if loadPrimitiveOutline is false", function () {
      const options = {
        loadPrimitiveOutline: false,
      };
      return loadGltf(boxWithPrimitiveOutline, options).then(function (
        gltfLoader
      ) {
        const components = gltfLoader.components;
        const scene = components.scene;
        const [rootNode] = scene.nodes;
        const [primitive] = rootNode.primitives;

        const attributes = primitive.attributes;
        const positionAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.POSITION
        );
        const normalAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.NORMAL
        );
        const texCoordAttribute = getAttribute(
          attributes,
          VertexAttributeSemantic.TEXCOORD,
          0
        );

        expect(positionAttribute).toBeDefined();
        expect(normalAttribute).toBeDefined();
        expect(texCoordAttribute).toBeDefined();

        const indices = primitive.indices;
        expect(indices).toBeDefined();
        expect(indices.buffer).toBeDefined();
        expect(indices.typedArray).not.toBeDefined();
        expect(indices.count).toBe(36);

        const outlineCoordinates = primitive.outlineCoordinates;
        expect(outlineCoordinates).not.toBeDefined();
      });
    });

    it("parses copyright field", function () {
      return loadGltf(boxWithCredits).then(function (gltfLoader) {
        const components = gltfLoader.components;
        const asset = components.asset;
        expect(asset).toBeDefined();

        const expectedCredits = [
          "First Source",
          "Second Source",
          "Third Source",
        ];
        const credits = asset.credits;
        const length = credits.length;
        expect(length).toBe(expectedCredits.length);
        for (let i = 0; i < length; i++) {
          expect(credits[i].html).toEqual(expectedCredits[i]);
        }
      });
    });
  },
  "WebGL"
);
