import {
  Axis,
  Cesium3DTileStyle,
  Color,
  CustomShader,
  CustomShaderPipelineStage,
  Math as CesiumMath,
  Matrix4,
  ModelColorPipelineStage,
  ModelSceneGraph,
  ModelUtility,
  Pass,
  ResourceCache,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import loadAndZoomToModelAsync from "./loadAndZoomToModelAsync.js";

describe(
  "Scene/Model/ModelSceneGraph",
  function () {
    const parentGltfUrl = "./Data/Cesium3DTiles/GltfContent/glTF/parent.gltf";
    const vertexColorGltfUrl =
      "./Data/Models/glTF-2.0/VertexColorTest/glTF/VertexColorTest.gltf";
    const buildingsMetadata =
      "./Data/Models/glTF-2.0/BuildingsMetadata/glTF/buildings-metadata.gltf";
    const simpleSkinGltfUrl =
      "./Data/Models/glTF-2.0/SimpleSkin/glTF/SimpleSkin.gltf";
    const boxArticulationsUrl =
      "./Data/Models/glTF-2.0/BoxArticulations/glTF/BoxArticulations.gltf";
    const duckUrl = "./Data/Models/glTF-2.0/Duck/glTF-Draco/Duck.gltf";

    let scene;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      ResourceCache.clearForSpecs();
    });

    it("creates runtime nodes and runtime primitives from a model", function () {
      return loadAndZoomToModelAsync({ gltf: vertexColorGltfUrl }, scene).then(
        function (model) {
          const sceneGraph = model._sceneGraph;
          const components = sceneGraph._components;

          expect(sceneGraph).toBeDefined();

          const runtimeNodes = sceneGraph._runtimeNodes;
          expect(runtimeNodes.length).toEqual(components.nodes.length);

          expect(runtimeNodes[0].runtimePrimitives.length).toEqual(1);
          expect(runtimeNodes[1].runtimePrimitives.length).toEqual(1);
        }
      );
    });

    it("builds draw commands for all opaque styled features", function () {
      const style = new Cesium3DTileStyle({
        color: {
          conditions: [["${height} > 1", "color('red')"]],
        },
      });

      return loadAndZoomToModelAsync(
        {
          gltf: buildingsMetadata,
        },
        scene
      ).then(function (model) {
        model.style = style;

        const frameState = scene.frameState;
        const commandList = frameState.commandList;
        commandList.length = 0;

        // Reset the draw commands so we can inspect the draw command generation.
        model._drawCommandsBuilt = false;
        scene.renderForSpecs();

        expect(commandList.length).toEqual(1);
        expect(commandList[0].pass).toEqual(Pass.OPAQUE);
      });
    });

    it("builds draw commands for all translucent styled features", function () {
      const style = new Cesium3DTileStyle({
        color: {
          conditions: [["${height} > 1", "color('red', 0.1)"]],
        },
      });
      return loadAndZoomToModelAsync(
        {
          gltf: buildingsMetadata,
        },
        scene
      ).then(function (model) {
        model.style = style;

        const frameState = scene.frameState;
        const commandList = frameState.commandList;
        commandList.length = 0;

        // Reset the draw commands so we can inspect the draw command generation.
        model._drawCommandsBuilt = false;
        scene.renderForSpecs();

        expect(commandList.length).toEqual(1);
        expect(commandList[0].pass).toEqual(Pass.TRANSLUCENT);
      });
    });

    it("builds draw commands for both opaque and translucent styled features", function () {
      const style = new Cesium3DTileStyle({
        color: {
          conditions: [
            ["${height} > 80", "color('red', 0.1)"],
            ["true", "color('blue')"],
          ],
        },
      });

      return loadAndZoomToModelAsync(
        {
          gltf: buildingsMetadata,
        },
        scene
      ).then(function (model) {
        model.style = style;

        const frameState = scene.frameState;
        const commandList = frameState.commandList;
        commandList.length = 0;

        // Reset the draw commands so we can inspect the draw command generation.
        model._drawCommandsBuilt = false;
        scene.renderForSpecs();

        expect(commandList.length).toEqual(2);
        expect(commandList[0].pass).toEqual(Pass.TRANSLUCENT);
        expect(commandList[1].pass).toEqual(Pass.OPAQUE);
      });
    });

    it("builds draw commands for each primitive", function () {
      spyOn(ModelSceneGraph.prototype, "buildDrawCommands").and.callThrough();
      spyOn(ModelSceneGraph.prototype, "pushDrawCommands").and.callThrough();
      return loadAndZoomToModelAsync({ gltf: parentGltfUrl }, scene).then(
        function (model) {
          const sceneGraph = model._sceneGraph;
          const runtimeNodes = sceneGraph._runtimeNodes;

          let primitivesCount = 0;
          for (let i = 0; i < runtimeNodes.length; i++) {
            primitivesCount += runtimeNodes[i].runtimePrimitives.length;
          }

          const frameState = scene.frameState;
          frameState.commandList.length = 0;
          scene.renderForSpecs();
          expect(
            ModelSceneGraph.prototype.buildDrawCommands
          ).toHaveBeenCalled();
          expect(ModelSceneGraph.prototype.pushDrawCommands).toHaveBeenCalled();
          expect(frameState.commandList.length).toEqual(primitivesCount);

          // Reset the draw command list to see if they're re-built.
          model._drawCommandsBuilt = false;
          frameState.commandList.length = 0;
          scene.renderForSpecs();
          expect(
            ModelSceneGraph.prototype.buildDrawCommands
          ).toHaveBeenCalled();
          expect(ModelSceneGraph.prototype.pushDrawCommands).toHaveBeenCalled();
          expect(frameState.commandList.length).toEqual(primitivesCount);
        }
      );
    });

    it("stores runtime nodes correctly", function () {
      return loadAndZoomToModelAsync({ gltf: parentGltfUrl }, scene).then(
        function (model) {
          const sceneGraph = model._sceneGraph;
          const components = sceneGraph._components;
          const runtimeNodes = sceneGraph._runtimeNodes;

          expect(runtimeNodes[0].node).toEqual(components.nodes[0]);
          expect(runtimeNodes[1].node).toEqual(components.nodes[1]);

          const rootNodes = sceneGraph._rootNodes;
          expect(rootNodes[0]).toEqual(0);
        }
      );
    });

    it("propagates node transforms correctly", function () {
      return loadAndZoomToModelAsync(
        {
          gltf: parentGltfUrl,
          upAxis: Axis.Z,
          forwardAxis: Axis.X,
        },
        scene
      ).then(function (model) {
        const sceneGraph = model._sceneGraph;
        const components = sceneGraph._components;
        const runtimeNodes = sceneGraph._runtimeNodes;

        expect(components.upAxis).toEqual(Axis.Z);
        expect(components.forwardAxis).toEqual(Axis.X);

        const parentTransform = ModelUtility.getNodeTransform(
          components.nodes[0]
        );
        const childTransform = ModelUtility.getNodeTransform(
          components.nodes[1]
        );
        expect(runtimeNodes[0].transform).toEqual(parentTransform);
        expect(runtimeNodes[0].transformToRoot).toEqual(Matrix4.IDENTITY);
        expect(runtimeNodes[1].transform).toEqual(childTransform);
        expect(runtimeNodes[1].transformToRoot).toEqual(parentTransform);
      });
    });

    it("creates runtime skin from model", function () {
      return loadAndZoomToModelAsync({ gltf: simpleSkinGltfUrl }, scene).then(
        function (model) {
          const sceneGraph = model._sceneGraph;
          const components = sceneGraph._components;
          const runtimeNodes = sceneGraph._runtimeNodes;

          expect(runtimeNodes[0].node).toEqual(components.nodes[0]);
          expect(runtimeNodes[1].node).toEqual(components.nodes[1]);
          expect(runtimeNodes[2].node).toEqual(components.nodes[2]);

          const rootNodes = sceneGraph._rootNodes;
          expect(rootNodes[0]).toEqual(0);
          expect(rootNodes[1]).toEqual(1);

          const runtimeSkins = sceneGraph._runtimeSkins;
          expect(runtimeSkins[0].skin).toEqual(components.skins[0]);
          expect(runtimeSkins[0].joints).toEqual([
            runtimeNodes[1],
            runtimeNodes[2],
          ]);
          expect(runtimeSkins[0].jointMatrices.length).toEqual(2);

          const skinnedNodes = sceneGraph._skinnedNodes;
          expect(skinnedNodes[0]).toEqual(0);

          expect(runtimeNodes[0].computedJointMatrices.length).toEqual(2);
        }
      );
    });

    it("creates articulation from model", function () {
      return loadAndZoomToModelAsync({ gltf: boxArticulationsUrl }, scene).then(
        function (model) {
          const sceneGraph = model._sceneGraph;
          const components = sceneGraph._components;
          const runtimeNodes = sceneGraph._runtimeNodes;

          expect(runtimeNodes[0].node).toEqual(components.nodes[0]);

          const rootNodes = sceneGraph._rootNodes;
          expect(rootNodes[0]).toEqual(0);

          const runtimeArticulations = sceneGraph._runtimeArticulations;
          const runtimeArticulation =
            runtimeArticulations["SampleArticulation"];
          expect(runtimeArticulation).toBeDefined();
          expect(runtimeArticulation.name).toBe("SampleArticulation");
          expect(runtimeArticulation.runtimeNodes.length).toBe(1);
          expect(runtimeArticulation.runtimeStages.length).toBe(10);
        }
      );
    });

    it("applies articulations", function () {
      return loadAndZoomToModelAsync(
        {
          gltf: boxArticulationsUrl,
        },
        scene
      ).then(function (model) {
        const sceneGraph = model._sceneGraph;
        const runtimeNodes = sceneGraph._runtimeNodes;
        const rootNode = runtimeNodes[0];

        expect(rootNode.transform).toEqual(rootNode.originalTransform);

        sceneGraph.setArticulationStage("SampleArticulation MoveX", 1.0);
        sceneGraph.setArticulationStage("SampleArticulation MoveY", 2.0);
        sceneGraph.setArticulationStage("SampleArticulation MoveZ", 3.0);
        sceneGraph.setArticulationStage("SampleArticulation Yaw", 4.0);
        sceneGraph.setArticulationStage("SampleArticulation Pitch", 5.0);
        sceneGraph.setArticulationStage("SampleArticulation Roll", 6.0);
        sceneGraph.setArticulationStage("SampleArticulation Size", 0.9);
        sceneGraph.setArticulationStage("SampleArticulation SizeX", 0.8);
        sceneGraph.setArticulationStage("SampleArticulation SizeY", 0.7);
        sceneGraph.setArticulationStage("SampleArticulation SizeZ", 0.6);

        // Articulations shouldn't affect the node until applyArticulations is called.
        expect(rootNode.transform).toEqual(rootNode.originalTransform);

        sceneGraph.applyArticulations();

        // prettier-ignore
        const expected = [
           0.714769048324, -0.0434061192623, -0.074974104652,  0,
          -0.061883302957,  0.0590679731276, -0.624164586760,  0,
           0.037525155822,  0.5366347296529,  0.047064101083,  0,
                        1,                3,              -2,  1,
        ];

        expect(rootNode.transform).toEqualEpsilon(
          expected,
          CesiumMath.EPSILON10
        );
      });
    });

    it("adds ModelColorPipelineStage when color is set on the model", function () {
      spyOn(ModelColorPipelineStage, "process");
      return loadAndZoomToModelAsync(
        {
          color: Color.RED,
          gltf: parentGltfUrl,
        },
        scene
      ).then(function () {
        expect(ModelColorPipelineStage.process).toHaveBeenCalled();
      });
    });

    it("adds CustomShaderPipelineStage when customShader is set on the model", function () {
      spyOn(CustomShaderPipelineStage, "process");
      return loadAndZoomToModelAsync(
        {
          gltf: buildingsMetadata,
        },
        scene
      ).then(function (model) {
        model.customShader = new CustomShader();
        model.update(scene.frameState);
        expect(CustomShaderPipelineStage.process).toHaveBeenCalled();
      });
    });

    it("pushDrawCommands ignores hidden nodes", function () {
      return loadAndZoomToModelAsync(
        {
          gltf: duckUrl,
        },
        scene
      ).then(function (model) {
        const frameState = scene.frameState;
        const commandList = frameState.commandList;

        const sceneGraph = model._sceneGraph;
        const rootNode = sceneGraph._runtimeNodes[0];
        const meshNode = sceneGraph._runtimeNodes[2];

        expect(rootNode.show).toBe(true);
        expect(meshNode.show).toBe(true);

        sceneGraph.pushDrawCommands(frameState);
        const originalLength = commandList.length;
        expect(originalLength).not.toEqual(0);

        commandList.length = 0;
        meshNode.show = false;
        sceneGraph.pushDrawCommands(frameState);
        expect(commandList.length).toEqual(0);

        meshNode.show = true;
        rootNode.show = false;
        sceneGraph.pushDrawCommands(frameState);
        expect(commandList.length).toEqual(0);

        rootNode.show = true;
        sceneGraph.pushDrawCommands(frameState);
        expect(commandList.length).toEqual(originalLength);
      });
    });

    it("throws for undefined options.model", function () {
      expect(function () {
        return new ModelSceneGraph({
          model: undefined,
          modelComponents: {},
        });
      }).toThrowDeveloperError();
    });

    it("throws for undefined options.modelComponents", function () {
      expect(function () {
        return new ModelSceneGraph({
          model: {},
          modelComponents: undefined,
        });
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
