import {
  Axis,
  Cartesian3,
  Cesium3DTileStyle,
  Color,
  CustomShader,
  CustomShaderPipelineStage,
  Fog,
  AtmospherePipelineStage,
  Math as CesiumMath,
  Matrix4,
  ModelColorPipelineStage,
  ModelSceneGraph,
  ModelUtility,
  Pass,
  ResourceCache,
  Resource,
  Quaternion,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import loadAndZoomToModelAsync from "./loadAndZoomToModelAsync.js";

describe(
  "Scene/Model/ModelSceneGraph",
  function () {
    const farCanonical =
      "./Data/Models/glTF-2.0/BoxInstancedFarCanonical/glTF/box-instanced-far-canonical.gltf";
    const scaleOnly =
      "./Data/Models/glTF-2.0/BoxInstancedScaleOnly/glTF/box-instanced-scale-only.gltf";
    const scaleOnlyMinMax =
      "./Data/Models/glTF-2.0/BoxInstancedScaleOnly/glTF/box-instanced-scale-only-min-max.gltf";
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
      scene.fog = new Fog();
      ResourceCache.clearForSpecs();
    });

    it("bounds BoxInstanced rotation and scale", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: "./Data/Models/glTF-2.0/BoxInstanced/glTF/box-instanced.gltf",
          modelMatrix: Matrix4.fromTranslation(new Cartesian3(10, 20, 30)),
          scale: 2,
          cull: false,
        },
        scene,
      );
      const buffer = await Resource.fetchArrayBuffer(
        "./Data/Models/glTF-2.0/BoxInstanced/glTF/instances.bin",
      );
      // These views match the translation, rotation and scale accessors in the fixture.
      const translations = new Float32Array(buffer, 0, 12);
      const rotations = new Float32Array(buffer, 48, 16);
      const scales = new Float32Array(buffer, 112, 12);
      scene.frameState.commandList.length = 0;
      model._sceneGraph.pushDrawCommands(scene.frameState);
      const commands = scene.frameState.commandList;
      expect(commands.length).toBe(1);
      for (const command of commands) {
        const min = new Cartesian3(Infinity, Infinity, Infinity);
        const max = new Cartesian3(-Infinity, -Infinity, -Infinity);
        for (let instance = 0; instance < 4; instance++) {
          const transform = Matrix4.fromTranslationQuaternionRotationScale(
            Cartesian3.unpack(translations, instance * 3),
            Quaternion.unpack(rotations, instance * 4),
            Cartesian3.unpack(scales, instance * 3),
            new Matrix4(),
          );
          for (let corner = 0; corner < 8; corner++) {
            const point = new Cartesian3(
              corner & 1 ? 0.5 : -0.5,
              corner & 2 ? 0.5 : -0.5,
              corner & 4 ? 0.5 : -0.5,
            );
            Matrix4.multiplyByPoint(transform, point, point);
            Matrix4.multiplyByPoint(command.modelMatrix, point, point);
            Cartesian3.minimumByComponent(min, point, min);
            Cartesian3.maximumByComponent(max, point, max);
            expect(
              Cartesian3.distance(command.boundingVolume.center, point),
            ).toBeLessThanOrEqual(
              command.boundingVolume.radius + CesiumMath.EPSILON7,
            );
            expect(
              Cartesian3.distance(model.boundingSphere.center, point),
            ).toBeLessThanOrEqual(
              model.boundingSphere.radius + CesiumMath.EPSILON7,
            );
          }
        }
        const radius = Cartesian3.distance(min, max) / 2;
        expect(command.boundingVolume.radius).toBeLessThanOrEqual(
          radius + CesiumMath.EPSILON7,
        );
        expect(model.boundingSphere.radius).toBeLessThanOrEqual(
          radius + CesiumMath.EPSILON7,
        );
      }
    });

    it("bounds distant instance positions and transformed corners after rebuilding commands", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: farCanonical,
          modelMatrix: Matrix4.fromTranslation(new Cartesian3(10, 20, 30)),
          scale: 2,
          cull: false,
        },
        scene,
      );
      for (let rebuild = 0; rebuild < 2; rebuild++) {
        if (rebuild !== 0) {
          model._drawCommandsBuilt = false;
          scene.renderForSpecs();
        }
        scene.frameState.commandList.length = 0;
        model._sceneGraph.pushDrawCommands(scene.frameState);
        const commands = scene.frameState.commandList;
        expect(commands.length).toBeGreaterThan(0);
        for (const command of commands) {
          const points = [100, 120, 140].map((x) => new Cartesian3(x, 0, 0));
          // The first box has a 45-degree Z rotation and scale (8, 2, 3).
          // Its outer corner exposes the old translation-only sphere.
          const c = Math.SQRT1_2;
          points.push(new Cartesian3(100 - 5 * c, -3 * c, -1.5));
          points.push(new Cartesian3(142, 1.5, 1));
          for (const point of points) {
            Matrix4.multiplyByPoint(command.modelMatrix, point, point);
            expect(
              Cartesian3.distance(command.boundingVolume.center, point),
            ).toBeLessThanOrEqual(
              command.boundingVolume.radius + CesiumMath.EPSILON6,
            );
            expect(
              Cartesian3.distance(model.boundingSphere.center, point),
            ).toBeLessThanOrEqual(
              model.boundingSphere.radius + CesiumMath.EPSILON6,
            );
          }
        }
      }
    });

    [false, true].forEach(function (hasMinMax) {
      it(`bounds all scale-only corners ${hasMinMax ? "with" : "without"} accessor min/max after rebuilding commands`, async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: hasMinMax ? scaleOnlyMinMax : scaleOnly,
            modelMatrix: Matrix4.fromTranslation(new Cartesian3(10, 20, 30)),
            scale: 2,
            cull: false,
          },
          scene,
        );
        const translations = [
          new Cartesian3(100, 0, 0),
          new Cartesian3(120, 4, -2),
          new Cartesian3(140, -3, 5),
        ];
        const scales = [
          new Cartesian3(10, 2, 3),
          new Cartesian3(-4, 8, 2),
          new Cartesian3(2, 3, 10),
        ];
        for (let rebuild = 0; rebuild < 2; rebuild++) {
          if (rebuild !== 0) {
            model._drawCommandsBuilt = false;
            scene.renderForSpecs();
          }
          scene.frameState.commandList.length = 0;
          model._sceneGraph.pushDrawCommands(scene.frameState);
          const commands = scene.frameState.commandList;
          expect(commands.length).toBe(1);
          for (const command of commands) {
            for (let instance = 0; instance < 3; instance++) {
              for (let corner = 0; corner < 8; corner++) {
                const point = new Cartesian3(
                  corner & 1 ? 0.5 : -0.5,
                  corner & 2 ? 0.5 : -0.5,
                  corner & 4 ? 0.5 : -0.5,
                );
                Cartesian3.multiplyComponents(point, scales[instance], point);
                Cartesian3.add(point, translations[instance], point);
                Matrix4.multiplyByPoint(command.modelMatrix, point, point);
                expect(
                  Cartesian3.distance(command.boundingVolume.center, point),
                ).toBeLessThanOrEqual(
                  command.boundingVolume.radius + CesiumMath.EPSILON10,
                );
                expect(
                  Cartesian3.distance(model.boundingSphere.center, point),
                ).toBeLessThanOrEqual(
                  model.boundingSphere.radius + CesiumMath.EPSILON10,
                );
              }
            }
          }
        }
      });
    });

    it("creates runtime nodes and runtime primitives from a model", async function () {
      const model = await loadAndZoomToModelAsync(
        { gltf: vertexColorGltfUrl },
        scene,
      );
      const sceneGraph = model._sceneGraph;
      const components = sceneGraph._components;

      expect(sceneGraph).toBeDefined();

      const runtimeNodes = sceneGraph._runtimeNodes;
      expect(runtimeNodes.length).toEqual(components.nodes.length);

      expect(runtimeNodes[0].runtimePrimitives.length).toEqual(1);
      expect(runtimeNodes[1].runtimePrimitives.length).toEqual(1);
    });

    it("builds draw commands for all opaque styled features", async function () {
      const style = new Cesium3DTileStyle({
        color: {
          conditions: [["${height} > 1", "color('red')"]],
        },
      });

      const model = await loadAndZoomToModelAsync(
        {
          gltf: buildingsMetadata,
        },
        scene,
      );
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

    it("builds draw commands for all translucent styled features", async function () {
      const style = new Cesium3DTileStyle({
        color: {
          conditions: [["${height} > 1", "color('red', 0.1)"]],
        },
      });
      const model = await loadAndZoomToModelAsync(
        {
          gltf: buildingsMetadata,
        },
        scene,
      );
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

    it("builds draw commands for both opaque and translucent styled features", async function () {
      const style = new Cesium3DTileStyle({
        color: {
          conditions: [
            ["${height} > 80", "color('red', 0.1)"],
            ["true", "color('blue')"],
          ],
        },
      });

      const model = await loadAndZoomToModelAsync(
        {
          gltf: buildingsMetadata,
        },
        scene,
      );
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

    it("builds draw commands for each primitive", async function () {
      spyOn(ModelSceneGraph.prototype, "buildDrawCommands").and.callThrough();
      spyOn(ModelSceneGraph.prototype, "pushDrawCommands").and.callThrough();
      const model = await loadAndZoomToModelAsync(
        { gltf: parentGltfUrl },
        scene,
      );

      const sceneGraph = model._sceneGraph;
      const runtimeNodes = sceneGraph._runtimeNodes;

      let primitivesCount = 0;
      for (let i = 0; i < runtimeNodes.length; i++) {
        primitivesCount += runtimeNodes[i].runtimePrimitives.length;
      }

      const frameState = scene.frameState;
      frameState.commandList.length = 0;
      scene.renderForSpecs();
      expect(ModelSceneGraph.prototype.buildDrawCommands).toHaveBeenCalled();
      expect(ModelSceneGraph.prototype.pushDrawCommands).toHaveBeenCalled();
      expect(frameState.commandList.length).toEqual(primitivesCount);

      // Reset the draw command list to see if they're re-built.
      model._drawCommandsBuilt = false;
      frameState.commandList.length = 0;
      scene.renderForSpecs();
      expect(ModelSceneGraph.prototype.buildDrawCommands).toHaveBeenCalled();
      expect(ModelSceneGraph.prototype.pushDrawCommands).toHaveBeenCalled();
      expect(frameState.commandList.length).toEqual(primitivesCount);
    });

    it("stores runtime nodes correctly", async function () {
      const model = await loadAndZoomToModelAsync(
        { gltf: parentGltfUrl },
        scene,
      );

      const sceneGraph = model._sceneGraph;
      const components = sceneGraph._components;
      const runtimeNodes = sceneGraph._runtimeNodes;

      expect(runtimeNodes[0].node).toEqual(components.nodes[0]);
      expect(runtimeNodes[1].node).toEqual(components.nodes[1]);

      const rootNodes = sceneGraph._rootNodes;
      expect(rootNodes[0]).toEqual(0);
    });

    it("propagates node transforms correctly", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: parentGltfUrl,
          upAxis: Axis.Z,
          forwardAxis: Axis.X,
        },
        scene,
      );
      const sceneGraph = model._sceneGraph;
      const components = sceneGraph._components;
      const runtimeNodes = sceneGraph._runtimeNodes;

      expect(components.upAxis).toEqual(Axis.Z);
      expect(components.forwardAxis).toEqual(Axis.X);

      const parentTransform = ModelUtility.getNodeTransform(
        components.nodes[0],
      );
      const childTransform = ModelUtility.getNodeTransform(components.nodes[1]);
      expect(runtimeNodes[0].transform).toEqual(parentTransform);
      expect(runtimeNodes[0].transformToRoot).toEqual(Matrix4.IDENTITY);
      expect(runtimeNodes[1].transform).toEqual(childTransform);
      expect(runtimeNodes[1].transformToRoot).toEqual(parentTransform);
    });

    it("creates runtime skin from model", async function () {
      const model = await loadAndZoomToModelAsync(
        { gltf: simpleSkinGltfUrl },
        scene,
      );

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
    });

    it("creates articulation from model", async function () {
      const model = await loadAndZoomToModelAsync(
        { gltf: boxArticulationsUrl },
        scene,
      );

      const sceneGraph = model._sceneGraph;
      const components = sceneGraph._components;
      const runtimeNodes = sceneGraph._runtimeNodes;

      expect(runtimeNodes[0].node).toEqual(components.nodes[0]);

      const rootNodes = sceneGraph._rootNodes;
      expect(rootNodes[0]).toEqual(0);

      const runtimeArticulations = sceneGraph._runtimeArticulations;
      const runtimeArticulation = runtimeArticulations["SampleArticulation"];
      expect(runtimeArticulation).toBeDefined();
      expect(runtimeArticulation.name).toBe("SampleArticulation");
      expect(runtimeArticulation.runtimeNodes.length).toBe(1);
      expect(runtimeArticulation.runtimeStages.length).toBe(10);
    });

    it("applies articulations", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxArticulationsUrl,
        },
        scene,
      );
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

      expect(rootNode.transform).toEqualEpsilon(expected, CesiumMath.EPSILON10);
    });

    it("adds ModelColorPipelineStage when color is set on the model", async function () {
      spyOn(ModelColorPipelineStage, "process");
      await loadAndZoomToModelAsync(
        {
          color: Color.RED,
          gltf: parentGltfUrl,
        },
        scene,
      );
      expect(ModelColorPipelineStage.process).toHaveBeenCalled();
    });

    it("adds CustomShaderPipelineStage when customShader is set on the model", async function () {
      spyOn(CustomShaderPipelineStage, "process");
      const model = await loadAndZoomToModelAsync(
        {
          gltf: buildingsMetadata,
        },
        scene,
      );
      model.customShader = new CustomShader();
      model.update(scene.frameState);
      expect(CustomShaderPipelineStage.process).toHaveBeenCalled();
    });

    it("does not add fog stage when fog is not enabled", async function () {
      spyOn(AtmospherePipelineStage, "process");
      scene.fog.enabled = false;
      scene.fog.renderable = false;
      const model = await loadAndZoomToModelAsync(
        {
          gltf: buildingsMetadata,
        },
        scene,
      );
      model.customShader = new CustomShader();
      model.update(scene.frameState);
      expect(AtmospherePipelineStage.process).not.toHaveBeenCalled();
    });

    it("does not add fog stage when fog is not renderable", async function () {
      spyOn(AtmospherePipelineStage, "process");
      scene.fog.enabled = true;
      scene.fog.renderable = false;
      const model = await loadAndZoomToModelAsync(
        {
          gltf: buildingsMetadata,
        },
        scene,
      );
      model.customShader = new CustomShader();
      model.update(scene.frameState);
      expect(AtmospherePipelineStage.process).not.toHaveBeenCalled();
    });

    it("adds fog stage when fog is enabled and renderable", async function () {
      spyOn(AtmospherePipelineStage, "process");
      scene.fog.enabled = true;
      scene.fog.renderable = true;
      const model = await loadAndZoomToModelAsync(
        {
          gltf: buildingsMetadata,
        },
        scene,
      );
      model.customShader = new CustomShader();
      model.update(scene.frameState);
      expect(AtmospherePipelineStage.process).toHaveBeenCalled();
    });

    it("pushDrawCommands ignores hidden nodes", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: duckUrl,
        },
        scene,
      );
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
  "WebGL",
);
