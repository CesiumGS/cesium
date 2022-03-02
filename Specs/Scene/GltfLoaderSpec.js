import {
  AttributeType,
  Axis,
  Cartesian2,
  Cartesian3,
  Cartesian4,
  combine,
  ComponentDatatype,
  GltfStructuralMetadataLoader,
  GltfIndexBufferLoader,
  GltfJsonLoader,
  GltfLoader,
  GltfTextureLoader,
  GltfVertexBufferLoader,
  IndexDatatype,
  InstanceAttributeSemantic,
  JobScheduler,
  PrimitiveType,
  Matrix4,
  MetadataComponentType,
  MetadataType,
  ModelComponents,
  Resource,
  ResourceCache,
  ResourceLoaderState,
  Sampler,
  Texture,
  TextureMagnificationFilter,
  TextureMinificationFilter,
  TextureWrap,
  VertexAttributeSemantic,
  when,
} from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import generateJsonBuffer from "../generateJsonBuffer.js";
import loaderProcess from "../loaderProcess.js";
import pollToPromise from "../pollToPromise.js";
import waitForLoaderProcess from "../waitForLoaderProcess.js";

describe(
  "Scene/GltfLoader",
  function () {
    const boxWithCredits =
      "./Data/Models/GltfLoader/BoxWithCopyright/glTF/Box.gltf";
    const boxInterleaved =
      "./Data/Models/GltfLoader/BoxInterleaved/glTF/BoxInterleaved.gltf";
    const boxTextured =
      "./Data/Models/GltfLoader/BoxTextured/glTF/BoxTextured.gltf";
    const boxTexturedBinary =
      "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";
    const boxTexturedEmbedded =
      "./Data/Models/GltfLoader/BoxTextured/glTF-Embedded/BoxTextured.gltf";
    const boxTexturedKtx2Basis =
      "./Data/Models/GltfLoader/BoxTexturedKtx2Basis/glTF/BoxTexturedKtx2Basis.gltf";
    const boxTexturedKtx2BasisBinary =
      "./Data/Models/GltfLoader/BoxTexturedKtx2Basis/glTF-Binary/BoxTexturedKtx2Basis.glb";
    const boxVertexColors =
      "./Data/Models/GltfLoader/BoxVertexColors/glTF/BoxVertexColors.gltf";
    const simpleMorph =
      "./Data/Models/GltfLoader/SimpleMorph/glTF/SimpleMorph.gltf";
    const simpleSkin =
      "./Data/Models/GltfLoader/SimpleSkin/glTF/SimpleSkin.gltf";
    const triangle = "./Data/Models/GltfLoader/Triangle/glTF/Triangle.gltf";
    const triangleWithoutIndices =
      "./Data/Models/GltfLoader/TriangleWithoutIndices/glTF/TriangleWithoutIndices.gltf";
    const twoSidedPlane =
      "./Data/Models/GltfLoader/TwoSidedPlane/glTF/TwoSidedPlane.gltf";
    const unlitTest = "./Data/Models/GltfLoader/UnlitTest/glTF/UnlitTest.gltf";
    const microcosm = "./Data/Models/GltfLoader/Microcosm/glTF/microcosm.gltf";
    const microcosmLegacy =
      "./Data/Models/GltfLoader/Microcosm/glTF/microcosm_EXT_feature_metadata.gltf";
    const buildingsMetadata =
      "./Data/Models/GltfLoader/BuildingsMetadata/glTF/buildings-metadata.gltf";
    const weather = "./Data/Models/GltfLoader/Weather/glTF/weather.gltf";
    const weatherLegacy =
      "./Data/Models/GltfLoader/Weather/glTF/weather_EXT_feature_metadata.gltf";
    const pointCloudWithPropertyAttributes =
      "./Data/Models/GltfLoader/PointCloudWithPropertyAttributes/glTF/PointCloudWithPropertyAttributes.gltf";
    const boxInstanced =
      "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";
    const boxInstancedLegacy =
      "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced_EXT_feature_metadata.gltf";
    const boxInstancedInterleaved =
      "./Data/Models/GltfLoader/BoxInstancedInterleaved/glTF/box-instanced-interleaved.gltf";
    const boxInstancedTranslation =
      "./Data/Models/GltfLoader/BoxInstancedTranslation/glTF/box-instanced-translation.gltf";
    const boxInstancedTranslationMinMax =
      "./Data/Models/GltfLoader/BoxInstancedTranslationWithMinMax/glTF/box-instanced-translation-min-max.gltf";
    const duckDraco = "./Data/Models/GltfLoader/Duck/glTF-Draco/Duck.gltf";
    const boomBoxSpecularGlossiness =
      "./Data/Models/GltfLoader/BoomBox/glTF-pbrSpecularGlossiness/BoomBox.gltf";
    const largeFeatureIdTexture =
      "./Data/Models/GltfLoader/LargeFeatureIdTexture/glTF/LargeFeatureIdTexture.gltf";

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

    function getOptions(gltfPath, options) {
      const resource = new Resource({
        url: gltfPath,
      });

      return combine(options, {
        gltfResource: resource,
        incrementallyLoadTextures: false, // Default to false if not supplied
      });
    }

    function loadGltf(gltfPath, options) {
      const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
      gltfLoaders.push(gltfLoader);
      gltfLoader.load();

      return waitForLoaderProcess(gltfLoader, scene);
    }

    function loadGltfFromJson(gltfPath, options) {
      return Resource.fetchJson({
        url: gltfPath,
      }).then(function (gltf) {
        const loaderOptions = combine(options, {
          gltf: gltf,
          gltfResource: new Resource({
            url: gltfPath,
          }),
          incrementallyLoadTextures: false,
        });
        const gltfLoader = new GltfLoader(loaderOptions);
        gltfLoaders.push(gltfLoader);
        gltfLoader.load();

        return waitForLoaderProcess(gltfLoader, scene);
      });
    }

    function loadModifiedGltfAndTest(gltfPath, options, modifyFunction) {
      return Resource.fetchJson({
        url: gltfPath,
      }).then(function (gltf) {
        gltf = modifyFunction(gltf);

        spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
          when.resolve(generateJsonBuffer(gltf).buffer)
        );

        const gltfLoader = new GltfLoader(getOptions(gltfPath, options));
        gltfLoaders.push(gltfLoader);
        gltfLoader.load();

        return waitForLoaderProcess(gltfLoader, scene);
      });
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

        expect(primitive.morphWeights).toEqual([0.5, 0.5]);
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
          const primitive = rootNode.primitives[0];
          expect(primitive.morphWeights).toEqual([0.0, 0.0]);
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

        const featureIdAttributeMapping1 = primitive.featureIds[1];
        expect(featureIdAttributeMapping1).toBeInstanceOf(
          ModelComponents.FeatureIdAttribute
        );
        expect(featureIdAttributeMapping1.featureCount).toEqual(3);
        expect(featureIdAttributeMapping1.nullFeatureId).not.toBeDefined();
        expect(featureIdAttributeMapping1.propertyTableId).toBe(0);
        expect(featureIdAttributeMapping1.setIndex).toBe(0);

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

        const featureIdAttributeMapping1 = primitive.featureIds[1];
        expect(featureIdAttributeMapping1).toBeInstanceOf(
          ModelComponents.FeatureIdAttribute
        );
        expect(featureIdAttributeMapping1.featureCount).toEqual(3);
        expect(featureIdAttributeMapping1.nullFeatureId).not.toBeDefined();
        expect(featureIdAttributeMapping1.propertyTableId).toBe(0);
        expect(featureIdAttributeMapping1.setIndex).toBe(0);

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

        const featureIdAttribute1 = primitive.featureIds[1];
        expect(featureIdAttribute1).toBeInstanceOf(
          ModelComponents.FeatureIdAttribute
        );
        expect(featureIdAttribute1.featureCount).toEqual(20);
        expect(featureIdAttribute1.nullFeatureId).not.toBeDefined();
        expect(featureIdAttribute1.propertyTableId).not.toBeDefined();
        expect(featureIdAttribute1.setIndex).toBe(1);

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
      });
    });

    it("loads BoxInstanced", function () {
      if (!scene.context.instancedArrays) {
        return;
      }

      return loadGltf(boxInstanced).then(function (gltfLoader) {
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
        const structuralMetadata = components.structuralMetadata;
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
        expect(translationAttribute.packedTypedArray).toEqual(
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
        expect(rotationAttribute.packedTypedArray).toEqual(
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
        expect(scaleAttribute.packedTypedArray).toEqual(
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
        expect(featureIdAttribute.packedTypedArray).toBeDefined();
        expect(featureIdAttribute.buffer).toBeUndefined();
        expect(featureIdAttribute.byteOffset).toBe(0);
        expect(rotationAttribute.byteStride).toBeUndefined();

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

        const featureIdAttributeMapping1 = instances.featureIds[1];
        expect(featureIdAttributeMapping1).toBeInstanceOf(
          ModelComponents.FeatureIdAttribute
        );
        expect(featureIdAttributeMapping1.featureCount).toEqual(2);
        expect(featureIdAttributeMapping1.nullFeatureId).not.toBeDefined();
        expect(featureIdAttributeMapping1.propertyTableId).toBe(1);
        expect(featureIdAttributeMapping1.setIndex).toBe(0);

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
      });
    });

    it("loads BoxInstanced with EXT_feature_metadata", function () {
      if (!scene.context.instancedArrays) {
        return;
      }

      return loadGltf(boxInstancedLegacy).then(function (gltfLoader) {
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
        const structuralMetadata = components.structuralMetadata;
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
        expect(translationAttribute.packedTypedArray).toEqual(
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
        expect(rotationAttribute.packedTypedArray).toEqual(
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
        expect(scaleAttribute.packedTypedArray).toEqual(
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
        expect(featureIdAttribute.packedTypedArray).toBeDefined();
        expect(featureIdAttribute.buffer).toBeUndefined();
        expect(featureIdAttribute.byteOffset).toBe(0);
        expect(rotationAttribute.byteStride).toBeUndefined();

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

        const featureIdAttributeMapping1 = instances.featureIds[1];
        expect(featureIdAttributeMapping1).toBeInstanceOf(
          ModelComponents.FeatureIdAttribute
        );
        expect(featureIdAttributeMapping1.featureCount).toEqual(2);
        expect(featureIdAttributeMapping1.nullFeatureId).not.toBeDefined();
        expect(featureIdAttributeMapping1.propertyTableId).toBe(1);
        expect(featureIdAttributeMapping1.setIndex).toBe(0);

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
      });
    });

    it("loads BoxInstanced when WebGL instancing is disabled", function () {
      // Disable extension
      const instancedArrays = scene.context._instancedArrays;
      scene.context._instancedArrays = undefined;

      return loadGltf(boxInstanced)
        .then(function (gltfLoader) {
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
            InstanceAttributeSemantic.FEATURE_ID
          );

          expect(positionAttribute).toBeDefined();
          expect(normalAttribute).toBeDefined();

          expect(translationAttribute.packedTypedArray).toEqual(
            new Float32Array([-2, 2, 0, -2, -2, 0, 2, -2, 0, 2, 2, 0])
          );
          expect(translationAttribute.buffer).toBeUndefined();
          expect(translationAttribute.byteOffset).toBe(0);
          expect(translationAttribute.byteStride).toBeUndefined();

          expect(rotationAttribute.packedTypedArray).toEqual(
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

          expect(scaleAttribute.packedTypedArray).toEqual(
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

          expect(featureIdAttribute.packedTypedArray).toEqual(
            new Float32Array([0, 0, 1, 1])
          );
          expect(featureIdAttribute.buffer).toBeUndefined();
          expect(featureIdAttribute.byteOffset).toBe(0);
          expect(featureIdAttribute.byteStride).toBeUndefined();
        })
        .always(function () {
          // Re-enable extension
          scene.context._instancedArrays = instancedArrays;
        });
    });

    it("loads BoxInstanced with default feature ids", function () {
      if (!scene.context.instancedArrays) {
        return;
      }

      function modifyGltf(gltf) {
        // Delete feature ID accessor's buffer view
        delete gltf.accessors[6].bufferView;
        return gltf;
      }

      return loadModifiedGltfAndTest(boxInstanced, undefined, modifyGltf).then(
        function (gltfLoader) {
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
        }
      );
    });

    it("loads BoxInstancedInterleaved", function () {
      // Disable extension
      const instancedArrays = scene.context._instancedArrays;
      scene.context._instancedArrays = undefined;

      return loadGltf(boxInstancedInterleaved)
        .then(function (gltfLoader) {
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
            InstanceAttributeSemantic.FEATURE_ID
          );

          expect(positionAttribute).toBeDefined();
          expect(normalAttribute).toBeDefined();

          expect(translationAttribute.packedTypedArray).toEqual(
            new Float32Array([-2, 2, 0, -2, -2, 0, 2, -2, 0, 2, 2, 0])
          );
          expect(translationAttribute.buffer).toBeUndefined();
          expect(translationAttribute.byteOffset).toBe(0);
          expect(translationAttribute.byteStride).toBeUndefined();

          expect(rotationAttribute.packedTypedArray).toEqual(
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

          expect(scaleAttribute.packedTypedArray).toEqual(
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

          expect(featureIdAttribute.packedTypedArray).toEqual(
            new Float32Array([0, 0, 1, 1])
          );
          expect(featureIdAttribute.buffer).toBeUndefined();
          expect(featureIdAttribute.byteOffset).toBe(0);
          expect(featureIdAttribute.byteStride).toBeUndefined();
        })
        .always(function () {
          // Re-enable extension
          scene.context._instancedArrays = instancedArrays;
        });
    });

    it("loads BoxInstancedTranslation", function () {
      if (!scene.context.instancedArrays) {
        return;
      }

      return loadGltf(boxInstancedTranslation).then(function (gltfLoader) {
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
        expect(translationAttribute.min).toBeUndefined();
        expect(translationAttribute.max).toBeUndefined();
        expect(translationAttribute.constant).toEqual(Cartesian3.ZERO);
        expect(translationAttribute.quantization).toBeUndefined();
        expect(translationAttribute.packedTypedArray).toEqual(
          new Float32Array([-2, 2, 0, -2, -2, 0, 2, -2, 0, 2, 2, 0])
        );
        expect(translationAttribute.buffer).toBeUndefined();
        expect(translationAttribute.byteOffset).toBe(0);
        expect(translationAttribute.byteStride).toBeUndefined();
      });
    });

    it("loads BoxInstancedTranslationWithMinMax", function () {
      if (!scene.context.instancedArrays) {
        return;
      }

      return loadGltf(boxInstancedTranslationMinMax).then(function (
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
        expect(translationAttribute.packedTypedArray).toBeUndefined();
        expect(translationAttribute.buffer).toBeDefined();
        expect(translationAttribute.byteOffset).toBe(0);
        expect(translationAttribute.byteStride).toBe(12);
      });
    });

    it("loads BoxInstancedTranslation when WebGL instancing is disabled", function () {
      // Disable extension
      const instancedArrays = scene.context._instancedArrays;
      scene.context._instancedArrays = undefined;

      return loadGltf(boxInstancedTranslation)
        .then(function (gltfLoader) {
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

          expect(translationAttribute.packedTypedArray).toEqual(
            new Float32Array([-2, 2, 0, -2, -2, 0, 2, -2, 0, 2, 2, 0])
          );
          expect(translationAttribute.buffer).toBeUndefined();
          expect(translationAttribute.byteOffset).toBe(0);
          expect(translationAttribute.byteStride).toBeUndefined();
        })
        .always(function () {
          // Re-enable extension
          scene.context._instancedArrays = instancedArrays;
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
        expect(material.occlusionTexture.texture.width).toBe(128);
        expect(material.normalTexture.texture.width).toBe(128);
        expect(material.emissiveTexture.texture.width).toBe(128);
        expect(specularGlossiness.diffuseTexture.texture.width).toBe(128);
        expect(specularGlossiness.specularGlossinessTexture.texture.width).toBe(
          128
        );

        expect(specularGlossiness.diffuseFactor).toEqual(
          new Cartesian4(1.0, 1.0, 1.0, 1.0)
        );
        expect(specularGlossiness.specularFactor).toEqual(
          new Cartesian3(1.0, 1.0, 1.0)
        );
        expect(specularGlossiness.glossinessFactor).toBe(1.0);

        // Does not load metallic roughness textures
        expect(textureCreate.calls.count()).toBe(5);
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

      return when
        .all([loadGltf(duckDraco), loadGltf(duckDraco)])
        .then(function (gltfLoaders) {
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
        });
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

    it("resolves before textures are loaded when incrementallyLoadTextures is true", function () {
      const textureCreate = spyOn(Texture, "create").and.callThrough();

      const deferredPromise = when.defer();
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        deferredPromise.promise
      );

      const image = new Image();
      image.src =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

      const options = {
        incrementallyLoadTextures: true,
      };

      return loadGltf(boxTextured, options).then(function (gltfLoader) {
        expect(textureCreate).not.toHaveBeenCalled();
        deferredPromise.resolve(image);

        // Continue processing to load in textures
        return pollToPromise(function () {
          loaderProcess(gltfLoader, scene);
          return gltfLoader._textureLoaders.every(function (loader) {
            return (
              loader._state === ResourceLoaderState.READY ||
              loader._state === ResourceLoaderState.FAILED
            );
          });
        }).then(function () {
          return gltfLoader.texturesLoadedPromise.then(function () {
            expect(textureCreate).toHaveBeenCalled();
          });
        });
      });
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

    it("rejects promise if glTF JSON fails to load", function () {
      const error = new Error("404 Not Found");
      spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
        when.reject(error)
      );

      const gltfResource = new Resource({
        url: "https://example.com/model.glb",
      });

      const gltfLoader = new GltfLoader({
        gltfResource: gltfResource,
        releaseGltfJson: true,
      });

      gltfLoader.load();

      return gltfLoader.promise
        .then(function () {
          fail();
        })
        .otherwise(function (runtimeError) {
          expect(runtimeError.message).toBe(
            "Failed to load glTF\nFailed to load glTF: https://example.com/model.glb\n404 Not Found"
          );
        });
    });

    it("rejects promise if resource fails to load", function () {
      const error = new Error("404 Not Found");
      spyOn(Resource.prototype, "fetchImage").and.returnValue(
        when.reject(error)
      );

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

      return loadGltf(boxTextured, options)
        .then(function (gltfLoader) {
          fail();
        })
        .otherwise(function (runtimeError) {
          expect(runtimeError.message).toBe(
            "Failed to load glTF\nFailed to load texture\nFailed to load image: CesiumLogoFlat.png\n404 Not Found"
          );
          expect(destroyVertexBufferLoader.calls.count()).toBe(2);
          expect(destroyIndexBufferLoader.calls.count()).toBe(1);
          expect(destroyTextureLoader.calls.count()).toBe(1);
        });
    });

    function resolveGltfJsonAfterDestroy(reject) {
      const gltf = {
        asset: {
          version: "2.0",
        },
      };
      const arrayBuffer = generateJsonBuffer(gltf).buffer;

      const deferredPromise = when.defer();
      spyOn(GltfJsonLoader.prototype, "_fetchGltf").and.returnValue(
        deferredPromise.promise
      );

      const gltfUri = "https://example.com/model.glb";

      const gltfResource = new Resource({
        url: gltfUri,
      });

      const gltfJsonLoaderCopy = ResourceCache.loadGltfJson({
        gltfResource: gltfResource,
        baseResource: gltfResource,
      });

      const gltfLoader = new GltfLoader({
        gltfResource: gltfResource,
      });

      expect(gltfLoader.components).not.toBeDefined();

      gltfLoader.load();
      gltfLoader.destroy();

      if (reject) {
        deferredPromise.reject(new Error());
      } else {
        deferredPromise.resolve(arrayBuffer);
      }

      expect(gltfLoader.components).not.toBeDefined();
      expect(gltfLoader.isDestroyed()).toBe(true);

      ResourceCache.unload(gltfJsonLoaderCopy);
    }

    it("handles resolving glTF JSON after destroy", function () {
      resolveGltfJsonAfterDestroy(false);
    });

    it("handles rejecting glTF JSON after destroy", function () {
      resolveGltfJsonAfterDestroy(true);
    });

    it("loads vertex attributes and indices as typed arrays", function () {
      const options = {
        loadAsTypedArray: true,
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
        expect(positionAttribute.byteOffset).toBe(12);
        expect(positionAttribute.byteStride).toBe(24);

        expect(normalAttribute.buffer).toBeUndefined();
        expect(normalAttribute.typedArray).toBeDefined();
        expect(normalAttribute.byteOffset).toBe(0);
        expect(normalAttribute.byteStride).toBe(24);

        expect(positionAttribute.typedArray).toBe(normalAttribute.typedArray);
        expect(positionAttribute.typedArray.byteLength).toBe(576);
      });
    });

    it("loads instanced attributes as typed arrays", function () {
      const options = {
        loadAsTypedArray: true,
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
        expect(translationAttribute.packedTypedArray).toBeDefined();
        expect(translationAttribute.buffer).toBeUndefined();
        expect(translationAttribute.byteOffset).toBe(0);
        expect(translationAttribute.byteStride).toBeUndefined();
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
