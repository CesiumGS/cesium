import {
  Cartesian3,
  combine,
  GltfLoader,
  InstancingPipelineStage,
  Resource,
  ResourceCache,
  ShaderBuilder,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import waitForLoaderProcess from "../../waitForLoaderProcess.js";

describe("Scene/ModelExperimental/InstancingPipelineStage", function () {
  var boxInstanced =
    "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";
  var boxInstancedTranslation =
    "./Data/Models/GltfLoader/BoxInstancedTranslation/glTF/box-instanced-translation.gltf";
  var boxInstancedTranslationMinMax =
    "./Data/Models/GltfLoader/BoxInstancedTranslationWithMinMax/glTF/box-instanced-translation-min-max.gltf";

  var scene;
  var gltfLoaders = [];

  beforeAll(function () {
    scene = createScene();
  });

  afterAll(function () {
    scene.destroyForSpecs();
  });

  afterEach(function () {
    var gltfLoadersLength = gltfLoaders.length;
    for (var i = 0; i < gltfLoadersLength; ++i) {
      var gltfLoader = gltfLoaders[i];
      if (!gltfLoader.isDestroyed()) {
        gltfLoader.destroy();
      }
    }
    gltfLoaders.length = 0;
    ResourceCache.clearForSpecs();
  });

  function getOptions(gltfPath, options) {
    var resource = new Resource({
      url: gltfPath,
    });

    return combine(options, {
      gltfResource: resource,
      incrementallyLoadTexture: false,
    });
  }

  function loadGltf(gltfPath, options) {
    var gltfLoader = new GltfLoader(getOptions(gltfPath, options));
    gltfLoaders.push(gltfLoader);
    gltfLoader.load();

    return waitForLoaderProcess(gltfLoader, scene);
  }

  it("correctly computes instancing TRANSLATION min and max from typed arrays", function () {
    var renderResources = {
      attributeIndex: 0,
      attributes: [],
      instancingTranslationMax: undefined,
      instancingTranslationMin: undefined,
      shaderBuilder: new ShaderBuilder(),
    };

    return loadGltf(boxInstanced).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var node = components.nodes[0];

      scene.renderForSpecs();
      InstancingPipelineStage.process(renderResources, node, scene.frameState);

      expect(renderResources.instancingTranslationMax).toEqual(
        new Cartesian3(2, 2, 0)
      );
      expect(renderResources.instancingTranslationMin).toEqual(
        new Cartesian3(-2, -2, 0)
      );
      expect(renderResources.attributes.length).toBe(3);
    });
  });

  it("sets instancing TRANSLATION min and max from attributes", function () {
    var renderResources = {
      attributeIndex: 0,
      attributes: [],
      instancingTranslationMax: undefined,
      instancingTranslationMin: undefined,
      shaderBuilder: new ShaderBuilder(),
    };

    return loadGltf(boxInstancedTranslationMinMax).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var node = components.nodes[0];

      InstancingPipelineStage.process(renderResources, node);

      expect(renderResources.instancingTranslationMax).toEqual(
        new Cartesian3(2, 2, 0)
      );
      expect(renderResources.instancingTranslationMin).toEqual(
        new Cartesian3(-2, -2, 0)
      );
      expect(renderResources.attributes.length).toBe(1);
    });
  });

  it("creates instancing matrices vertex attributes when ROTATION is present", function () {
    var renderResources = {
      attributeIndex: 0,
      attributes: [],
      instancingTranslationMax: undefined,
      instancingTranslationMin: undefined,
      shaderBuilder: new ShaderBuilder(),
    };

    return loadGltf(boxInstanced).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var node = components.nodes[0];

      scene.renderForSpecs();
      InstancingPipelineStage.process(renderResources, node, scene.frameState);

      expect(renderResources.instancingTranslationMax).toEqual(
        new Cartesian3(2, 2, 0)
      );
      expect(renderResources.instancingTranslationMin).toEqual(
        new Cartesian3(-2, -2, 0)
      );
      expect(renderResources.attributes.length).toBe(3);

      var attributeLines = renderResources.shaderBuilder._attributeLines;
      expect(attributeLines[0]).toEqual(
        "attribute vec4 a_instancingTransformRow0;"
      );
      expect(attributeLines[1]).toEqual(
        "attribute vec4 a_instancingTransformRow1;"
      );
      expect(attributeLines[2]).toEqual(
        "attribute vec4 a_instancingTransformRow2;"
      );
    });
  });

  it("creates instance matrices vertex attributes when TRANSLATION min and max are not present", function () {
    var renderResources = {
      attributeIndex: 0,
      attributes: [],
      instancingTranslationMax: undefined,
      instancingTranslationMin: undefined,
      shaderBuilder: new ShaderBuilder(),
    };

    return loadGltf(boxInstancedTranslation).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var node = components.nodes[0];

      scene.renderForSpecs();
      InstancingPipelineStage.process(renderResources, node, scene.frameState);

      expect(renderResources.instancingTranslationMax).toEqual(
        new Cartesian3(2, 2, 0)
      );
      expect(renderResources.instancingTranslationMin).toEqual(
        new Cartesian3(-2, -2, 0)
      );
      expect(renderResources.attributes.length).toBe(3);

      var attributeLines = renderResources.shaderBuilder._attributeLines;
      var vertexDefineLines =
        renderResources.shaderBuilder._vertexShaderParts.defineLines;
      var fragmentDefineLines =
        renderResources.shaderBuilder._fragmentShaderParts.defineLines;

      expect(vertexDefineLines[0]).toEqual("HAS_INSTANCING");
      expect(vertexDefineLines[0]).toEqual("HAS_INSTANCING");
      expect(vertexDefineLines[1]).toEqual("HAS_INSTANCE_MATRICES");
      expect(fragmentDefineLines[1]).toEqual("HAS_INSTANCE_MATRICES");

      expect(attributeLines[0]).toEqual(
        "attribute vec4 a_instancingTransformRow0;"
      );
      expect(attributeLines[1]).toEqual(
        "attribute vec4 a_instancingTransformRow1;"
      );
      expect(attributeLines[2]).toEqual(
        "attribute vec4 a_instancingTransformRow2;"
      );
    });
  });

  it("creates TRANSLATION vertex attributes", function () {
    var renderResources = {
      attributeIndex: 0,
      attributes: [],
      instancingTranslationMax: undefined,
      instancingTranslationMin: undefined,
      shaderBuilder: new ShaderBuilder(),
    };

    return loadGltf(boxInstancedTranslationMinMax).then(function (gltfLoader) {
      var components = gltfLoader.components;
      var node = components.nodes[0];

      scene.renderForSpecs();
      InstancingPipelineStage.process(renderResources, node, scene.frameState);

      expect(renderResources.instancingTranslationMax).toEqual(
        new Cartesian3(2, 2, 0)
      );
      expect(renderResources.instancingTranslationMin).toEqual(
        new Cartesian3(-2, -2, 0)
      );
      expect(renderResources.attributes.length).toBe(1);

      var attributeLines = renderResources.shaderBuilder._attributeLines;
      var vertexDefineLines =
        renderResources.shaderBuilder._vertexShaderParts.defineLines;
      var fragmentDefineLines =
        renderResources.shaderBuilder._fragmentShaderParts.defineLines;

      expect(vertexDefineLines[0]).toEqual("HAS_INSTANCING");
      expect(vertexDefineLines[0]).toEqual("HAS_INSTANCING");
      expect(vertexDefineLines[1]).toEqual("HAS_INSTANCE_TRANSLATION");
      expect(fragmentDefineLines[1]).toEqual("HAS_INSTANCE_TRANSLATION");

      expect(attributeLines[0]).toEqual(
        "attribute vec3 a_instanceTranslation;"
      );
    });
  });
});
