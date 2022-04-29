import {
  Cartesian2,
  Cesium3DTileStyle,
  ClippingPlane,
  ClippingPlaneCollection,
  FeatureDetection,
  ImageBasedLighting,
  JulianDate,
  defaultValue,
  Matrix4,
  Math as CesiumMath,
  ResourceCache,
  Resource,
  ModelExperimental,
  Cartesian3,
  defined,
  HeadingPitchRange,
  ShaderProgram,
  ModelFeature,
  Axis,
  Color,
  StyleCommandsNeeded,
  ModelExperimentalSceneGraph,
  PrimitiveType,
  WireframeIndexGenerator,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import loadAndZoomToModelExperimental from "./loadAndZoomToModelExperimental.js";

describe(
  "Scene/ModelExperimental/ModelExperimental",
  function () {
    const webglStub = !!window.webglStub;

    const triangleWithoutIndicesUrl =
      "./Data/Models/GltfLoader/TriangleWithoutIndices/glTF/TriangleWithoutIndices.gltf";
    const triangleStripUrl =
      "./Data/Models/GltfLoader/TriangleStrip/glTF/TriangleStrip.gltf";
    const triangleFanUrl =
      "./Data/Models/GltfLoader/TriangleFan/glTF/TriangleFan.gltf";

    const boxTexturedGlbUrl =
      "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";
    const buildingsMetadata =
      "./Data/Models/GltfLoader/BuildingsMetadata/glTF/buildings-metadata.gltf";
    const boxTexturedGltfUrl =
      "./Data/Models/GltfLoader/BoxTextured/glTF/BoxTextured.gltf";
    const boxWithCreditsUrl =
      "./Data/Models/GltfLoader/BoxWithCopyright/glTF/Box.gltf";
    const microcosm = "./Data/Models/GltfLoader/Microcosm/glTF/microcosm.gltf";
    const boxInstanced =
      "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";
    const boxUnlitUrl = "./Data/Models/PBR/BoxUnlit/BoxUnlit.gltf";
    const boxBackFaceCullingUrl =
      "./Data/Models/Box-Back-Face-Culling/Box-Back-Face-Culling.gltf";
    const boxBackFaceCullingOffset = new HeadingPitchRange(Math.PI / 2, 0, 2.0);
    const morphPrimitivesTestUrl =
      "./Data/Models/GltfLoader/MorphPrimitivesTest/glTF/MorphPrimitivesTest.gltf";
    const animatedTriangleUrl =
      "./Data/Models/GltfLoader/AnimatedTriangle/glTF/AnimatedTriangle.gltf";

    const pointCloudUrl =
      "./Data/Models/GltfLoader/PointCloudWithRGBColors/glTF-Binary/PointCloudWithRGBColors.glb";

    let scene;
    let sceneWithWebgl2;

    beforeAll(function () {
      scene = createScene();
      sceneWithWebgl2 = createScene({
        requestWebgl2: true,
      });
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      ResourceCache.clearForSpecs();
    });

    function zoomTo(model, zoom) {
      zoom = defaultValue(zoom, 4.0);

      const camera = scene.camera;
      const center = Matrix4.multiplyByPoint(
        model.modelMatrix,
        model.boundingSphere.center,
        new Cartesian3()
      );
      const r =
        zoom * Math.max(model.boundingSphere.radius, camera.frustum.near);
      camera.lookAt(center, new HeadingPitchRange(0.0, 0.0, r));
    }

    const scratchBytes = [];

    function verifyRender(model, shouldRender, options) {
      expect(model.ready).toBe(true);
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);

      const zoomToModel = defaultValue(options.zoomToModel, true);
      if (zoomToModel) {
        zoomTo(model);
      }

      const backgroundColor = defaultValue(
        options.backgroundColor,
        Color.BLACK
      );
      scene.backgroundColor = backgroundColor;
      const backgroundColorBytes = backgroundColor.toBytes(scratchBytes);

      const time = defaultValue(
        options.time,
        JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC"))
      );

      expect({
        scene: scene,
        time: time,
      }).toRenderAndCall(function (rgba) {
        if (shouldRender) {
          expect(rgba).not.toEqual(backgroundColorBytes);
        } else {
          expect(rgba).toEqual(backgroundColorBytes);
        }
      });

      scene.backgroundColor = Color.BLACK;
    }

    function verifyDebugWireframe(model, primitiveType, options) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);
      const modelHasIndices = defaultValue(options.hasIndices, true);
      const targetScene = defaultValue(options.scene, scene);

      const commandList = scene.frameState;
      const commandCounts = [];
      let i, command;

      targetScene.renderForSpecs();
      for (i = 0; i < commandList.length; i++) {
        command = commandList[i];
        expect(command.primitiveType).toBe(primitiveType);
        if (!modelHasIndices) {
          expect(command.vertexArray.indexBuffer).toBeUndefined();
        }
        commandCounts.push(command.count);
      }

      model.debugWireframe = true;
      expect(model._drawCommandsBuilt).toBe(false);

      targetScene.renderForSpecs();
      for (i = 0; i < commandList.length; i++) {
        command = commandList[i];
        expect(command.primitiveType).toBe(PrimitiveType.LINES);
        expect(command.vertexArray.indexBuffer).toBeDefined();

        const expectedCount = WireframeIndexGenerator.getWireframeIndicesCount(
          primitiveType,
          commandCounts[i]
        );
        expect(command.count).toEqual(expectedCount);
      }

      model.debugWireframe = false;
      expect(model._drawCommandsBuilt).toBe(false);

      targetScene.renderForSpecs();
      for (i = 0; i < commandList.length; i++) {
        command = commandList[i];
        expect(command.primitiveType).toBe(primitiveType);
        if (!modelHasIndices) {
          expect(command.vertexArray.indexBuffer).toBeUndefined();
        }
        expect(command.count).toEqual(commandCounts[i]);
      }
    }

    it("initializes and renders from Uint8Array", function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModelExperimental(
          { gltf: new Uint8Array(buffer) },
          scene
        ).then(function (model) {
          expect(model.ready).toEqual(true);
          expect(model._sceneGraph).toBeDefined();
          expect(model._resourcesLoaded).toEqual(true);
          verifyRender(model, true);
        });
      });
    });

    it("initializes feature table", function () {
      return loadAndZoomToModelExperimental(
        { gltf: buildingsMetadata },
        scene
      ).then(function (model) {
        expect(model.ready).toEqual(true);
        expect(model.featureTables).toBeDefined();

        const featureTable = model.featureTables[0];
        expect(featureTable).toBeDefined();

        const featuresLength = featureTable.featuresLength;
        expect(featuresLength).toEqual(10);
        expect(featureTable.batchTexture).toBeDefined();
        expect(featureTable.batchTexture._featuresLength).toEqual(10);

        for (let i = 0; i < featuresLength; i++) {
          const modelFeature = featureTable.getFeature(i);
          expect(modelFeature instanceof ModelFeature).toEqual(true);
          expect(modelFeature._featureId).toEqual(i);
          expect(modelFeature.primitive).toEqual(model);
          expect(modelFeature.featureTable).toEqual(featureTable);
        }

        expect(model._resourcesLoaded).toEqual(true);
      });
    });

    it("initializes and renders from JSON object", function () {
      const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
      return resource.fetchJson().then(function (gltf) {
        return loadAndZoomToModelExperimental(
          {
            gltf: gltf,
            basePath: boxTexturedGltfUrl,
          },
          scene
        ).then(function (model) {
          expect(model.ready).toEqual(true);
          expect(model._sceneGraph).toBeDefined();
          expect(model._resourcesLoaded).toEqual(true);
          verifyRender(model, true);
        });
      });
    });

    it("initializes and renders from JSON object with external buffers", function () {
      const resource = Resource.createIfNeeded(microcosm);
      return resource.fetchJson().then(function (gltf) {
        return loadAndZoomToModelExperimental(
          {
            gltf: gltf,
            basePath: microcosm,
          },
          scene
        ).then(function (model) {
          expect(model.ready).toEqual(true);
          expect(model._sceneGraph).toBeDefined();
          expect(model._resourcesLoaded).toEqual(true);
          verifyRender(model, true);
        });
      });
    });

    // Throws an extraneous promise through the texture loader which cannot be cleanly caught
    // https://github.com/CesiumGS/cesium/issues/10178
    xit("rejects ready promise when texture fails to load", function () {
      const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
      return resource.fetchJson().then(function (gltf) {
        gltf.images[0].uri = "non-existent-path.png";
        return loadAndZoomToModelExperimental(
          {
            gltf: gltf,
            basePath: boxTexturedGltfUrl,
            incrementallyLoadTextures: false,
          },
          scene
        )
          .then(function (model) {
            fail();
          })
          .catch(function (error) {
            expect(error).toBeDefined();
          });
      });
    });

    // Throws an extraneous promise through the texture loader which cannot be cleanly caught
    // https://github.com/CesiumGS/cesium/issues/10178
    xit("rejects ready promise when external buffer fails to load", function () {
      const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
      return resource.fetchJson().then(function (gltf) {
        gltf.buffers[0].uri = "non-existent-path.bin";
        return loadAndZoomToModelExperimental(
          {
            gltf: gltf,
            basePath: boxTexturedGltfUrl,
          },
          scene
        )
          .then(function (model) {
            fail();
          })
          .catch(function (error) {
            expect(error).toBeDefined();
          });
      });
    });

    it("renders glTF with morph targets", function () {
      const resource = Resource.createIfNeeded(morphPrimitivesTestUrl);
      return resource.fetchJson().then(function (gltf) {
        return loadAndZoomToModelExperimental(
          {
            gltf: gltf,
            basePath: morphPrimitivesTestUrl,
          },
          scene
        ).then(function (model) {
          // The background color must be changed because the model's texture
          // contains black, which can confuse the test.
          const renderOptions = {
            backgroundColor: Color.BLUE,
          };

          // The model is a plane made three-dimensional by morph targets.
          // If morph targets aren't supported, the model won't appear in the camera.
          verifyRender(model, true, renderOptions);
        });
      });
    });

    it("renders model without animations added", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: animatedTriangleUrl,
        },
        scene
      ).then(function (model) {
        const animationCollection = model.activeAnimations;
        expect(animationCollection).toBeDefined();
        expect(animationCollection.length).toBe(0);
        verifyRender(model, true, {
          zoomToModel: false,
        });
      });
    });

    it("renders model with animations added", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: animatedTriangleUrl,
        },
        scene
      ).then(function (model) {
        // The model rotates such that it leaves the view of the camera
        // halfway into its animation.
        const startTime = JulianDate.fromDate(
          new Date("January 1, 2014 12:00:00 UTC")
        );
        const animationCollection = model.activeAnimations;
        animationCollection.add({
          index: 0,
          startTime: startTime,
        });
        expect(animationCollection.length).toBe(1);
        verifyRender(model, true, {
          zoomToModel: false,
          time: startTime,
        });

        const time = JulianDate.addSeconds(startTime, 0.5, new JulianDate());
        verifyRender(model, false, {
          zoomToModel: false,
          time: time,
        });
      });
    });

    it("gets copyrights from gltf", function () {
      const resource = Resource.createIfNeeded(boxWithCreditsUrl);
      return resource.fetchJson().then(function (gltf) {
        return loadAndZoomToModelExperimental(
          {
            gltf: gltf,
            basePath: boxWithCreditsUrl,
          },
          scene
        ).then(function (model) {
          const expectedCredits = [
            "First Source",
            "Second Source",
            "Third Source",
          ];

          scene.renderForSpecs();
          const creditDisplay = scene.frameState.creditDisplay;
          const credits =
            creditDisplay._currentFrameCredits.lightboxCredits.values;
          const length = credits.length;
          expect(length).toEqual(expectedCredits.length);
          for (let i = 0; i < length; i++) {
            expect(credits[i].credit.html).toEqual(expectedCredits[i]);
          }
        });
      });
    });

    it("shows credits on screen", function () {
      const resource = Resource.createIfNeeded(boxWithCreditsUrl);
      return resource.fetchJson().then(function (gltf) {
        return loadAndZoomToModelExperimental(
          {
            gltf: gltf,
            basePath: boxWithCreditsUrl,
            showCreditsOnScreen: true,
          },
          scene
        ).then(function (model) {
          const expectedCredits = [
            "First Source",
            "Second Source",
            "Third Source",
          ];

          scene.renderForSpecs();
          const creditDisplay = scene.frameState.creditDisplay;
          const credits =
            creditDisplay._currentFrameCredits.screenCredits.values;
          const length = credits.length;
          expect(length).toEqual(expectedCredits.length);
          for (let i = 0; i < length; i++) {
            expect(credits[i].credit.html).toEqual(expectedCredits[i]);
          }
        });
      });
    });

    it("toggles showing credits on screen", function () {
      const resource = Resource.createIfNeeded(boxWithCreditsUrl);
      return resource.fetchJson().then(function (gltf) {
        return loadAndZoomToModelExperimental(
          {
            gltf: gltf,
            basePath: boxWithCreditsUrl,
            showCreditsOnScreen: false,
          },
          scene
        ).then(function (model) {
          const expectedCredits = [
            "First Source",
            "Second Source",
            "Third Source",
          ];

          scene.renderForSpecs();
          const creditDisplay = scene.frameState.creditDisplay;
          const lightboxCredits =
            creditDisplay._currentFrameCredits.lightboxCredits.values;
          const screenCredits =
            creditDisplay._currentFrameCredits.screenCredits.values;

          let length = lightboxCredits.length;
          expect(length).toEqual(expectedCredits.length);
          for (let i = 0; i < length; i++) {
            expect(lightboxCredits[i].credit.html).toEqual(expectedCredits[i]);
          }
          expect(screenCredits.length).toEqual(0);

          model.showCreditsOnScreen = true;
          scene.renderForSpecs();
          length = screenCredits.length;
          expect(length).toEqual(expectedCredits.length);
          for (let i = 0; i < length; i++) {
            expect(screenCredits[i].credit.html).toEqual(expectedCredits[i]);
          }
          expect(lightboxCredits.length).toEqual(0);

          model.showCreditsOnScreen = false;
          scene.renderForSpecs();
          length = lightboxCredits.length;
          expect(length).toEqual(expectedCredits.length);
          for (let i = 0; i < length; i++) {
            expect(lightboxCredits[i].credit.html).toEqual(expectedCredits[i]);
          }
          expect(screenCredits.length).toEqual(0);
        });
      });
    });

    it("show works", function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModelExperimental(
          { gltf: new Uint8Array(buffer), show: false },
          scene
        ).then(function (model) {
          expect(model.ready).toEqual(true);
          expect(model.show).toEqual(false);
          verifyRender(model, false);
          model.show = true;
          expect(model.show).toEqual(true);
          verifyRender(model, true);
        });
      });
    });

    it("debugWireframe works", function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModelExperimental(
          { gltf: new Uint8Array(buffer) },
          scene
        ).then(function (model) {
          verifyDebugWireframe(model, PrimitiveType.TRIANGLES);
        });
      });
    });

    it("debugWireframe works for WebGL2", function () {
      if (!sceneWithWebgl2.context.webgl2) {
        return;
      }
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModelExperimental(
          { gltf: new Uint8Array(buffer) },
          scene
        ).then(function (model) {
          verifyDebugWireframe(model, PrimitiveType.TRIANGLES, {
            scene: sceneWithWebgl2,
          });
        });
      });
    });

    it("debugWireframe works for model without indices", function () {
      return loadAndZoomToModelExperimental(
        { gltf: triangleWithoutIndicesUrl },
        scene
      ).then(function (model) {
        verifyDebugWireframe(model, PrimitiveType.TRIANGLES, {
          hasIndices: false,
        });
      });
    });

    it("debugWireframe works for model with triangle strip", function () {
      return loadAndZoomToModelExperimental(
        { gltf: triangleStripUrl },
        scene
      ).then(function (model) {
        verifyDebugWireframe(model, PrimitiveType.TRIANGLE_STRIP);
      });
    });

    it("debugWireframe works for model with triangle fan", function () {
      return loadAndZoomToModelExperimental(
        { gltf: triangleFanUrl },
        scene
      ).then(function (model) {
        verifyDebugWireframe(model, PrimitiveType.TRIANGLE_FAN);
      });
    });

    it("debugWireframe ignores points", function () {
      return loadAndZoomToModelExperimental(
        { gltf: pointCloudUrl },
        scene
      ).then(function (model) {
        const commandList = scene.frameState;
        let i, command;
        for (i = 0; i < commandList.length; i++) {
          expect(commandList[i].primitiveType).toBe(PrimitiveType.POINTS);
          expect(command.vertexArray.indexBuffer).toBeUndefined();
        }

        model.debugWireframe = true;
        for (i = 0; i < commandList.length; i++) {
          expect(commandList[i].primitiveType).toBe(PrimitiveType.POINTS);
          expect(command.vertexArray.indexBuffer).toBeUndefined();
        }
      });
    });

    it("debugShowBoundingVolume works", function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModelExperimental(
          { gltf: new Uint8Array(buffer), debugShowBoundingVolume: true },
          scene
        ).then(function (model) {
          let i;
          scene.renderForSpecs();
          const commandList = scene.frameState;
          for (i = 0; i < commandList.length; i++) {
            expect(commandList[i].debugShowBoundingVolume).toBe(true);
          }
          model.debugShowBoundingVolume = false;
          expect(model._debugShowBoundingVolumeDirty).toBe(true);
          scene.renderForSpecs();
          for (i = 0; i < commandList.length; i++) {
            expect(commandList[i].debugShowBoundingVolume).toBe(false);
          }
        });
      });
    });

    it("boundingSphere works", function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModelExperimental(
          { gltf: new Uint8Array(buffer), debugShowBoundingVolume: true },
          scene
        ).then(function (model) {
          const boundingSphere = model.boundingSphere;
          expect(boundingSphere).toBeDefined();
          expect(boundingSphere.center).toEqual(new Cartesian3());
          expect(boundingSphere.radius).toEqualEpsilon(
            0.8660254037844386,
            CesiumMath.EPSILON8
          );
        });
      });
    });

    // see https://github.com/CesiumGS/cesium/pull/10115
    xit("renders model with style", function () {
      let model;
      let style;
      return loadAndZoomToModelExperimental({ gltf: buildingsMetadata }, scene)
        .then(function (result) {
          model = result;
          // Renders without style.
          verifyRender(model, true);

          // Renders with opaque style.
          style = new Cesium3DTileStyle({
            color: {
              conditions: [["${height} > 1", "color('red')"]],
            },
          });
          return style.readyPromise;
        })
        .then(function () {
          model.style = style;
          verifyRender(model, true);

          // Renders with translucent style.
          style = new Cesium3DTileStyle({
            color: {
              conditions: [["${height} > 1", "color('red', 0.5)"]],
            },
          });
          return style.readyPromise;
        })
        .then(function () {
          model.style = style;
          verifyRender(model, true);

          // Does not render when style disables show.
          style = new Cesium3DTileStyle({
            color: {
              conditions: [["${height} > 1", "color('red', 0.0)"]],
            },
          });
          return style.readyPromise;
        })
        .then(function () {
          model.style = style;
          verifyRender(model, false);

          // Render when style is removed.
          model.style = undefined;
          verifyRender(model, true);
        });
    });

    it("fromGltf throws with undefined options", function () {
      expect(function () {
        ModelExperimental.fromGltf();
      }).toThrowDeveloperError();
    });

    it("fromGltf throws with undefined url", function () {
      expect(function () {
        ModelExperimental.fromGltf({});
      }).toThrowDeveloperError();
    });

    it("picks box textured", function () {
      if (FeatureDetection.isInternetExplorer()) {
        // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
        return;
      }

      // This model gets clipped if log depth is disabled, so zoom out
      // the camera just a little
      const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

      return loadAndZoomToModelExperimental(
        {
          gltf: boxTexturedGlbUrl,
          offset: offset,
        },
        scene
      ).then(function (model) {
        expect(scene).toPickAndCall(function (result) {
          expect(result.primitive).toBeInstanceOf(ModelExperimental);
          expect(result.primitive).toEqual(model);
        });
      });
    });

    it("doesn't pick when allowPicking is false", function () {
      if (FeatureDetection.isInternetExplorer()) {
        // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
        return;
      }

      return loadAndZoomToModelExperimental(
        {
          gltf: boxTexturedGlbUrl,
          allowPicking: false,
        },
        scene
      ).then(function () {
        expect(scene).toPickAndCall(function (result) {
          expect(result).toBeUndefined();
        });
      });
    });

    function setFeaturesWithOpacity(
      featureTable,
      opaqueFeaturesLength,
      translucentFeaturesLength
    ) {
      let i, feature;
      for (i = 0; i < opaqueFeaturesLength; i++) {
        feature = featureTable.getFeature(i);
        feature.color = Color.RED;
      }
      for (
        i = opaqueFeaturesLength;
        i < opaqueFeaturesLength + translucentFeaturesLength;
        i++
      ) {
        feature = featureTable.getFeature(i);
        feature.color = Color.RED.withAlpha(0.5);
      }
    }

    it("resets draw commands when the style commands needed are changed", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: buildingsMetadata,
        },
        scene
      ).then(function (model) {
        const featureTable = model.featureTables[model.featureTableId];

        // Set all features to opaque.
        setFeaturesWithOpacity(featureTable, 10, 0);
        scene.renderForSpecs();
        expect(featureTable.styleCommandsNeededDirty).toEqual(false);
        expect(featureTable._styleCommandsNeeded).toEqual(
          StyleCommandsNeeded.ALL_OPAQUE
        );

        // Set some features to translucent.
        setFeaturesWithOpacity(featureTable, 8, 2);
        scene.renderForSpecs();
        expect(featureTable.styleCommandsNeededDirty).toEqual(true);
        expect(featureTable._styleCommandsNeeded).toEqual(
          StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT
        );

        // Set some more features to translucent.
        setFeaturesWithOpacity(featureTable, 2, 8);
        scene.renderForSpecs();
        expect(featureTable.styleCommandsNeededDirty).toEqual(false);
        expect(featureTable._styleCommandsNeeded).toEqual(
          StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT
        );

        // Set all features to translucent.
        setFeaturesWithOpacity(featureTable, 0, 10);
        scene.renderForSpecs();
        expect(featureTable.styleCommandsNeededDirty).toEqual(true);
        expect(featureTable._styleCommandsNeeded).toEqual(
          StyleCommandsNeeded.ALL_TRANSLUCENT
        );
      });
    });

    it("selects feature table for instanced feature ID attributes", function () {
      if (webglStub) {
        return;
      }
      return loadAndZoomToModelExperimental(
        {
          gltf: boxInstanced,
          instanceFeatureIdLabel: "section",
        },
        scene
      ).then(function (model) {
        expect(model.featureTableId).toEqual(1);
      });
    });

    it("selects feature table for feature ID textures", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: microcosm,
        },
        scene
      ).then(function (model) {
        expect(model.featureTableId).toEqual(0);
      });
    });

    it("selects feature table for feature ID attributes", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: buildingsMetadata,
        },
        scene
      ).then(function (model) {
        expect(model.featureTableId).toEqual(0);
      });
    });

    it("featureIdLabel setter works", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: buildingsMetadata,
        },
        scene
      ).then(function (model) {
        expect(model.featureIdLabel).toBe("featureId_0");
        model.featureIdLabel = "buildings";
        expect(model.featureIdLabel).toBe("buildings");
        model.featureIdLabel = 1;
        expect(model.featureIdLabel).toBe("featureId_1");
      });
    });

    it("instanceFeatureIdLabel setter works", function () {
      if (webglStub) {
        return;
      }
      return loadAndZoomToModelExperimental(
        {
          gltf: boxInstanced,
        },
        scene
      ).then(function (model) {
        expect(model.instanceFeatureIdLabel).toBe("instanceFeatureId_0");
        model.instanceFeatureIdLabel = "section";
        expect(model.instanceFeatureIdLabel).toBe("section");
        model.instanceFeatureIdLabel = 1;
        expect(model.instanceFeatureIdLabel).toBe("instanceFeatureId_1");
      });
    });

    it("initializes with model matrix", function () {
      const translation = new Cartesian3(10, 0, 0);
      const transform = Matrix4.fromTranslation(translation);

      return loadAndZoomToModelExperimental(
        {
          gltf: boxTexturedGlbUrl,
          upAxis: Axis.Z,
          forwardAxis: Axis.X,
          modelMatrix: transform,
        },
        scene
      ).then(function (model) {
        const sceneGraph = model.sceneGraph;
        scene.renderForSpecs();
        expect(Matrix4.equals(sceneGraph.computedModelMatrix, transform)).toBe(
          true
        );
        verifyRender(model, false);
        expect(model.boundingSphere.center).toEqual(translation);

        expect(sceneGraph.computedModelMatrix).not.toBe(transform);
        expect(model.modelMatrix).not.toBe(transform);
      });
    });

    it("changing model matrix works", function () {
      const updateModelMatrix = spyOn(
        ModelExperimentalSceneGraph.prototype,
        "updateModelMatrix"
      ).and.callThrough();
      return loadAndZoomToModelExperimental(
        { gltf: boxTexturedGlbUrl, upAxis: Axis.Z, forwardAxis: Axis.X },
        scene
      ).then(function (model) {
        verifyRender(model, true);
        const sceneGraph = model.sceneGraph;

        const transform = Matrix4.fromTranslation(new Cartesian3(10, 0, 0));

        Matrix4.multiplyTransformation(
          model.modelMatrix,
          transform,
          model.modelMatrix
        );
        scene.renderForSpecs();

        expect(updateModelMatrix).toHaveBeenCalled();
        expect(Matrix4.equals(sceneGraph.computedModelMatrix, transform)).toBe(
          true
        );
        verifyRender(model, false);
      });
    });

    it("changing model matrix affects bounding sphere", function () {
      const translation = new Cartesian3(10, 0, 0);
      return loadAndZoomToModelExperimental(
        { gltf: boxTexturedGlbUrl, upAxis: Axis.Z, forwardAxis: Axis.X },
        scene
      ).then(function (model) {
        const transform = Matrix4.fromTranslation(translation);
        expect(model.boundingSphere.center).toEqual(Cartesian3.ZERO);

        Matrix4.multiplyTransformation(
          model.modelMatrix,
          transform,
          model.modelMatrix
        );
        scene.renderForSpecs();

        expect(model.boundingSphere.center).toEqual(translation);
        verifyRender(model, false);
      });
    });

    it("initializes with light color", function () {
      return loadAndZoomToModelExperimental(
        { gltf: boxTexturedGltfUrl, lightColor: Cartesian3.ZERO },
        scene
      ).then(function (model) {
        verifyRender(model, false);
      });
    });

    it("changing light color works", function () {
      return loadAndZoomToModelExperimental(
        { gltf: boxTexturedGltfUrl },
        scene
      ).then(function (model) {
        model.lightColor = Cartesian3.ZERO;
        verifyRender(model, false);

        model.lightColor = new Cartesian3(1.0, 0.0, 0.0);
        verifyRender(model, true);

        model.lightColor = undefined;
        verifyRender(model, true);
      });
    });

    it("light color doesn't affect unlit models", function () {
      return loadAndZoomToModelExperimental({ gltf: boxUnlitUrl }, scene).then(
        function (model) {
          verifyRender(model, true);

          model.lightColor = Cartesian3.ZERO;
          verifyRender(model, true);
        }
      );
    });

    it("initializes with imageBasedLighting", function () {
      const ibl = new ImageBasedLighting({
        imageBasedLightingFactor: Cartesian2.ZERO,
        luminanceAtZenith: 0.5,
      });
      return loadAndZoomToModelExperimental(
        { gltf: boxTexturedGltfUrl, imageBasedLighting: ibl },
        scene
      ).then(function (model) {
        expect(model.imageBasedLighting).toBe(ibl);
      });
    });

    it("creates default imageBasedLighting", function () {
      return loadAndZoomToModelExperimental(
        { gltf: boxTexturedGltfUrl },
        scene
      ).then(function (model) {
        const imageBasedLighting = model.imageBasedLighting;
        expect(imageBasedLighting).toBeDefined();
        expect(
          Cartesian2.equals(
            imageBasedLighting.imageBasedLightingFactor,
            new Cartesian2(1, 1)
          )
        ).toBe(true);
        expect(imageBasedLighting.luminanceAtZenith).toBe(0.2);
        expect(
          imageBasedLighting.sphericalHarmonicCoefficients
        ).toBeUndefined();
        expect(imageBasedLighting.specularEnvironmentMaps).toBeUndefined();
      });
    });

    it("changing imageBasedLighting works", function () {
      const imageBasedLighting = new ImageBasedLighting({
        imageBasedLightingFactor: Cartesian2.ZERO,
      });
      return loadAndZoomToModelExperimental(
        { gltf: boxTexturedGltfUrl },
        scene
      ).then(function (model) {
        const renderOptions = {
          scene: scene,
          time: new JulianDate(2456659.0004050927),
        };

        let result;
        verifyRender(model, true);
        expect(renderOptions).toRenderAndCall(function (rgba) {
          result = rgba;
        });

        model.imageBasedLighting = imageBasedLighting;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(result);
        });
      });
    });

    it("initializes with scale", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: boxTexturedGlbUrl,
          upAxis: Axis.Z,
          forwardAxis: Axis.X,
          scale: 0.0,
        },
        scene
      ).then(function (model) {
        scene.renderForSpecs();

        verifyRender(model, false);
        expect(model.boundingSphere.center).toEqual(Cartesian3.ZERO);
        expect(model.boundingSphere.radius).toEqual(0.0);
      });
    });

    it("changing scale works", function () {
      const updateModelMatrix = spyOn(
        ModelExperimentalSceneGraph.prototype,
        "updateModelMatrix"
      ).and.callThrough();
      return loadAndZoomToModelExperimental(
        {
          gltf: boxTexturedGlbUrl,
          upAxis: Axis.Z,
          forwardAxis: Axis.X,
        },
        scene
      ).then(function (model) {
        verifyRender(model, true);
        model.scale = 0.0;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        verifyRender(model, false);

        model.scale = 1.0;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        verifyRender(model, true);
      });
    });

    it("changing scale affects bounding sphere", function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModelExperimental(
          {
            gltf: new Uint8Array(buffer),
            scale: 10,
          },
          scene
        ).then(function (model) {
          scene.renderForSpecs();

          const expectedRadius = 0.866;
          const boundingSphere = model.boundingSphere;
          expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
          expect(boundingSphere.radius).toEqualEpsilon(
            expectedRadius * 10.0,
            CesiumMath.EPSILON3
          );

          model.scale = 0.0;
          scene.renderForSpecs();
          expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
          expect(boundingSphere.radius).toEqual(0.0);

          model.scale = 1.0;
          scene.renderForSpecs();
          expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
          expect(boundingSphere.radius).toEqualEpsilon(
            expectedRadius,
            CesiumMath.EPSILON3
          );
        });
      });
    });

    it("initializes with minimumPixelSize", function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModelExperimental(
          {
            gltf: new Uint8Array(buffer),
            upAxis: Axis.Z,
            forwardAxis: Axis.X,
            minimumPixelSize: 1,
            offset: new HeadingPitchRange(0, 0, 500),
          },
          scene
        ).then(function (model) {
          const renderOptions = {
            zoomToModel: false,
          };

          const expectedRadius = 0.866;
          scene.renderForSpecs();
          verifyRender(model, true, renderOptions);

          // Verify that minimumPixelSize didn't affect other parameters
          expect(model.scale).toEqual(1.0);
          expect(model.boundingSphere.radius).toEqualEpsilon(
            expectedRadius,
            CesiumMath.EPSILON3
          );
        });
      });
    });

    it("changing minimumPixelSize works", function () {
      const updateModelMatrix = spyOn(
        ModelExperimentalSceneGraph.prototype,
        "updateModelMatrix"
      ).and.callThrough();
      return loadAndZoomToModelExperimental(
        {
          gltf: boxTexturedGlbUrl,
          upAxis: Axis.Z,
          forwardAxis: Axis.X,
          minimumPixelSize: 1,
          offset: new HeadingPitchRange(0, 0, 500),
        },
        scene
      ).then(function (model) {
        const renderOptions = {
          zoomToModel: false,
        };

        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        verifyRender(model, true, renderOptions);

        model.minimumPixelSize = 0.0;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        verifyRender(model, false, renderOptions);

        model.minimumPixelSize = 1;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        verifyRender(model, true, renderOptions);
      });
    });

    it("changing minimumPixelSize doesn't affect bounding sphere or scale", function () {
      const updateModelMatrix = spyOn(
        ModelExperimentalSceneGraph.prototype,
        "updateModelMatrix"
      ).and.callThrough();
      return loadAndZoomToModelExperimental(
        {
          gltf: boxTexturedGlbUrl,
          upAxis: Axis.Z,
          forwardAxis: Axis.X,
          minimumPixelSize: 1,
          offset: new HeadingPitchRange(0, 0, 500),
        },
        scene
      ).then(function (model) {
        const expectedRadius = 0.866;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        expect(model.scale).toEqual(1.0);
        expect(model.boundingSphere.radius).toEqualEpsilon(
          expectedRadius,
          CesiumMath.EPSILON3
        );

        model.minimumPixelSize = 0.0;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        expect(model.scale).toEqual(1.0);
        expect(model.boundingSphere.radius).toEqualEpsilon(
          expectedRadius,
          CesiumMath.EPSILON3
        );

        model.minimumPixelSize = 1;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        expect(model.scale).toEqual(1.0);
        expect(model.boundingSphere.radius).toEqualEpsilon(
          expectedRadius,
          CesiumMath.EPSILON3
        );
      });
    });

    it("initializes with maximumScale", function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModelExperimental(
          {
            gltf: new Uint8Array(buffer),
            upAxis: Axis.Z,
            forwardAxis: Axis.X,
            maximumScale: 0.0,
          },
          scene
        ).then(function (model) {
          scene.renderForSpecs();
          verifyRender(model, false);
          expect(model.boundingSphere.center).toEqual(Cartesian3.ZERO);
          expect(model.boundingSphere.radius).toEqual(0.0);
        });
      });
    });

    it("changing maximumScale works", function () {
      const updateModelMatrix = spyOn(
        ModelExperimentalSceneGraph.prototype,
        "updateModelMatrix"
      ).and.callThrough();
      return loadAndZoomToModelExperimental(
        {
          gltf: boxTexturedGlbUrl,
          upAxis: Axis.Z,
          forwardAxis: Axis.X,
          scale: 2.0,
        },
        scene
      ).then(function (model) {
        scene.renderForSpecs();
        verifyRender(model, true);

        model.maximumScale = 0.0;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        verifyRender(model, false);

        model.maximumScale = 1.0;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        verifyRender(model, true);
      });
    });

    it("changing maximumScale affects bounding sphere", function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModelExperimental(
          {
            gltf: new Uint8Array(buffer),
            debugShowBoundingVolume: true,
            scale: 20,
            maximumScale: 10,
          },
          scene
        ).then(function (model) {
          scene.renderForSpecs();

          const expectedRadius = 0.866;
          const boundingSphere = model.boundingSphere;
          expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
          expect(boundingSphere.radius).toEqualEpsilon(
            expectedRadius * 10.0,
            CesiumMath.EPSILON3
          );

          model.maximumScale = 0.0;
          scene.renderForSpecs();
          expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
          expect(boundingSphere.radius).toEqual(0.0);

          model.maximumScale = 1.0;
          scene.renderForSpecs();
          expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
          expect(boundingSphere.radius).toEqualEpsilon(
            expectedRadius,
            CesiumMath.EPSILON3
          );
        });
      });
    });

    it("changing maximumScale affects minimumPixelSize", function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModelExperimental(
          {
            gltf: new Uint8Array(buffer),
            debugShowBoundingVolume: true,
            minimumPixelSize: 1,
            maximumScale: 10,
          },
          scene
        ).then(function (model) {
          scene.renderForSpecs();

          const expectedRadius = 0.866;
          const boundingSphere = model.boundingSphere;
          expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
          expect(boundingSphere.radius).toEqualEpsilon(
            expectedRadius,
            CesiumMath.EPSILON3
          );

          model.maximumScale = 0.0;
          scene.renderForSpecs();
          expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
          expect(boundingSphere.radius).toEqual(0.0);

          model.maximumScale = 10.0;
          scene.renderForSpecs();
          expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
          expect(boundingSphere.radius).toEqualEpsilon(
            expectedRadius,
            CesiumMath.EPSILON3
          );
        });
      });
    });

    it("enables back-face culling", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: boxBackFaceCullingUrl,
          backFaceCulling: true,
          offset: boxBackFaceCullingOffset,
        },
        scene
      ).then(function (model) {
        const renderOptions = {
          scene: scene,
          time: new JulianDate(2456659.0004050927),
        };

        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual([0, 0, 0, 255]);
        });
      });
    });

    it("disables back-face culling", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: boxBackFaceCullingUrl,
          backFaceCulling: false,
          offset: boxBackFaceCullingOffset,
        },
        scene
      ).then(function (model) {
        const renderOptions = {
          scene: scene,
          time: new JulianDate(2456659.0004050927),
        };

        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
        });
      });
    });

    it("ignores back-face culling when translucent", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: boxBackFaceCullingUrl,
          backFaceCulling: true,
          offset: boxBackFaceCullingOffset,
        },
        scene
      ).then(function (model) {
        const renderOptions = {
          scene: scene,
          time: new JulianDate(2456659.0004050927),
        };

        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual([0, 0, 0, 255]);
        });

        model.color = new Color(0, 0, 1.0, 0.5);

        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
        });
      });
    });

    it("toggles back-face culling at runtime", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: boxBackFaceCullingUrl,
          backFaceCulling: false,
          offset: boxBackFaceCullingOffset,
        },
        scene
      ).then(function (model) {
        const renderOptions = {
          scene: scene,
          time: new JulianDate(2456659.0004050927),
        };

        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
        });

        model.backFaceCulling = true;

        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual([0, 0, 0, 255]);
        });
      });
    });

    it("ignores back-face culling toggles when translucent", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: boxBackFaceCullingUrl,
          backFaceCulling: false,
          offset: boxBackFaceCullingOffset,
        },
        scene
      ).then(function (model) {
        const renderOptions = {
          scene: scene,
          time: new JulianDate(2456659.0004050927),
        };

        model.color = new Color(0, 0, 1.0, 0.5);

        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
        });

        model.backFaceCulling = true;

        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
        });

        model.backFaceCulling = false;

        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
        });
      });
    });

    it("throws when given clipping planes attached to another model", function () {
      const plane = new ClippingPlane(Cartesian3.UNIT_X, 0.0);
      const clippingPlanes = new ClippingPlaneCollection({
        planes: [plane],
      });
      return loadAndZoomToModelExperimental(
        { gltf: boxTexturedGlbUrl, clippingPlanes: clippingPlanes },
        scene
      )
        .then(function (model) {
          return loadAndZoomToModelExperimental(
            { gltf: boxTexturedGlbUrl },
            scene
          );
        })
        .then(function (model2) {
          expect(function () {
            model2.clippingPlanes = clippingPlanes;
          }).toThrowDeveloperError();
        });
    });

    it("updates clipping planes when clipping planes are enabled", function () {
      const plane = new ClippingPlane(Cartesian3.UNIT_X, 0.0);
      const clippingPlanes = new ClippingPlaneCollection({
        planes: [plane],
      });
      return loadAndZoomToModelExperimental(
        { gltf: boxTexturedGlbUrl },
        scene
      ).then(function (model) {
        const gl = scene.frameState.context._gl;
        spyOn(gl, "texImage2D").and.callThrough();

        scene.renderForSpecs();
        const callsBeforeClipping = gl.texImage2D.calls.count();

        model.clippingPlanes = clippingPlanes;
        scene.renderForSpecs();
        scene.renderForSpecs();
        // When clipping planes are created, we expect two calls to texImage2D
        // (one for initial creation, and one for copying the data in)
        // because clipping planes is stored inside a texture.
        expect(gl.texImage2D.calls.count() - callsBeforeClipping).toEqual(2);
      });
    });

    it("initializes and updates with clipping planes", function () {
      const plane = new ClippingPlane(Cartesian3.UNIT_X, -2.5);
      const clippingPlanes = new ClippingPlaneCollection({
        planes: [plane],
      });
      return loadAndZoomToModelExperimental(
        { gltf: boxTexturedGlbUrl, clippingPlanes: clippingPlanes },
        scene
      ).then(function (model) {
        scene.renderForSpecs();
        verifyRender(model, false);

        model.clippingPlanes = undefined;
        scene.renderForSpecs();
        verifyRender(model, true);
      });
    });

    it("updating clipping planes properties works", function () {
      const direction = Cartesian3.multiplyByScalar(
        Cartesian3.UNIT_X,
        -1,
        new Cartesian3()
      );
      const plane = new ClippingPlane(direction, 0.0);
      const clippingPlanes = new ClippingPlaneCollection({
        planes: [plane],
      });
      return loadAndZoomToModelExperimental(
        { gltf: boxTexturedGlbUrl },
        scene
      ).then(function (model) {
        let modelColor;
        scene.renderForSpecs();
        verifyRender(model, true);
        expect(scene).toRenderAndCall(function (rgba) {
          modelColor = rgba;
        });

        // The clipping plane should cut the model in half such that
        // we see the back faces.
        model.clippingPlanes = clippingPlanes;
        scene.renderForSpecs();
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(modelColor);
        });

        plane.distance = 10.0; // Move the plane away from the model
        scene.renderForSpecs();
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual(modelColor);
        });
      });
    });

    it("clipping planes apply edge styling", function () {
      const plane = new ClippingPlane(Cartesian3.UNIT_X, 0);
      const clippingPlanes = new ClippingPlaneCollection({
        planes: [plane],
        edgeWidth: 25.0, // make large enough to show up on the render
        edgeColor: Color.BLUE,
      });

      return loadAndZoomToModelExperimental(
        { gltf: boxTexturedGlbUrl },
        scene
      ).then(function (model) {
        let modelColor;
        scene.renderForSpecs();
        verifyRender(model, true);
        expect(scene).toRenderAndCall(function (rgba) {
          modelColor = rgba;
        });

        model.clippingPlanes = clippingPlanes;

        scene.renderForSpecs();
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual([0, 0, 255, 255]);
        });

        clippingPlanes.edgeWidth = 0.0;
        scene.renderForSpecs();
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual(modelColor);
        });
      });
    });

    it("clipping planes union regions", function () {
      const clippingPlanes = new ClippingPlaneCollection({
        planes: [
          new ClippingPlane(Cartesian3.UNIT_Z, 5.0),
          new ClippingPlane(Cartesian3.UNIT_X, -2.0),
        ],
        unionClippingRegions: true,
      });
      return loadAndZoomToModelExperimental(
        { gltf: boxTexturedGlbUrl },
        scene
      ).then(function (model) {
        scene.renderForSpecs();
        verifyRender(model, true);

        // These planes are defined such that the model is outside their union.
        model.clippingPlanes = clippingPlanes;
        scene.renderForSpecs();
        verifyRender(model, false);

        model.clippingPlanes.unionClippingRegions = false;
        scene.renderForSpecs();
        verifyRender(model, true);
      });
    });

    it("destroy works", function () {
      spyOn(ShaderProgram.prototype, "destroy").and.callThrough();
      return loadAndZoomToModelExperimental(
        { gltf: boxTexturedGlbUrl },
        scene
      ).then(function (model) {
        const resources = model._resources;
        const loader = model._loader;
        let resource;

        let i;
        for (i = 0; i < resources.length; i++) {
          resource = resources[i];
          if (defined(resource.isDestroyed)) {
            expect(resource.isDestroyed()).toEqual(false);
          }
        }
        expect(loader.isDestroyed()).toEqual(false);
        expect(model.isDestroyed()).toEqual(false);
        scene.primitives.remove(model);
        if (!webglStub) {
          expect(ShaderProgram.prototype.destroy).toHaveBeenCalled();
        }
        for (i = 0; i < resources.length - 1; i++) {
          resource = resources[i];
          if (defined(resource.isDestroyed)) {
            expect(resource.isDestroyed()).toEqual(true);
          }
        }
        expect(loader.isDestroyed()).toEqual(true);
        expect(model.isDestroyed()).toEqual(true);
      });
    });

    it("destroys attached ClippingPlaneCollections", function () {
      return loadAndZoomToModelExperimental(
        {
          gltf: boxTexturedGlbUrl,
        },
        scene
      ).then(function (model) {
        const clippingPlanes = new ClippingPlaneCollection({
          planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
        });

        model.clippingPlanes = clippingPlanes;
        expect(model.isDestroyed()).toEqual(false);
        expect(clippingPlanes.isDestroyed()).toEqual(false);

        scene.primitives.remove(model);
        expect(model.isDestroyed()).toEqual(true);
        expect(clippingPlanes.isDestroyed()).toEqual(true);
      });
    });

    it("destroys ClippingPlaneCollections that are detached", function () {
      let clippingPlanes;
      return loadAndZoomToModelExperimental(
        {
          gltf: boxTexturedGlbUrl,
        },
        scene
      ).then(function (model) {
        clippingPlanes = new ClippingPlaneCollection({
          planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
        });
        model.clippingPlanes = clippingPlanes;
        expect(clippingPlanes.isDestroyed()).toBe(false);

        model.clippingPlanes = undefined;
        expect(clippingPlanes.isDestroyed()).toBe(true);
      });
    });

    it("destroy doesn't destroy resources when they're in use", function () {
      return Promise.all([
        loadAndZoomToModelExperimental({ gltf: boxTexturedGlbUrl }, scene),
        loadAndZoomToModelExperimental({ gltf: boxTexturedGlbUrl }, scene),
      ]).then(function (models) {
        const cacheEntries = ResourceCache.cacheEntries;
        let cacheKey;
        let cacheEntry;

        scene.primitives.remove(models[0]);

        for (cacheKey in cacheEntries) {
          if (cacheEntries.hasOwnProperty(cacheKey)) {
            cacheEntry = cacheEntries[cacheKey];
            expect(cacheEntry.referenceCount).toBeGreaterThan(0);
          }
        }

        scene.primitives.remove(models[1]);

        for (cacheKey in cacheEntries) {
          if (cacheEntries.hasOwnProperty(cacheKey)) {
            cacheEntry = cacheEntries[cacheKey];
            expect(cacheEntry.referenceCount).toBe(0);
          }
        }
      });
    });
  },
  "WebGL"
);
