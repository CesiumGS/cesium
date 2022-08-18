import {
  Axis,
  Cartesian2,
  Cartesian3,
  Cesium3DTileStyle,
  CesiumTerrainProvider,
  ClassificationType,
  ClippingPlane,
  ClippingPlaneCollection,
  Color,
  ColorBlendMode,
  Credit,
  defaultValue,
  defined,
  DistanceDisplayCondition,
  DracoLoader,
  Ellipsoid,
  Event,
  FeatureDetection,
  HeadingPitchRange,
  HeadingPitchRoll,
  HeightReference,
  ImageBasedLighting,
  JobScheduler,
  JulianDate,
  Math as CesiumMath,
  Matrix4,
  Model,
  ModelSceneGraph,
  ModelFeature,
  Pass,
  PrimitiveType,
  Resource,
  ResourceCache,
  ShaderProgram,
  ShadowMode,
  SplitDirection,
  StyleCommandsNeeded,
  Transforms,
  WireframeIndexGenerator,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import pollToPromise from "../../pollToPromise.js";
import loadAndZoomToModel from "./loadAndZoomToModel.js";

describe(
  "Scene/Model/Model",
  function () {
    const webglStub = !!window.webglStub;

    const triangleWithoutIndicesUrl =
      "./Data/Models/GltfLoader/TriangleWithoutIndices/glTF/TriangleWithoutIndices.gltf";
    const animatedTriangleUrl =
      "./Data/Models/GltfLoader/AnimatedTriangle/glTF/AnimatedTriangle.gltf";
    const animatedTriangleOffset = new HeadingPitchRange(
      CesiumMath.PI / 2.0,
      0,
      2.0
    );

    const boxTexturedGltfUrl =
      "./Data/Models/GltfLoader/BoxTextured/glTF/BoxTextured.gltf";
    const boxTexturedGlbUrl =
      "./Data/Models/GltfLoader/BoxTextured/glTF-Binary/BoxTextured.glb";
    const buildingsMetadata =
      "./Data/Models/GltfLoader/BuildingsMetadata/glTF/buildings-metadata.gltf";

    const boxInstanced =
      "./Data/Models/GltfLoader/BoxInstanced/glTF/box-instanced.gltf";
    const boxUnlitUrl = "./Data/Models/PBR/BoxUnlit/BoxUnlit.gltf";
    const boxArticulationsUrl =
      "./Data/Models/GltfLoader/BoxArticulations/glTF/BoxArticulations.gltf";
    // prettier-ignore
    const boxArticulationsMatrix = Matrix4.fromRowMajorArray([
      1, 0, 0, 0,
      0, 0, 1, 0,
      0, -1, 0, 0,
      0, 0, 0, 1
    ]);

    const microcosm = "./Data/Models/GltfLoader/Microcosm/glTF/microcosm.gltf";
    const morphPrimitivesTestUrl =
      "./Data/Models/GltfLoader/MorphPrimitivesTest/glTF/MorphPrimitivesTest.gltf";
    const pointCloudUrl =
      "./Data/Models/GltfLoader/PointCloudWithRGBColors/glTF-Binary/PointCloudWithRGBColors.glb";
    const twoSidedPlaneUrl =
      "./Data/Models/GltfLoader/TwoSidedPlane/glTF/TwoSidedPlane.gltf";
    const vertexColorTestUrl =
      "./Data/Models/PBR/VertexColorTest/VertexColorTest.gltf";
    const emissiveTextureUrl = "./Data/Models/PBR/BoxEmissive/BoxEmissive.gltf";
    const boomBoxUrl =
      "./Data/Models/GltfLoader/BoomBox/glTF-pbrSpecularGlossiness/BoomBox.gltf";
    const riggedFigureUrl =
      "./Data/Models/GltfLoader/RiggedFigureTest/glTF/RiggedFigureTest.gltf";
    const dracoCesiumManUrl =
      "./Data/Models/DracoCompression/CesiumMan/CesiumMan.gltf";
    const boxCesiumRtcUrl =
      "./Data/Models/GltfLoader/BoxCesiumRtc/glTF/BoxCesiumRtc.gltf";

    const fixedFrameTransform = Transforms.localFrameToFixedFrameGenerator(
      "north",
      "west"
    );

    const modelMatrix = Transforms.headingPitchRollToFixedFrame(
      Cartesian3.fromDegrees(-123.0744619, 44.0503706, 0),
      new HeadingPitchRoll(0, 0, 0),
      Ellipsoid.WGS84,
      fixedFrameTransform
    );

    let scene;
    let scene2D;
    let sceneCV;

    beforeAll(function () {
      scene = createScene();

      scene2D = createScene();
      scene2D.morphTo2D(0.0);

      sceneCV = createScene();
      sceneCV.morphToColumbusView(0.0);
    });

    afterAll(function () {
      scene.destroyForSpecs();
      scene2D.destroyForSpecs();
      sceneCV.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      scene2D.primitives.removeAll();
      sceneCV.primitives.removeAll();
      ResourceCache.clearForSpecs();
    });

    function zoomTo(model, zoom) {
      zoom = defaultValue(zoom, 4.0);

      const camera = scene.camera;
      const center = model.boundingSphere.center;
      const r =
        zoom * Math.max(model.boundingSphere.radius, camera.frustum.near);
      camera.lookAt(center, new HeadingPitchRange(0.0, 0.0, r));
    }

    const scratchBytes = [];
    const defaultDate = JulianDate.fromDate(
      new Date("January 1, 2014 12:00:00 UTC")
    );

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

      const targetScene = defaultValue(options.scene, scene);

      targetScene.backgroundColor = backgroundColor;
      const backgroundColorBytes = backgroundColor.toBytes(scratchBytes);

      const time = defaultValue(options.time, defaultDate);

      expect({
        scene: targetScene,
        time: time,
      }).toRenderAndCall(function (rgba) {
        if (shouldRender) {
          expect(rgba).not.toEqual(backgroundColorBytes);
        } else {
          expect(rgba).toEqual(backgroundColorBytes);
        }
      });

      targetScene.backgroundColor = Color.BLACK;
    }

    function verifyDebugWireframe(model, primitiveType, options) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);
      const modelHasIndices = defaultValue(options.hasIndices, true);
      const targetScene = defaultValue(options.scene, scene);

      const commandList = targetScene.frameState.commandList;
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

    it("fromGltf throws with undefined options", function () {
      expect(function () {
        Model.fromGltf();
      }).toThrowDeveloperError();
    });

    it("fromGltf throws with undefined url", function () {
      expect(function () {
        Model.fromGltf({});
      }).toThrowDeveloperError();
    });

    it("initializes and renders from Uint8Array", function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModel({ gltf: new Uint8Array(buffer) }, scene).then(
          function (model) {
            expect(model.ready).toEqual(true);
            expect(model._sceneGraph).toBeDefined();
            expect(model._resourcesLoaded).toEqual(true);
            verifyRender(model, true);
          }
        );
      });
    });

    it("initializes and renders from JSON object", function () {
      const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
      return resource.fetchJson().then(function (gltf) {
        return loadAndZoomToModel(
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
        return loadAndZoomToModel(
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

    it("initializes and renders with url", function () {
      return loadAndZoomToModel(
        {
          url: boxTexturedGltfUrl,
        },
        scene
      ).then(function (model) {
        expect(model.ready).toEqual(true);
        expect(model._sceneGraph).toBeDefined();
        expect(model._resourcesLoaded).toEqual(true);
        verifyRender(model, true);
      });
    });

    it("rejects ready promise when texture fails to load", function () {
      const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
      return resource.fetchJson().then(function (gltf) {
        gltf.images[0].uri = "non-existent-path.png";
        const model = Model.fromGltf({
          gltf: gltf,
          basePath: boxTexturedGltfUrl,
          incrementallyLoadTextures: false,
        });
        scene.primitives.add(model);
        let finished = false;
        model.readyPromise
          .then(function (model) {
            finished = true;
            fail();
          })
          .catch(function (error) {
            finished = true;
            expect(error).toBeDefined();
          });

        let texturesFinished = false;
        model.texturesLoadedPromise
          .then(function () {
            texturesFinished = true;
            fail();
          })
          .catch(function (error) {
            texturesFinished = true;
            expect(error).toBeDefined();
          });

        return pollToPromise(function () {
          scene.renderForSpecs();
          return finished && texturesFinished;
        });
      });
    });

    it("rejects ready promise when external buffer fails to load", function () {
      const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
      return resource.fetchJson().then(function (gltf) {
        gltf.buffers[0].uri = "non-existent-path.bin";
        return loadAndZoomToModel(
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

    it("loads with asynchronous set to true", function () {
      const jobSchedulerExecute = spyOn(
        JobScheduler.prototype,
        "execute"
      ).and.callThrough();

      return loadAndZoomToModel(
        {
          gltf: boxTexturedGltfUrl,
          asynchronous: true,
        },
        scene
      ).then(function (model) {
        const loader = model.loader;
        expect(loader._asynchronous).toBe(true);

        expect(jobSchedulerExecute).toHaveBeenCalled();
      });
    });

    it("loads with asynchronous set to false", function () {
      const jobSchedulerExecute = spyOn(
        JobScheduler.prototype,
        "execute"
      ).and.callThrough();

      return loadAndZoomToModel(
        {
          gltf: boxTexturedGltfUrl,
          asynchronous: false,
        },
        scene
      ).then(function (model) {
        const loader = model.loader;
        expect(loader._asynchronous).toBe(false);

        expect(jobSchedulerExecute).not.toHaveBeenCalled();
      });
    });

    it("initializes feature table", function () {
      return loadAndZoomToModel({ gltf: buildingsMetadata }, scene).then(
        function (model) {
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
        }
      );
    });

    it("sets default properties", function () {
      return loadAndZoomToModel(
        {
          gltf: boxTexturedGlbUrl,
        },
        scene
      ).then(function (model) {
        expect(model.show).toEqual(true);
        expect(model.modelMatrix).toEqual(Matrix4.IDENTITY);
        expect(model.scale).toEqual(1.0);
        expect(model.minimumPixelSize).toEqual(0.0);
        expect(model.maximumScale).toBeUndefined();

        expect(model.id).toBeUndefined();
        expect(model.allowPicking).toEqual(true);

        expect(model.activeAnimations).toBeDefined();
        expect(model.clampAnimations).toEqual(true);

        expect(model.shadows).toEqual(ShadowMode.ENABLED);
        expect(model.debugShowBoundingVolume).toEqual(false);
        expect(model._enableDebugWireframe).toEqual(false);
        expect(model.debugWireframe).toEqual(false);

        expect(model.cull).toEqual(true);
        expect(model.backFaceCulling).toEqual(true);
        expect(model.opaquePass).toEqual(Pass.OPAQUE);
        expect(model.customShader).toBeUndefined();

        expect(model.heightReference).toEqual(HeightReference.NONE);
        expect(model.scene).toBeUndefined();
        expect(model.distanceDisplayCondition).toBeUndefined();

        expect(model.color).toBeUndefined();
        expect(model.colorBlendMode).toEqual(ColorBlendMode.HIGHLIGHT);
        expect(model.colorBlendAmount).toEqual(0.5);
        expect(model.silhouetteColor).toEqual(Color.RED);
        expect(model.silhouetteSize).toEqual(0.0);

        expect(model._enableShowOutline).toEqual(true);
        expect(model.showOutline).toEqual(true);
        expect(model.outlineColor).toEqual(Color.BLACK);

        expect(model.clippingPlanes).toBeUndefined();
        expect(model.lightColor).toBeUndefined();
        expect(model.imageBasedLighting).toBeDefined();

        expect(model.credit).toBeUndefined();
        expect(model.showCreditsOnScreen).toEqual(false);
        expect(model.splitDirection).toEqual(SplitDirection.NONE);
        expect(model._projectTo2D).toEqual(false);
      });
    });

    it("renders model without indices", function () {
      const resource = Resource.createIfNeeded(triangleWithoutIndicesUrl);
      return resource.fetchJson().then(function (gltf) {
        return loadAndZoomToModel(
          {
            gltf: gltf,
            basePath: triangleWithoutIndicesUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(0.0, 0.0, 100.0)
            ),
          },
          scene
        ).then(function (model) {
          // Orient the camera so it doesn't back-face cull the triangle.
          const center = model.boundingSphere.center;
          const range = 4.0 * model.boundingSphere.radius;
          scene.camera.lookAt(
            center,
            new HeadingPitchRange(-CesiumMath.PI_OVER_TWO, 0, range)
          );

          // The triangle's diagonal edge is slightly out of frame.
          scene.camera.moveDown(0.1);

          verifyRender(model, true, {
            zoomToModel: false,
          });
        });
      });
    });

    it("renders model with vertex colors", function () {
      const resource = Resource.createIfNeeded(vertexColorTestUrl);
      return resource.fetchJson().then(function (gltf) {
        return loadAndZoomToModel(
          {
            gltf: gltf,
            basePath: vertexColorTestUrl,
          },
          scene
        ).then(function (model) {
          const renderOptions = {
            scene: scene,
            time: defaultDate,
          };
          // Move the camera to the blue plane.
          scene.camera.moveLeft(0.5);

          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toEqual(0);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toEqual(255);
            expect(rgba[3]).toEqual(255);
          });

          // Move the camera to the red plane.
          scene.camera.moveRight(1.0);
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toEqual(255);
            expect(rgba[1]).toEqual(0);
            expect(rgba[2]).toEqual(0);
            expect(rgba[3]).toEqual(255);
          });
        });
      });
    });

    it("renders model with double-sided material", function () {
      const resource = Resource.createIfNeeded(twoSidedPlaneUrl);
      return resource.fetchJson().then(function (gltf) {
        return loadAndZoomToModel(
          {
            gltf: gltf,
            basePath: twoSidedPlaneUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(0.0, 0.0, 100.0)
            ),
          },
          scene
        ).then(function (model) {
          const renderOptions = {
            scene: scene,
            time: defaultDate,
          };

          const center = model.boundingSphere.center;
          const range = 4.0 * model.boundingSphere.radius;
          scene.camera.lookAt(
            center,
            new HeadingPitchRange(0, -CesiumMath.PI_OVER_TWO, range)
          );

          // The top of the double-sided plane should render brightly, since
          // its normal is pointing towards the light
          let result;
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba).not.toEqual([0, 0, 0, 255]);
            result = rgba;
          });

          scene.camera.lookAt(
            center,
            new HeadingPitchRange(0, CesiumMath.PI_OVER_TWO, range)
          );

          // The bottom of the plane should render darker than the top, since
          // its normal is pointing away from the light.
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba).not.toEqual([0, 0, 0, 255]);

            expect(rgba[0]).toBeLessThan(result[0]);
            expect(rgba[1]).toBeLessThan(result[1]);
            expect(rgba[2]).toBeLessThan(result[2]);
            expect(rgba[3]).toEqual(result[3]);
          });
        });
      });
    });

    // This test does not yet work since models without normals are
    // rendered as unlit
    xit("renders model with emissive texture", function () {
      const resource = Resource.createIfNeeded(emissiveTextureUrl);
      return resource.fetchJson().then(function (gltf) {
        return loadAndZoomToModel(
          {
            gltf: gltf,
            basePath: emissiveTextureUrl,
          },
          scene
        ).then(function (model) {
          const renderOptions = {
            scene: scene,
            time: defaultDate,
          };

          expect(renderOptions).toRenderAndCall(function (rgba) {
            // Emissive texture is red
            expect(rgba[0]).toBeGreaterThan(20);
            expect(rgba[1]).toBeLessThan(20);
            expect(rgba[2]).toBeLessThan(20);
            expect(rgba[3]).toEqual(255);
          });
        });
      });
    });

    it("renders model with the KHR_materials_pbrSpecularGlossiness extension", function () {
      const resource = Resource.createIfNeeded(boomBoxUrl);
      return resource.fetchJson().then(function (gltf) {
        return loadAndZoomToModel(
          {
            gltf: gltf,
            basePath: boomBoxUrl,
          },
          scene
        ).then(function (model) {
          verifyRender(model, true);
        });
      });
    });

    it("renders model with morph targets", function () {
      const resource = Resource.createIfNeeded(morphPrimitivesTestUrl);
      return resource.fetchJson().then(function (gltf) {
        return loadAndZoomToModel(
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
            zoomToModel: false,
          };

          // Move the camera down slightly so the morphed part is in view.
          scene.camera.moveDown(0.25);

          // The model is a plane made three-dimensional by morph targets.
          // If morph targets aren't supported, the model won't appear in the camera.
          verifyRender(model, true, renderOptions);
        });
      });
    });

    it("renders Draco-compressed model", function () {
      return loadAndZoomToModel({ gltf: dracoCesiumManUrl }, scene).then(
        function (model) {
          verifyRender(model, true);
        }
      );
    });

    it("fails to load with Draco decoding error", function () {
      const readyPromise = pollToPromise(function () {
        return DracoLoader._taskProcessorReady;
      });
      DracoLoader._getDecoderTaskProcessor();
      return readyPromise
        .then(function () {
          const decoder = DracoLoader._getDecoderTaskProcessor();
          spyOn(decoder, "scheduleTask").and.callFake(function () {
            return Promise.reject({ message: "Custom error" });
          });

          const model = scene.primitives.add(
            Model.fromGltf({
              url: dracoCesiumManUrl,
            })
          );

          return Promise.all([
            pollToPromise(
              function () {
                scene.renderForSpecs();
                return model.loader._state === 7; // FAILED
              },
              { timeout: 10000 }
            ),
            model.readyPromise,
          ]);
        })
        .then(function (e) {
          fail("Should not resolve");
        })
        .catch(function (e) {
          expect(e).toBeDefined();
          expect(
            e.message.includes(`Failed to load model: ${dracoCesiumManUrl}`)
          ).toBe(true);
          expect(e.message.includes(`Failed to load Draco`)).toBe(true);
          expect(e.message.includes(`Custom error`)).toBe(true);
        });
    });

    it("renders model without animations added", function () {
      return loadAndZoomToModel(
        {
          gltf: animatedTriangleUrl,
          offset: animatedTriangleOffset,
        },
        scene
      ).then(function (model) {
        const animationCollection = model.activeAnimations;
        expect(animationCollection).toBeDefined();
        expect(animationCollection.length).toBe(0);

        // Move camera so that the triangle is in view.
        scene.camera.moveDown(0.5);
        verifyRender(model, true, {
          zoomToModel: false,
        });
      });
    });

    it("renders model with animations added", function () {
      return loadAndZoomToModel(
        {
          gltf: animatedTriangleUrl,
          offset: animatedTriangleOffset,
        },
        scene
      ).then(function (model) {
        // Move camera so that the triangle is in view.
        scene.camera.moveDown(0.5);

        // The model rotates such that it leaves the view of the camera
        // halfway into its animation.
        const startTime = defaultDate;
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

    it("renders model with CESIUM_RTC extension", function () {
      return loadAndZoomToModel(
        {
          gltf: boxCesiumRtcUrl,
        },
        scene
      ).then(function (model) {
        verifyRender(model, true);
      });
    });

    it("adds animation to draco-compressed model", function () {
      return loadAndZoomToModel({ gltf: dracoCesiumManUrl }, scene).then(
        function (model) {
          verifyRender(model, true);

          const animationCollection = model.activeAnimations;
          const animation = animationCollection.add({
            index: 0,
          });
          expect(animation).toBeDefined();
          expect(animationCollection.length).toBe(1);
        }
      );
    });

    it("show works", function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModel(
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

    it("renders in 2D", function () {
      return loadAndZoomToModel(
        {
          gltf: boxTexturedGlbUrl,
          modelMatrix: modelMatrix,
        },
        scene2D
      ).then(function (model) {
        expect(model.ready).toEqual(true);
        verifyRender(model, true, {
          zoomToModel: false,
          scene: scene2D,
        });
      });
    });

    it("renders in 2D over the IDL", function () {
      return loadAndZoomToModel(
        {
          gltf: boxTexturedGlbUrl,
          modelMatrix: Transforms.eastNorthUpToFixedFrame(
            Cartesian3.fromDegrees(180.0, 0.0)
          ),
        },
        scene2D
      ).then(function (model) {
        expect(model.ready).toEqual(true);
        verifyRender(model, true, {
          zoomToModel: false,
          scene: scene2D,
        });

        model.modelMatrix = Transforms.eastNorthUpToFixedFrame(
          Cartesian3.fromDegrees(-180.0, 0.0)
        );
        verifyRender(model, true, {
          zoomToModel: false,
          scene: scene2D,
        });
      });
    });

    it("renders in CV", function () {
      return loadAndZoomToModel(
        {
          gltf: boxTexturedGlbUrl,
          modelMatrix: modelMatrix,
        },
        sceneCV
      ).then(function (model) {
        expect(model.ready).toEqual(true);
        scene.camera.moveBackward(1.0);
        verifyRender(model, true, {
          zoomToModel: false,
          scene: sceneCV,
        });
      });
    });

    it("projectTo2D works for 2D", function () {
      return loadAndZoomToModel(
        {
          gltf: boxTexturedGlbUrl,
          modelMatrix: modelMatrix,
          projectTo2D: true,
        },
        scene2D
      ).then(function (model) {
        expect(model.ready).toEqual(true);
        verifyRender(model, true, {
          zoomToModel: false,
          scene: scene2D,
        });
      });
    });

    it("projectTo2D works for CV", function () {
      return loadAndZoomToModel(
        {
          gltf: boxTexturedGlbUrl,
          modelMatrix: modelMatrix,
          projectTo2D: true,
        },
        sceneCV
      ).then(function (model) {
        expect(model.ready).toEqual(true);
        sceneCV.camera.moveBackward(1.0);
        verifyRender(model, true, {
          zoomToModel: false,
          scene: sceneCV,
        });
      });
    });

    it("does not render during morph", function () {
      return loadAndZoomToModel(
        {
          gltf: boxTexturedGlbUrl,
          modelMatrix: modelMatrix,
          projectTo2D: true,
        },
        scene
      ).then(function (model) {
        const commandList = scene.frameState.commandList;
        expect(model.ready).toEqual(true);

        scene.renderForSpecs();
        expect(commandList.length).toBeGreaterThan(0);

        scene.morphTo2D(1.0);
        scene.renderForSpecs();
        expect(commandList.length).toBe(0);

        scene.completeMorph();
        scene.morphTo3D(0.0);
        scene.renderForSpecs();
        expect(commandList.length).toBeGreaterThan(0);
      });
    });

    it("renders model with style", function () {
      let model;
      let style;
      return loadAndZoomToModel({ gltf: buildingsMetadata }, scene).then(
        function (result) {
          model = result;
          // Renders without style.
          verifyRender(model, true, {
            zoomToModel: false,
          });

          // Renders with opaque style.
          style = new Cesium3DTileStyle({
            color: {
              conditions: [["${height} > 1", "color('red')"]],
            },
          });

          model.style = style;
          verifyRender(model, true, {
            zoomToModel: false,
          });

          // Renders with translucent style.
          style = new Cesium3DTileStyle({
            color: {
              conditions: [["${height} > 1", "color('red', 0.5)"]],
            },
          });

          model.style = style;
          verifyRender(model, true, {
            zoomToModel: false,
          });

          // Does not render when style disables show.
          style = new Cesium3DTileStyle({
            color: {
              conditions: [["${height} > 1", "color('red', 0.0)"]],
            },
          });

          model.style = style;
          verifyRender(model, false, {
            zoomToModel: false,
          });

          // Render when style is removed.
          model.style = undefined;
          verifyRender(model, true, {
            zoomToModel: false,
          });
        }
      );
    });

    describe("credits", function () {
      const boxWithCreditsUrl =
        "./Data/Models/GltfLoader/BoxWithCopyright/glTF/Box.gltf";

      it("initializes with credit", function () {
        const credit = new Credit("User Credit");
        const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
        return resource.fetchJson().then(function (gltf) {
          return loadAndZoomToModel(
            {
              gltf: gltf,
              basePath: boxTexturedGltfUrl,
              credit: credit,
            },
            scene
          ).then(function (model) {
            scene.renderForSpecs();
            const creditDisplay = scene.frameState.creditDisplay;
            const credits =
              creditDisplay._currentFrameCredits.lightboxCredits.values;
            const length = credits.length;
            expect(length).toEqual(1);
            expect(credits[0].credit.html).toEqual("User Credit");
          });
        });
      });

      it("initializes with credit string", function () {
        const creditString = "User Credit";
        const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
        return resource.fetchJson().then(function (gltf) {
          return loadAndZoomToModel(
            {
              gltf: gltf,
              basePath: boxTexturedGltfUrl,
              credit: creditString,
            },
            scene
          ).then(function (model) {
            scene.renderForSpecs();
            const creditDisplay = scene.frameState.creditDisplay;
            const credits =
              creditDisplay._currentFrameCredits.lightboxCredits.values;
            const length = credits.length;
            expect(length).toEqual(1);
            expect(credits[0].credit.html).toEqual(creditString);
          });
        });
      });

      it("gets copyrights from gltf", function () {
        const resource = Resource.createIfNeeded(boxWithCreditsUrl);
        return resource.fetchJson().then(function (gltf) {
          return loadAndZoomToModel(
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

      it("displays all types of credits", function () {
        const resource = Resource.createIfNeeded(boxWithCreditsUrl);
        return resource.fetchJson().then(function (gltf) {
          return loadAndZoomToModel(
            {
              gltf: gltf,
              basePath: boxWithCreditsUrl,
              credit: "User Credit",
            },
            scene
          ).then(function (model) {
            model._resourceCredits = [new Credit("Resource Credit")];
            const expectedCredits = [
              "User Credit",
              "Resource Credit",
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

      it("initializes with showCreditsOnScreen", function () {
        const resource = Resource.createIfNeeded(boxWithCreditsUrl);
        return resource.fetchJson().then(function (gltf) {
          return loadAndZoomToModel(
            {
              gltf: gltf,
              basePath: boxWithCreditsUrl,
              credit: "User Credit",
              showCreditsOnScreen: true,
            },
            scene
          ).then(function (model) {
            const expectedCredits = [
              "User Credit",
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

      it("changing showCreditsOnScreen works", function () {
        const resource = Resource.createIfNeeded(boxWithCreditsUrl);
        return resource.fetchJson().then(function (gltf) {
          return loadAndZoomToModel(
            {
              gltf: gltf,
              basePath: boxWithCreditsUrl,
              credit: "User Credit",
              showCreditsOnScreen: false,
            },
            scene
          ).then(function (model) {
            const expectedCredits = [
              "User Credit",
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
              expect(lightboxCredits[i].credit.html).toEqual(
                expectedCredits[i]
              );
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
              expect(lightboxCredits[i].credit.html).toEqual(
                expectedCredits[i]
              );
            }
            expect(screenCredits.length).toEqual(0);
          });
        });
      });

      it("showCreditsOnScreen overrides existing credit setting", function () {
        const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
        return resource.fetchJson().then(function (gltf) {
          return loadAndZoomToModel(
            {
              gltf: gltf,
              basePath: boxTexturedGltfUrl,
              credit: new Credit("User Credit", false),
              showCreditsOnScreen: true,
            },
            scene
          ).then(function (model) {
            scene.renderForSpecs();
            const creditDisplay = scene.frameState.creditDisplay;
            const credits =
              creditDisplay._currentFrameCredits.screenCredits.values;
            const length = credits.length;
            expect(length).toEqual(1);
            for (let i = 0; i < length; i++) {
              expect(credits[i].credit.html).toEqual("User Credit");
            }
          });
        });
      });
    });

    describe("debugWireframe", function () {
      const triangleStripUrl =
        "./Data/Models/GltfLoader/TriangleStrip/glTF/TriangleStrip.gltf";
      const triangleFanUrl =
        "./Data/Models/GltfLoader/TriangleFan/glTF/TriangleFan.gltf";

      let sceneWithWebgl2;

      beforeAll(function () {
        sceneWithWebgl2 = createScene({
          contextOptions: {
            requestWebgl2: true,
          },
        });
      });

      afterEach(function () {
        sceneWithWebgl2.primitives.removeAll();
      });

      afterAll(function () {
        sceneWithWebgl2.destroyForSpecs();
      });

      it("debugWireframe works for WebGL1 if enableDebugWireframe is true", function () {
        const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
        const loadPromise = resource.fetchArrayBuffer();
        return loadPromise.then(function (buffer) {
          return loadAndZoomToModel(
            { gltf: new Uint8Array(buffer), enableDebugWireframe: true },
            scene
          ).then(function (model) {
            verifyDebugWireframe(model, PrimitiveType.TRIANGLES);
          });
        });
      });

      it("debugWireframe does nothing in WebGL1 if enableDebugWireframe is false", function () {
        const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
        const loadPromise = resource.fetchArrayBuffer();
        return loadPromise.then(function (buffer) {
          return loadAndZoomToModel(
            { gltf: new Uint8Array(buffer), enableDebugWireframe: false },
            scene
          ).then(function (model) {
            const commandList = scene.frameState.commandList;
            const commandCounts = [];
            let i, command;
            scene.renderForSpecs();
            for (i = 0; i < commandList.length; i++) {
              command = commandList[i];
              expect(command.primitiveType).toBe(PrimitiveType.TRIANGLES);
              commandCounts.push(command.count);
            }

            model.debugWireframe = true;
            expect(model._drawCommandsBuilt).toBe(false);

            scene.renderForSpecs();
            for (i = 0; i < commandList.length; i++) {
              command = commandList[i];
              expect(command.primitiveType).toBe(PrimitiveType.TRIANGLES);
              expect(command.count).toEqual(commandCounts[i]);
            }
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
          return loadAndZoomToModel(
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
        return loadAndZoomToModel(
          { gltf: triangleWithoutIndicesUrl, enableDebugWireframe: true },
          scene
        ).then(function (model) {
          verifyDebugWireframe(model, PrimitiveType.TRIANGLES, {
            hasIndices: false,
          });
        });
      });

      it("debugWireframe works for model with triangle strip", function () {
        return loadAndZoomToModel(
          { gltf: triangleStripUrl, enableDebugWireframe: true },
          scene
        ).then(function (model) {
          verifyDebugWireframe(model, PrimitiveType.TRIANGLE_STRIP);
        });
      });

      it("debugWireframe works for model with triangle fan", function () {
        return loadAndZoomToModel(
          { gltf: triangleFanUrl, enableDebugWireframe: true },
          scene
        ).then(function (model) {
          verifyDebugWireframe(model, PrimitiveType.TRIANGLE_FAN);
        });
      });

      it("debugWireframe ignores points", function () {
        return loadAndZoomToModel(
          { gltf: pointCloudUrl, enableDebugWireframe: true },
          scene
        ).then(function (model) {
          let i;
          scene.renderForSpecs();
          const commandList = scene.frameState.commandList;
          for (i = 0; i < commandList.length; i++) {
            const command = commandList[i];
            expect(command.primitiveType).toBe(PrimitiveType.POINTS);
            expect(command.vertexArray.indexBuffer).toBeUndefined();
          }

          model.debugWireframe = true;
          for (i = 0; i < commandList.length; i++) {
            const command = commandList[i];
            expect(command.primitiveType).toBe(PrimitiveType.POINTS);
            expect(command.vertexArray.indexBuffer).toBeUndefined();
          }
        });
      });
    });

    it("debugShowBoundingVolume works", function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const loadPromise = resource.fetchArrayBuffer();
      return loadPromise.then(function (buffer) {
        return loadAndZoomToModel(
          { gltf: new Uint8Array(buffer), debugShowBoundingVolume: true },
          scene
        ).then(function (model) {
          let i;
          scene.renderForSpecs();
          const commandList = scene.frameState.commandList;
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

    describe("boundingSphere", function () {
      it("boundingSphere throws if model is not ready", function () {
        const model = Model.fromGltf({
          url: boxTexturedGlbUrl,
        });
        expect(function () {
          return model.boundingSphere;
        }).toThrowDeveloperError();
      });

      it("boundingSphere works", function () {
        const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
        const loadPromise = resource.fetchArrayBuffer();
        return loadPromise.then(function (buffer) {
          return loadAndZoomToModel(
            { gltf: new Uint8Array(buffer) },
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

      it("boundingSphere accounts for axis correction", function () {
        const resource = Resource.createIfNeeded(riggedFigureUrl);
        return resource.fetchJson().then(function (gltf) {
          return loadAndZoomToModel({ gltf: gltf }, scene).then(function (
            model
          ) {
            // The bounding sphere should transform from z-forward
            // to x-forward.
            const boundingSphere = model.boundingSphere;
            expect(boundingSphere).toBeDefined();
            expect(boundingSphere.center).toEqualEpsilon(
              new Cartesian3(0.0320296511054039, 0, 0.7249599695205688),
              CesiumMath.EPSILON3
            );
            expect(boundingSphere.radius).toEqualEpsilon(
              0.9484635280120018,
              CesiumMath.EPSILON3
            );
          });
        });
      });

      it("boundingSphere accounts for transform from CESIUM_RTC extension", function () {
        return loadAndZoomToModel(
          {
            gltf: boxCesiumRtcUrl,
          },
          scene
        ).then(function (model) {
          const boundingSphere = model.boundingSphere;
          expect(boundingSphere).toBeDefined();
          expect(boundingSphere.center).toEqual(new Cartesian3(6378137, 0, 0));
        });
      });
    });

    it("boundingSphere updates bounding sphere when invoked", function () {
      return loadAndZoomToModel({ gltf: boxTexturedGlbUrl }, scene).then(
        function (model) {
          const expectedRadius = 0.8660254037844386;
          const translation = new Cartesian3(10, 0, 0);
          const modelMatrix = Matrix4.fromTranslation(translation);
          model.modelMatrix = modelMatrix;
          model.scale = 2.0;

          // boundingSphere should still account for the model matrix
          // even though the scene has not yet updated.
          const boundingSphere = model.boundingSphere;
          expect(boundingSphere.center).toEqual(translation);
          expect(boundingSphere.radius).toEqualEpsilon(
            2.0 * expectedRadius,
            CesiumMath.EPSILON8
          );
        }
      );
    });

    describe("picking and id", function () {
      it("initializes with id", function () {
        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        return loadAndZoomToModel(
          {
            gltf: boxTexturedGlbUrl,
            offset: offset,
            id: boxTexturedGlbUrl,
          },
          scene
        ).then(function (model) {
          expect(model.id).toBe(boxTexturedGlbUrl);

          const pickIds = model._pickIds;
          expect(pickIds.length).toEqual(1);
          expect(pickIds[0].object.id).toEqual(boxTexturedGlbUrl);
        });
      });

      it("changing id works", function () {
        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        return loadAndZoomToModel(
          {
            gltf: boxTexturedGlbUrl,
            offset: offset,
          },
          scene
        ).then(function (model) {
          expect(model.id).toBeUndefined();

          const pickIds = model._pickIds;
          expect(pickIds.length).toEqual(1);
          expect(pickIds[0].object.id).toBeUndefined();

          model.id = boxTexturedGlbUrl;
          scene.renderForSpecs();
          expect(pickIds[0].object.id).toBe(boxTexturedGlbUrl);

          model.id = undefined;
          scene.renderForSpecs();
          expect(pickIds[0].object.id).toBeUndefined();
        });
      });

      it("picks box textured", function () {
        if (FeatureDetection.isInternetExplorer()) {
          // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
          return;
        }

        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        return loadAndZoomToModel(
          {
            gltf: boxTexturedGlbUrl,
            offset: offset,
          },
          scene
        ).then(function (model) {
          expect(scene).toPickAndCall(function (result) {
            expect(result.primitive).toBeInstanceOf(Model);
            expect(result.primitive).toEqual(model);
          });
        });
      });

      it("picks box textured with id", function () {
        if (FeatureDetection.isInternetExplorer()) {
          // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
          return;
        }

        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        return loadAndZoomToModel(
          {
            gltf: boxTexturedGlbUrl,
            offset: offset,
            id: boxTexturedGlbUrl,
          },
          scene
        ).then(function (model) {
          expect(scene).toPickAndCall(function (result) {
            expect(result.primitive).toBeInstanceOf(Model);
            expect(result.primitive).toEqual(model);
            expect(result.id).toEqual(boxTexturedGlbUrl);
          });
        });
      });

      it("picks box textured with a new id", function () {
        if (FeatureDetection.isInternetExplorer()) {
          // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
          return;
        }

        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        return loadAndZoomToModel(
          {
            gltf: boxTexturedGlbUrl,
            offset: offset,
            id: boxTexturedGlbUrl,
          },
          scene
        ).then(function (model) {
          expect(scene).toPickAndCall(function (result) {
            expect(result.primitive).toBeInstanceOf(Model);
            expect(result.primitive).toEqual(model);
            expect(result.id).toEqual(boxTexturedGlbUrl);
          });

          model.id = "new id";
          expect(scene).toPickAndCall(function (result) {
            expect(result.primitive).toBeInstanceOf(Model);
            expect(result.primitive).toEqual(model);
            expect(result.id).toEqual("new id");
          });
        });
      });

      it("doesn't pick when allowPicking is false", function () {
        if (FeatureDetection.isInternetExplorer()) {
          // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
          return;
        }

        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        return loadAndZoomToModel(
          {
            gltf: boxTexturedGlbUrl,
            allowPicking: false,
            offset: offset,
          },
          scene
        ).then(function () {
          expect(scene).toPickAndCall(function (result) {
            expect(result).toBeUndefined();
          });
        });
      });

      it("doesn't pick when model is hidden", function () {
        if (FeatureDetection.isInternetExplorer()) {
          // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
          return;
        }

        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        return loadAndZoomToModel(
          {
            gltf: boxTexturedGlbUrl,
            offset: offset,
          },
          scene
        ).then(function (model) {
          model.show = false;
          expect(scene).toPickAndCall(function (result) {
            expect(result).toBeUndefined();
          });
        });
      });
    });

    describe("features", function () {
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
        return loadAndZoomToModel(
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
        return loadAndZoomToModel(
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
        return loadAndZoomToModel(
          {
            gltf: microcosm,
          },
          scene
        ).then(function (model) {
          expect(model.featureTableId).toEqual(0);
        });
      });

      it("selects feature table for feature ID attributes", function () {
        return loadAndZoomToModel(
          {
            gltf: buildingsMetadata,
          },
          scene
        ).then(function (model) {
          expect(model.featureTableId).toEqual(0);
        });
      });

      it("featureIdLabel setter works", function () {
        return loadAndZoomToModel(
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
        return loadAndZoomToModel(
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
    });

    describe("model matrix", function () {
      it("initializes with model matrix", function () {
        const translation = new Cartesian3(10, 0, 0);
        const transform = Matrix4.fromTranslation(translation);

        return loadAndZoomToModel(
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
          expect(sceneGraph.computedModelMatrix).toEqual(transform);
          expect(model.boundingSphere.center).toEqual(translation);
          verifyRender(model, true);

          expect(sceneGraph.computedModelMatrix).not.toBe(transform);
          expect(model.modelMatrix).not.toBe(transform);
        });
      });

      it("changing model matrix works", function () {
        const translation = new Cartesian3(10, 0, 0);
        const updateModelMatrix = spyOn(
          ModelSceneGraph.prototype,
          "updateModelMatrix"
        ).and.callThrough();
        return loadAndZoomToModel(
          { gltf: boxTexturedGlbUrl, upAxis: Axis.Z, forwardAxis: Axis.X },
          scene
        ).then(function (model) {
          verifyRender(model, true);
          const sceneGraph = model.sceneGraph;

          const transform = Matrix4.fromTranslation(translation);
          Matrix4.multiplyTransformation(
            model.modelMatrix,
            transform,
            model.modelMatrix
          );
          scene.renderForSpecs();

          expect(updateModelMatrix).toHaveBeenCalled();
          expect(sceneGraph.computedModelMatrix).toEqual(transform);

          // Keep the camera in-place to confirm that the model matrix moves the model out of view.
          verifyRender(model, false, {
            zoomToModel: false,
          });
        });
      });

      it("changing model matrix affects bounding sphere", function () {
        const translation = new Cartesian3(10, 0, 0);
        return loadAndZoomToModel(
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
        });
      });

      it("changing model matrix in 2D mode works if projectTo2D is false", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGlbUrl,
            modelMatrix: modelMatrix,
          },
          scene2D
        ).then(function (model) {
          verifyRender(model, true, {
            zoomToModel: false,
            scene: scene2D,
          });

          model.modelMatrix = Matrix4.fromTranslation(
            new Cartesian3(10, 10, 10)
          );
          verifyRender(model, false, {
            zoomToModel: false,
            scene: scene2D,
          });
        });
      });

      it("changing model matrix in 2D mode throws if projectTo2D is true", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGlbUrl,
            modelMatrix: modelMatrix,
            projectTo2D: true,
          },
          scene2D
        ).then(function (model) {
          expect(function () {
            model.modelMatrix = Matrix4.IDENTITY;
            scene2D.renderForSpecs();
          }).toThrowDeveloperError();
        });
      });
    });

    describe("height reference", function () {
      let sceneWithMockGlobe;

      function createMockGlobe() {
        const globe = {
          callback: undefined,
          removedCallback: false,
          ellipsoid: Ellipsoid.WGS84,
          update: function () {},
          render: function () {},
          getHeight: function () {
            return 0.0;
          },
          _surface: {
            tileProvider: {
              ready: true,
            },
            _tileLoadQueueHigh: [],
            _tileLoadQueueMedium: [],
            _tileLoadQueueLow: [],
            _debug: {
              tilesWaitingForChildren: 0,
            },
          },
          imageryLayersUpdatedEvent: new Event(),
          destroy: function () {},
        };

        globe.beginFrame = function () {};

        globe.endFrame = function () {};

        globe.terrainProviderChanged = new Event();
        Object.defineProperties(globe, {
          terrainProvider: {
            set: function (value) {
              this.terrainProviderChanged.raiseEvent(value);
            },
          },
        });

        globe._surface.updateHeight = function (position, callback) {
          globe.callback = callback;
          return function () {
            globe.removedCallback = true;
            globe.callback = undefined;
          };
        };

        return globe;
      }

      beforeAll(function () {
        sceneWithMockGlobe = createScene();
      });

      beforeEach(function () {
        sceneWithMockGlobe.globe = createMockGlobe();
      });

      afterEach(function () {
        sceneWithMockGlobe.primitives.removeAll();
      });

      afterAll(function () {
        sceneWithMockGlobe.destroyForSpecs();
      });

      it("initializes with height reference", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: sceneWithMockGlobe,
          },
          sceneWithMockGlobe
        ).then(function (model) {
          expect(model.heightReference).toEqual(
            HeightReference.CLAMP_TO_GROUND
          );
          expect(model._scene).toBe(sceneWithMockGlobe);
          expect(model._clampedModelMatrix).toBeDefined();
        });
      });

      it("changing height reference works", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            heightReference: HeightReference.NONE,
            scene: sceneWithMockGlobe,
          },
          sceneWithMockGlobe
        ).then(function (model) {
          expect(model.heightReference).toEqual(HeightReference.NONE);
          expect(model._clampedModelMatrix).toBeUndefined();

          model.heightReference = HeightReference.CLAMP_TO_GROUND;
          expect(model._heightDirty).toBe(true);

          sceneWithMockGlobe.renderForSpecs();
          expect(model._heightDirty).toBe(false);
          expect(model.heightReference).toEqual(
            HeightReference.CLAMP_TO_GROUND
          );
          expect(model._clampedModelMatrix).toBeDefined();
        });
      });

      it("creates height update callback when initializing with height reference", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(-72.0, 40.0)
            ),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: sceneWithMockGlobe,
          },
          sceneWithMockGlobe
        ).then(function (model) {
          expect(model.heightReference).toEqual(
            HeightReference.CLAMP_TO_GROUND
          );
          expect(sceneWithMockGlobe.globe.callback).toBeDefined();
        });
      });

      it("creates height update callback after setting height reference", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(-72.0, 40.0)
            ),
            heightReference: HeightReference.NONE,
            scene: sceneWithMockGlobe,
          },
          sceneWithMockGlobe
        ).then(function (model) {
          expect(model.heightReference).toEqual(HeightReference.NONE);
          expect(sceneWithMockGlobe.globe.callback).toBeUndefined();

          model.heightReference = HeightReference.CLAMP_TO_GROUND;
          expect(model.heightReference).toEqual(
            HeightReference.CLAMP_TO_GROUND
          );
          sceneWithMockGlobe.renderForSpecs();
          expect(sceneWithMockGlobe.globe.callback).toBeDefined();
        });
      });

      it("updates height reference callback when the height reference changes", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(-72.0, 40.0)
            ),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: sceneWithMockGlobe,
          },
          sceneWithMockGlobe
        ).then(function (model) {
          expect(sceneWithMockGlobe.globe.callback).toBeDefined();

          model.heightReference = HeightReference.RELATIVE_TO_GROUND;
          sceneWithMockGlobe.renderForSpecs();
          expect(sceneWithMockGlobe.globe.removedCallback).toEqual(true);
          expect(sceneWithMockGlobe.globe.callback).toBeDefined();

          sceneWithMockGlobe.globe.removedCallback = false;
          model.heightReference = HeightReference.NONE;
          sceneWithMockGlobe.renderForSpecs();
          expect(sceneWithMockGlobe.globe.removedCallback).toEqual(true);
          expect(sceneWithMockGlobe.globe.callback).toBeUndefined();
        });
      });

      it("updates height reference callback when the model matrix changes", function () {
        const modelMatrix = Transforms.eastNorthUpToFixedFrame(
          Cartesian3.fromDegrees(-72.0, 40.0)
        );
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Matrix4.clone(modelMatrix),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: sceneWithMockGlobe,
          },
          sceneWithMockGlobe
        ).then(function (model) {
          expect(sceneWithMockGlobe.globe.callback).toBeDefined();

          // Modify the model matrix in place
          const position = Cartesian3.fromDegrees(-73.0, 40.0);
          model.modelMatrix[12] = position.x;
          model.modelMatrix[13] = position.y;
          model.modelMatrix[14] = position.z;

          sceneWithMockGlobe.renderForSpecs();
          expect(sceneWithMockGlobe.globe.removedCallback).toEqual(true);
          expect(sceneWithMockGlobe.globe.callback).toBeDefined();

          // Replace the model matrix entirely
          model.modelMatrix = modelMatrix;

          sceneWithMockGlobe.renderForSpecs();
          expect(sceneWithMockGlobe.globe.removedCallback).toEqual(true);
          expect(sceneWithMockGlobe.globe.callback).toBeDefined();
        });
      });

      it("height reference callback updates the position", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(-72.0, 40.0)
            ),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: sceneWithMockGlobe,
          },
          sceneWithMockGlobe
        ).then(function (model) {
          expect(sceneWithMockGlobe.globe.callback).toBeDefined();

          sceneWithMockGlobe.globe.callback(
            Cartesian3.fromDegrees(-72.0, 40.0, 100.0)
          );
          const matrix = model._clampedModelMatrix;
          const position = new Cartesian3(matrix[12], matrix[13], matrix[14]);
          const ellipsoid = sceneWithMockGlobe.globe.ellipsoid;
          const cartographic = ellipsoid.cartesianToCartographic(position);
          expect(cartographic.height).toEqualEpsilon(
            100.0,
            CesiumMath.EPSILON9
          );
        });
      });

      it("height reference accounts for change in terrain provider", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(-72.0, 40.0)
            ),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: sceneWithMockGlobe,
          },
          sceneWithMockGlobe
        ).then(function (model) {
          expect(model._heightDirty).toBe(false);
          const terrainProvider = new CesiumTerrainProvider({
            url: "made/up/url",
            requestVertexNormals: true,
          });
          sceneWithMockGlobe.terrainProvider = terrainProvider;

          expect(model._heightDirty).toBe(true);
          sceneWithMockGlobe.terrainProvider = undefined;
        });
      });

      it("throws when initializing height reference with no scene", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(-72.0, 40.0)
            ),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: undefined,
          },
          sceneWithMockGlobe
        ).catch(function (error) {
          expect(error.message).toEqual(
            "Height reference is not supported without a scene and globe."
          );
        });
      });

      it("throws when changing height reference with no scene", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(-72.0, 40.0)
            ),
            heightReference: HeightReference.NONE,
          },
          sceneWithMockGlobe
        ).then(function (model) {
          expect(function () {
            model.heightReference = HeightReference.CLAMP_TO_GROUND;
            sceneWithMockGlobe.renderForSpecs();
          }).toThrowDeveloperError();
        });
      });

      it("throws when initializing height reference with no globe", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(-72.0, 40.0)
            ),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: scene,
          },
          scene
        ).catch(function (error) {
          expect(error.message).toEqual(
            "Height reference is not supported without a scene and globe."
          );
        });
      });

      it("throws when changing height reference with no globe", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(-72.0, 40.0)
            ),
            scene: scene,
          },
          scene
        ).then(function (model) {
          expect(function () {
            model.heightReference = HeightReference.CLAMP_TO_GROUND;
            scene.renderForSpecs();
          }).toThrowDeveloperError();
        });
      });

      it("destroys height reference callback", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGlbUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(-72.0, 40.0)
            ),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: sceneWithMockGlobe,
          },
          sceneWithMockGlobe
        ).then(function (model) {
          expect(sceneWithMockGlobe.globe.callback).toBeDefined();

          sceneWithMockGlobe.primitives.remove(model);
          expect(model.isDestroyed()).toBe(true);
          expect(sceneWithMockGlobe.globe.callback).toBeUndefined();
        });
      });
    });

    describe("distance display condition", function () {
      it("initializes with distance display condition", function () {
        const near = 10.0;
        const far = 100.0;
        const condition = new DistanceDisplayCondition(near, far);
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            distanceDisplayCondition: condition,
          },
          scene
        ).then(function (model) {
          verifyRender(model, false);
        });
      });

      it("changing distance display condition works", function () {
        const near = 10.0;
        const far = 100.0;
        const condition = new DistanceDisplayCondition(near, far);
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
          },
          scene
        ).then(function (model) {
          verifyRender(model, true);

          model.distanceDisplayCondition = condition;
          verifyRender(model, false);

          model.distanceDisplayCondition = undefined;
          verifyRender(model, true);
        });
      });

      it("distanceDisplayCondition works with camera movement", function () {
        const near = 10.0;
        const far = 100.0;
        const condition = new DistanceDisplayCondition(near, far);
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
          },
          scene
        ).then(function (model) {
          verifyRender(model, true);

          // Model distance is smaller than near value, should not render
          model.distanceDisplayCondition = condition;
          verifyRender(model, false);

          const frameState = scene.frameState;

          // Model distance is between near and far values, should render
          frameState.camera.lookAt(
            Cartesian3.ZERO,
            new HeadingPitchRange(0.0, 0.0, (far + near) * 0.5)
          );
          verifyRender(model, true, {
            zoomToModel: false,
          });

          // Model distance is greater than far value, should not render
          frameState.camera.lookAt(
            Cartesian3.ZERO,
            new HeadingPitchRange(0.0, 0.0, far + 10.0)
          );
          verifyRender(model, false, {
            zoomToModel: false,
          });
        });
      });

      it("distanceDisplayCondition throws when near >= far", function () {
        const near = 101.0;
        const far = 100.0;
        const condition = new DistanceDisplayCondition(near, far);
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
          },
          scene
        ).then(function (model) {
          expect(function () {
            model.distanceDisplayCondition = condition;
          }).toThrowDeveloperError();
        });
      });
    });

    describe("model color", function () {
      it("initializes with model color", function () {
        return loadAndZoomToModel(
          { gltf: boxTexturedGltfUrl, color: Color.BLACK },
          scene
        ).then(function (model) {
          verifyRender(model, false);
        });
      });

      it("changing model color works", function () {
        return loadAndZoomToModel({ gltf: boxTexturedGltfUrl }, scene).then(
          function (model) {
            verifyRender(model, true);

            model.color = Color.BLACK;
            verifyRender(model, false);

            model.color = Color.RED;
            verifyRender(model, true);

            model.color = undefined;
            verifyRender(model, true);
          }
        );
      });

      it("renders with translucent color", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
          },
          scene
        ).then(function (model) {
          const renderOptions = {
            scene: scene,
            time: defaultDate,
          };

          let result;
          expect(renderOptions).toRenderAndCall(function (rgba) {
            result = rgba;
          });

          model.color = Color.fromAlpha(Color.WHITE, 0.5);
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toBeLessThan(result[0]);
            expect(rgba[1]).toBeLessThan(result[1]);
            expect(rgba[2]).toBeLessThan(result[2]);
            expect(rgba[3]).toBe(255);
          });
        });
      });

      it("doesn't render invisible model", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            color: Color.fromAlpha(Color.BLACK, 0.0),
          },
          scene
        ).then(function (model) {
          verifyRender(model, false);

          // No commands should have been submitted
          const commands = scene.frameState.commandList;
          expect(commands.length).toBe(0);
        });
      });
    });

    // These functions assume that model.color = Color.RED
    function verifyHighlightColor(rgba) {
      expect(rgba[0]).toBeGreaterThan(0);
      expect(rgba[0]).toBeLessThan(255);
      expect(rgba[1]).toEqual(0);
      expect(rgba[2]).toEqual(0);
      expect(rgba[3]).toEqual(255);
    }

    function verifyReplaceColor(rgba) {
      expect(rgba[0]).toEqual(255);
      expect(rgba[1]).toEqual(0);
      expect(rgba[2]).toEqual(0);
      expect(rgba[3]).toEqual(255);
    }

    // Assumes colorBlendAmount = 0.5;
    function verifyMixColor(rgba) {
      expect(rgba[0]).toBeGreaterThan(0);
      expect(rgba[0]).toBeLessThan(255);
      expect(rgba[1]).toBeGreaterThan(0);
      expect(rgba[1]).toBeLessThan(255);
      expect(rgba[2]).toBeGreaterThan(0);
      expect(rgba[2]).toBeLessThan(255);
      expect(rgba[3]).toEqual(255);
    }

    describe("colorBlendMode", function () {
      it("initializes with ColorBlendMode.HIGHLIGHT", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            color: Color.RED,
            colorBlendMode: ColorBlendMode.HIGHLIGHT,
          },
          scene
        ).then(function (model) {
          expect(model.colorBlendMode).toEqual(ColorBlendMode.HIGHLIGHT);

          const renderOptions = {
            scene: scene,
            time: defaultDate,
          };
          expect(renderOptions).toRenderAndCall(function (rgba) {
            verifyHighlightColor(rgba);
          });
        });
      });

      it("initializes with ColorBlendMode.REPLACE", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            color: Color.RED,
            colorBlendMode: ColorBlendMode.REPLACE,
          },
          scene
        ).then(function (model) {
          expect(model.colorBlendMode).toEqual(ColorBlendMode.REPLACE);

          const renderOptions = {
            scene: scene,
            time: defaultDate,
          };
          expect(renderOptions).toRenderAndCall(function (rgba) {
            verifyReplaceColor(rgba);
          });
        });
      });

      it("initializes with ColorBlendMode.MIX", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            color: Color.RED,
            colorBlendMode: ColorBlendMode.MIX,
          },
          scene
        ).then(function (model) {
          expect(model.colorBlendMode).toEqual(ColorBlendMode.MIX);

          const renderOptions = {
            scene: scene,
            time: defaultDate,
          };
          expect(renderOptions).toRenderAndCall(function (rgba) {
            verifyMixColor(rgba);
          });
        });
      });

      it("toggles colorBlendMode", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            color: Color.RED,
            colorBlendMode: ColorBlendMode.REPLACE,
          },
          scene
        ).then(function (model) {
          expect(model.colorBlendMode).toEqual(ColorBlendMode.REPLACE);

          const renderOptions = {
            scene: scene,
            time: defaultDate,
          };
          expect(renderOptions).toRenderAndCall(function (rgba) {
            verifyReplaceColor(rgba);
          });

          model.colorBlendMode = ColorBlendMode.HIGHLIGHT;
          expect(model.colorBlendMode).toEqual(ColorBlendMode.HIGHLIGHT);

          expect(renderOptions).toRenderAndCall(function (rgba) {
            verifyHighlightColor(rgba);
          });

          model.colorBlendMode = ColorBlendMode.MIX;
          expect(model.colorBlendMode).toEqual(ColorBlendMode.MIX);

          expect(renderOptions).toRenderAndCall(function (rgba) {
            verifyMixColor(rgba);
          });
        });
      });
    });

    describe("colorBlendAmount", function () {
      it("initializes with colorBlendAmount", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            color: Color.RED,
            colorBlendMode: ColorBlendMode.MIX,
            colorBlendAmount: 1.0,
          },
          scene
        ).then(function (model) {
          expect(model.colorBlendAmount).toEqual(1.0);

          const renderOptions = {
            scene: scene,
            time: defaultDate,
          };
          // colorBlendAmount = 1.0 is visually equivalent to
          // ColorBlendMode.REPLACE
          expect(renderOptions).toRenderAndCall(function (rgba) {
            verifyReplaceColor(rgba);
          });
        });
      });

      it("changing colorBlendAmount works", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
          },
          scene
        ).then(function (model) {
          const renderOptions = {
            scene: scene,
            time: defaultDate,
          };

          let originalColor;
          expect(renderOptions).toRenderAndCall(function (rgba) {
            originalColor = rgba;
          });

          model.color = Color.RED;
          model.colorBlendMode = ColorBlendMode.MIX;
          model.colorBlendAmount = 1.0;
          expect(model.colorBlendAmount).toEqual(1.0);

          // colorBlendAmount = 1.0 is visually equivalent to
          // ColorBlendMode.REPLACE
          expect(renderOptions).toRenderAndCall(function (rgba) {
            verifyReplaceColor(rgba);
          });

          model.colorBlendAmount = 0.5;
          expect(model.colorBlendAmount).toEqual(0.5);
          expect(renderOptions).toRenderAndCall(function (rgba) {
            verifyMixColor(rgba);
          });

          model.colorBlendAmount = 0.0;
          expect(model.colorBlendAmount).toEqual(0.0);
          // colorBlendAmount = 0.0 is visually equivalent to
          // having no color applied to the model.
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba[0]).toEqual(originalColor[0]);
            expect(rgba[1]).toEqual(originalColor[1]);
            expect(rgba[2]).toEqual(originalColor[2]);
            expect(rgba[3]).toEqual(originalColor[3]);
          });
        });
      });
    });

    describe("silhouette", function () {
      it("initializes with silhouette size", function () {
        return loadAndZoomToModel(
          { gltf: boxTexturedGltfUrl, silhouetteSize: 1.0 },
          scene
        ).then(function (model) {
          const commands = scene.frameState.commandList;
          scene.renderForSpecs();
          expect(commands.length).toBe(2);
          expect(commands[0].renderState.stencilTest.enabled).toBe(true);
          expect(commands[0].pass).toBe(Pass.OPAQUE);
          expect(commands[1].renderState.stencilTest.enabled).toBe(true);
          expect(commands[1].pass).toBe(Pass.OPAQUE);
        });
      });

      it("changing silhouette size works", function () {
        return loadAndZoomToModel({ gltf: boxTexturedGltfUrl }, scene).then(
          function (model) {
            const commands = scene.frameState.commandList;
            scene.renderForSpecs();
            expect(commands.length).toBe(1);
            expect(commands[0].renderState.stencilTest.enabled).toBe(false);
            expect(commands[0].pass).toBe(Pass.OPAQUE);

            model.silhouetteSize = 1.0;
            scene.renderForSpecs();
            expect(commands.length).toBe(2);
            expect(commands[0].renderState.stencilTest.enabled).toBe(true);
            expect(commands[0].pass).toBe(Pass.OPAQUE);
            expect(commands[1].renderState.stencilTest.enabled).toBe(true);
            expect(commands[1].pass).toBe(Pass.OPAQUE);

            model.silhouetteSize = 0.0;
            scene.renderForSpecs();
            expect(commands.length).toBe(1);
            expect(commands[0].renderState.stencilTest.enabled).toBe(false);
            expect(commands[0].pass).toBe(Pass.OPAQUE);
          }
        );
      });

      it("silhouette works with translucent color", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            silhouetteSize: 1.0,
            silhouetteColor: Color.fromAlpha(Color.GREEN, 0.5),
          },
          scene
        ).then(function (model) {
          const commands = scene.frameState.commandList;
          scene.renderForSpecs();
          expect(commands.length).toBe(2);
          expect(commands[0].renderState.stencilTest.enabled).toBe(true);
          expect(commands[0].pass).toBe(Pass.OPAQUE);
          expect(commands[1].renderState.stencilTest.enabled).toBe(true);
          expect(commands[1].pass).toBe(Pass.TRANSLUCENT);
        });
      });

      it("silhouette is disabled by invisible color", function () {
        return loadAndZoomToModel(
          { gltf: boxTexturedGltfUrl, silhouetteSize: 1.0 },
          scene
        ).then(function (model) {
          const commands = scene.frameState.commandList;
          scene.renderForSpecs();
          expect(commands.length).toBe(2);
          expect(commands[0].renderState.stencilTest.enabled).toBe(true);
          expect(commands[0].pass).toBe(Pass.OPAQUE);
          expect(commands[1].renderState.stencilTest.enabled).toBe(true);
          expect(commands[1].pass).toBe(Pass.OPAQUE);

          model.silhouetteColor = Color.fromAlpha(Color.GREEN, 0.0);
          scene.renderForSpecs();
          expect(commands.length).toBe(1);
          expect(commands[0].renderState.stencilTest.enabled).toBe(false);
          expect(commands[0].pass).toBe(Pass.OPAQUE);
        });
      });

      it("silhouette works for invisible model", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            silhouetteSize: 1.0,
            color: Color.fromAlpha(Color.WHITE, 0.0),
          },
          scene
        ).then(function (model) {
          const commands = scene.frameState.commandList;
          scene.renderForSpecs();
          expect(commands.length).toBe(2);
          expect(commands[0].renderState.colorMask).toEqual({
            red: false,
            green: false,
            blue: false,
            alpha: false,
          });
          expect(commands[0].renderState.depthMask).toEqual(false);
          expect(commands[0].renderState.stencilTest.enabled).toBe(true);
          expect(commands[0].pass).toBe(Pass.TRANSLUCENT);
          expect(commands[1].renderState.stencilTest.enabled).toBe(true);
          expect(commands[1].pass).toBe(Pass.TRANSLUCENT);
        });
      });

      it("silhouette works for translucent model", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            silhouetteSize: 1.0,
            color: Color.fromAlpha(Color.WHITE, 0.5),
          },
          scene
        ).then(function (model) {
          const commands = scene.frameState.commandList;
          scene.renderForSpecs();
          expect(commands.length).toBe(2);

          // Even though the silhouette color is opaque, the silhouette
          // needs to be placed in the translucent pass.
          expect(commands[0].renderState.stencilTest.enabled).toBe(true);
          expect(commands[0].pass).toBe(Pass.TRANSLUCENT);
          expect(commands[1].renderState.stencilTest.enabled).toBe(true);
          expect(commands[1].pass).toBe(Pass.TRANSLUCENT);
        });
      });

      it("silhouette works for translucent model and translucent silhouette color", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            silhouetteSize: 1.0,
            color: Color.fromAlpha(Color.WHITE, 0.5),
            silhouetteColor: Color.fromAlpha(Color.RED, 0.5),
          },
          scene
        ).then(function (model) {
          const commands = scene.frameState.commandList;
          scene.renderForSpecs();
          expect(commands.length).toBe(2);

          expect(commands[0].renderState.stencilTest.enabled).toBe(true);
          expect(commands[0].pass).toBe(Pass.TRANSLUCENT);
          expect(commands[1].renderState.stencilTest.enabled).toBe(true);
          expect(commands[1].pass).toBe(Pass.TRANSLUCENT);
        });
      });

      it("silhouette works for multiple models", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            silhouetteSize: 1.0,
          },
          scene
        ).then(function (model) {
          return loadAndZoomToModel(
            {
              gltf: boxTexturedGltfUrl,
              silhouetteSize: 1.0,
            },
            scene
          ).then(function (model2) {
            const commands = scene.frameState.commandList;
            scene.renderForSpecs();
            const length = commands.length;
            expect(length).toBe(4);
            for (let i = 0; i < length; i++) {
              const command = commands[i];
              expect(command.renderState.stencilTest.enabled).toBe(true);
              expect(command.pass).toBe(Pass.OPAQUE);
            }

            const reference1 = commands[0].renderState.stencilTest.reference;
            const reference2 = commands[2].renderState.stencilTest.reference;
            expect(reference2).toEqual(reference1 + 1);
          });
        });
      });

      it("silhouette works with style", function () {
        const style = new Cesium3DTileStyle({
          color: {
            conditions: [["${height} > 1", "color('red', 0.5)"]],
          },
        });
        return loadAndZoomToModel(
          { gltf: buildingsMetadata, silhouetteSize: 1.0 },
          scene
        ).then(function (model) {
          model.style = style;
          scene.renderForSpecs();
          const commandList = scene.frameState.commandList;
          expect(commandList.length).toBe(2);
          expect(commandList[0].renderState.stencilTest.enabled).toBe(true);
          expect(commandList[0].pass).toBe(Pass.TRANSLUCENT);
          expect(commandList[1].renderState.stencilTest.enabled).toBe(true);
          expect(commandList[1].pass).toBe(Pass.TRANSLUCENT);
        });
      });
    });

    describe("light color", function () {
      it("initializes with light color", function () {
        return loadAndZoomToModel(
          { gltf: boxTexturedGltfUrl, lightColor: Cartesian3.ZERO },
          scene
        ).then(function (model) {
          verifyRender(model, false);
        });
      });

      it("changing light color works", function () {
        return loadAndZoomToModel({ gltf: boxTexturedGltfUrl }, scene).then(
          function (model) {
            model.lightColor = Cartesian3.ZERO;
            verifyRender(model, false);

            model.lightColor = new Cartesian3(1.0, 0.0, 0.0);
            verifyRender(model, true);

            model.lightColor = undefined;
            verifyRender(model, true);
          }
        );
      });

      it("light color doesn't affect unlit models", function () {
        return loadAndZoomToModel({ gltf: boxUnlitUrl }, scene).then(function (
          model
        ) {
          verifyRender(model, true);

          model.lightColor = Cartesian3.ZERO;
          verifyRender(model, true);
        });
      });
    });

    describe("imageBasedLighting", function () {
      afterEach(function () {
        scene.highDynamicRange = false;
      });

      it("initializes with imageBasedLighting", function () {
        const ibl = new ImageBasedLighting({
          imageBasedLightingFactor: Cartesian2.ZERO,
          luminanceAtZenith: 0.5,
        });
        return loadAndZoomToModel(
          { gltf: boxTexturedGltfUrl, imageBasedLighting: ibl },
          scene
        ).then(function (model) {
          expect(model.imageBasedLighting).toBe(ibl);
        });
      });

      it("creates default imageBasedLighting", function () {
        return loadAndZoomToModel({ gltf: boxTexturedGltfUrl }, scene).then(
          function (model) {
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
          }
        );
      });

      it("changing imageBasedLighting works", function () {
        const imageBasedLighting = new ImageBasedLighting({
          imageBasedLightingFactor: Cartesian2.ZERO,
        });
        return loadAndZoomToModel({ gltf: boxTexturedGltfUrl }, scene).then(
          function (model) {
            const renderOptions = {
              scene: scene,
              time: defaultDate,
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
          }
        );
      });

      it("changing imageBasedLightingFactor works", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            imageBasedLighting: new ImageBasedLighting({
              imageBasedLightingFactor: Cartesian2.ZERO,
            }),
          },
          scene
        ).then(function (model) {
          const renderOptions = {
            scene: scene,
            time: defaultDate,
          };

          let result;
          verifyRender(model, true);
          expect(renderOptions).toRenderAndCall(function (rgba) {
            result = rgba;
          });

          const ibl = model.imageBasedLighting;
          ibl.imageBasedLightingFactor = new Cartesian2(1, 1);
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba).not.toEqual(result);
          });
        });
      });

      it("changing luminanceAtZenith works", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            imageBasedLighting: new ImageBasedLighting({
              luminanceAtZenith: 0.0,
            }),
          },
          scene
        ).then(function (model) {
          const renderOptions = {
            scene: scene,
            time: defaultDate,
          };

          let result;
          verifyRender(model, true);
          expect(renderOptions).toRenderAndCall(function (rgba) {
            result = rgba;
          });

          const ibl = model.imageBasedLighting;
          ibl.luminanceAtZenith = 0.2;
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba).not.toEqual(result);
          });
        });
      });

      it("changing sphericalHarmonicCoefficients works", function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }
        const L00 = new Cartesian3(
          0.692622075009195,
          0.4543516001819,
          0.36910172299235
        ); // L00, irradiance, pre-scaled base
        const L1_1 = new Cartesian3(
          0.289407068366422,
          0.16789310162658,
          0.106174907004792
        ); // L1-1, irradiance, pre-scaled base
        const L10 = new Cartesian3(
          -0.591502034778913,
          -0.28152432317119,
          0.124647554708491
        ); // L10, irradiance, pre-scaled base
        const L11 = new Cartesian3(
          0.34945458117126,
          0.163273486841657,
          -0.03095643545207
        ); // L11, irradiance, pre-scaled base
        const L2_2 = new Cartesian3(
          0.22171176447426,
          0.11771991868122,
          0.031381053430064
        ); // L2-2, irradiance, pre-scaled base
        const L2_1 = new Cartesian3(
          -0.348955284677868,
          -0.187256994042823,
          -0.026299717727617
        ); // L2-1, irradiance, pre-scaled base
        const L20 = new Cartesian3(
          0.119982671127227,
          0.076784552175028,
          0.055517838847755
        ); // L20, irradiance, pre-scaled base
        const L21 = new Cartesian3(
          -0.545546043202299,
          -0.279787444030397,
          -0.086854000285261
        ); // L21, irradiance, pre-scaled base
        const L22 = new Cartesian3(
          0.160417569726332,
          0.120896423762313,
          0.121102528320197
        ); // L22, irradiance, pre-scaled base
        const coefficients = [L00, L1_1, L10, L11, L2_2, L2_1, L20, L21, L22];
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            imageBasedLighting: new ImageBasedLighting({
              sphericalHarmonicCoefficients: coefficients,
            }),
          },
          scene
        ).then(function (model) {
          scene.highDynamicRange = true;

          const renderOptions = {
            scene: scene,
            time: defaultDate,
          };

          let result;
          verifyRender(model, true);
          expect(renderOptions).toRenderAndCall(function (rgba) {
            result = rgba;
          });

          const ibl = model.imageBasedLighting;
          ibl.sphericalHarmonicCoefficients = undefined;
          expect(renderOptions).toRenderAndCall(function (rgba) {
            expect(rgba).not.toEqual(result);
          });
        });
      });

      it("changing specularEnvironmentMaps works", function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }
        const url = "./Data/EnvironmentMap/kiara_6_afternoon_2k_ibl.ktx2";
        return loadAndZoomToModel(
          {
            gltf: boomBoxUrl,
            imageBasedLighting: new ImageBasedLighting({
              specularEnvironmentMaps: url,
            }),
          },
          scene
        ).then(function (model) {
          const ibl = model.imageBasedLighting;

          return pollToPromise(function () {
            scene.render();
            return (
              defined(ibl.specularEnvironmentMapAtlas) &&
              ibl.specularEnvironmentMapAtlas.ready
            );
          }).then(function () {
            scene.highDynamicRange = true;

            const renderOptions = {
              scene: scene,
              time: defaultDate,
            };

            let result;
            verifyRender(model, true);
            expect(renderOptions).toRenderAndCall(function (rgba) {
              result = rgba;
            });

            ibl.specularEnvironmentMaps = undefined;
            expect(renderOptions).toRenderAndCall(function (rgba) {
              expect(rgba).not.toEqual(result);
            });
          });
        });
      });
    });

    describe("scale", function () {
      it("initializes with scale", function () {
        return loadAndZoomToModel(
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
          ModelSceneGraph.prototype,
          "updateModelMatrix"
        ).and.callThrough();
        return loadAndZoomToModel(
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
          return loadAndZoomToModel(
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
    });

    describe("minimumPixelSize", function () {
      it("initializes with minimumPixelSize", function () {
        const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
        const loadPromise = resource.fetchArrayBuffer();
        return loadPromise.then(function (buffer) {
          return loadAndZoomToModel(
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
          ModelSceneGraph.prototype,
          "updateModelMatrix"
        ).and.callThrough();
        return loadAndZoomToModel(
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
          ModelSceneGraph.prototype,
          "updateModelMatrix"
        ).and.callThrough();
        return loadAndZoomToModel(
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
    });

    describe("maximumScale", function () {
      it("initializes with maximumScale", function () {
        const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
        const loadPromise = resource.fetchArrayBuffer();
        return loadPromise.then(function (buffer) {
          return loadAndZoomToModel(
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
          ModelSceneGraph.prototype,
          "updateModelMatrix"
        ).and.callThrough();
        return loadAndZoomToModel(
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
          return loadAndZoomToModel(
            {
              gltf: new Uint8Array(buffer),
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
          return loadAndZoomToModel(
            {
              gltf: new Uint8Array(buffer),
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
    });

    it("does not issue draw commands when ignoreCommands is true", function () {
      return loadAndZoomToModel(
        {
          gltf: boxTexturedGltfUrl,
        },
        scene
      ).then(function (model) {
        expect(model.ready).toBe(true);
        model._ignoreCommands = true;

        scene.renderForSpecs();
        expect(scene.frameState.commandList.length).toEqual(0);
      });
    });

    describe("cull", function () {
      it("enables culling", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            cull: true,
          },
          scene
        ).then(function (model) {
          expect(model.cull).toEqual(true);

          // Commands should be submitted while viewing the model.
          scene.renderForSpecs();
          expect(scene.frustumCommandsList.length).toBeGreaterThan(0);

          // Commands should not be submitted when model is out of view.
          model.modelMatrix = Matrix4.fromTranslation(
            new Cartesian3(100.0, 0.0, 0.0)
          );
          scene.renderForSpecs();
          expect(scene.frustumCommandsList.length).toEqual(0);
        });
      });

      // This test does not yet work for Model
      xit("disables culling", function () {
        return loadAndZoomToModel(
          {
            gltf: boxTexturedGltfUrl,
            cull: false,
          },
          scene
        ).then(function (model) {
          expect(model.cull).toEqual(false);

          // Commands should be submitted while viewing the model.
          scene.renderForSpecs();
          const length = scene.frustumCommandsList.length;
          expect(length).toBeGreaterThan(0);

          // Commands should still be submitted when model is out of view.
          model.modelMatrix = Matrix4.fromTranslation(
            new Cartesian3(100.0, 0.0, 0.0)
          );
          scene.renderForSpecs();
          expect(scene.frustumCommandsList.length).toEqual(length);
        });
      });
    });

    describe("back-face culling", function () {
      const boxBackFaceCullingUrl =
        "./Data/Models/GltfLoader/BoxBackFaceCulling/glTF/BoxBackFaceCulling.gltf";
      const boxBackFaceCullingOffset = new HeadingPitchRange(
        Math.PI / 2,
        0,
        2.0
      );

      it("enables back-face culling", function () {
        return loadAndZoomToModel(
          {
            gltf: boxBackFaceCullingUrl,
            backFaceCulling: true,
            offset: boxBackFaceCullingOffset,
          },
          scene
        ).then(function (model) {
          verifyRender(model, false, {
            zoomToModel: false,
          });
        });
      });

      it("disables back-face culling", function () {
        return loadAndZoomToModel(
          {
            gltf: boxBackFaceCullingUrl,
            backFaceCulling: false,
            offset: boxBackFaceCullingOffset,
          },
          scene
        ).then(function (model) {
          verifyRender(model, true, {
            zoomToModel: false,
          });
        });
      });

      it("ignores back-face culling when translucent", function () {
        return loadAndZoomToModel(
          {
            gltf: boxBackFaceCullingUrl,
            backFaceCulling: true,
            offset: boxBackFaceCullingOffset,
          },
          scene
        ).then(function (model) {
          verifyRender(model, false, {
            zoomToModel: false,
          });

          model.color = new Color(0, 0, 1.0, 0.5);

          verifyRender(model, true, {
            zoomToModel: false,
          });
        });
      });

      it("toggles back-face culling at runtime", function () {
        return loadAndZoomToModel(
          {
            gltf: boxBackFaceCullingUrl,
            backFaceCulling: false,
            offset: boxBackFaceCullingOffset,
          },
          scene
        ).then(function (model) {
          verifyRender(model, true, {
            zoomToModel: false,
          });

          model.backFaceCulling = true;

          verifyRender(model, false, {
            zoomToModel: false,
          });
        });
      });

      it("ignores back-face culling toggles when translucent", function () {
        return loadAndZoomToModel(
          {
            gltf: boxBackFaceCullingUrl,
            backFaceCulling: false,
            offset: boxBackFaceCullingOffset,
            color: new Color(0, 0, 1.0, 0.5),
          },
          scene
        ).then(function (model) {
          verifyRender(model, true, {
            zoomToModel: false,
          });

          model.backFaceCulling = true;

          verifyRender(model, true, {
            zoomToModel: false,
          });

          model.backFaceCulling = false;

          verifyRender(model, true, {
            zoomToModel: false,
          });
        });
      });
    });

    it("reverses winding order for negatively scaled models", function () {
      return loadAndZoomToModel(
        {
          gltf: boxTexturedGlbUrl,
          modelMatrix: Matrix4.fromUniformScale(-1.0),
        },
        scene
      ).then(function (model) {
        const renderOptions = {
          scene: scene,
          time: defaultDate,
        };

        // The model should look the same whether it has -1.0 scale or 1.0 scale.
        // The initial scale is -1.0. Test switching this at runtime.
        let initialRgba;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          initialRgba = rgba;
        });

        model.modelMatrix = Matrix4.IDENTITY;

        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual(initialRgba);
        });

        model.modelMatrix = Matrix4.fromUniformScale(-1.0);

        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual(initialRgba);
        });
      });
    });

    describe("clipping planes", function () {
      it("throws when given clipping planes attached to another model", function () {
        const plane = new ClippingPlane(Cartesian3.UNIT_X, 0.0);
        const clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
        });
        return loadAndZoomToModel(
          { gltf: boxTexturedGlbUrl, clippingPlanes: clippingPlanes },
          scene
        )
          .then(function (model) {
            return loadAndZoomToModel({ gltf: boxTexturedGlbUrl }, scene);
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
        return loadAndZoomToModel({ gltf: boxTexturedGlbUrl }, scene).then(
          function (model) {
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
            expect(gl.texImage2D.calls.count() - callsBeforeClipping).toEqual(
              2
            );
          }
        );
      });

      it("initializes and updates with clipping planes", function () {
        const plane = new ClippingPlane(Cartesian3.UNIT_X, -2.5);
        const clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
        });
        return loadAndZoomToModel(
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
        return loadAndZoomToModel({ gltf: boxTexturedGlbUrl }, scene).then(
          function (model) {
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
          }
        );
      });

      it("clipping planes apply edge styling", function () {
        const plane = new ClippingPlane(Cartesian3.UNIT_X, 0);
        const clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
          edgeWidth: 25.0, // make large enough to show up on the render
          edgeColor: Color.BLUE,
        });

        return loadAndZoomToModel({ gltf: boxTexturedGlbUrl }, scene).then(
          function (model) {
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
          }
        );
      });

      it("clipping planes union regions", function () {
        const clippingPlanes = new ClippingPlaneCollection({
          planes: [
            new ClippingPlane(Cartesian3.UNIT_Z, 5.0),
            new ClippingPlane(Cartesian3.UNIT_X, -2.0),
          ],
          unionClippingRegions: true,
        });
        return loadAndZoomToModel({ gltf: boxTexturedGlbUrl }, scene).then(
          function (model) {
            scene.renderForSpecs();
            verifyRender(model, true);

            // These planes are defined such that the model is outside their union.
            model.clippingPlanes = clippingPlanes;
            scene.renderForSpecs();
            verifyRender(model, false);

            model.clippingPlanes.unionClippingRegions = false;
            scene.renderForSpecs();
            verifyRender(model, true);
          }
        );
      });

      it("destroys attached ClippingPlaneCollections", function () {
        return loadAndZoomToModel(
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
        return loadAndZoomToModel(
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
    });

    it("renders with classificationType", function () {
      return loadAndZoomToModel(
        {
          url: boxTexturedGltfUrl,
          classificationType: ClassificationType.CESIUM_3D_TILE,
        },
        scene
      ).then(function (model) {
        expect(model.classificationType).toBe(
          ClassificationType.CESIUM_3D_TILE
        );

        // There's nothing to classify, so the model won't render.
        verifyRender(model, false);
      });
    });

    describe("statistics", function () {
      it("gets triangle count", function () {
        return loadAndZoomToModel({ gltf: boxTexturedGltfUrl }, scene).then(
          function (model) {
            const statistics = model.statistics;
            expect(statistics.trianglesLength).toEqual(12);
          }
        );
      });

      it("gets point count", function () {
        return loadAndZoomToModel({ gltf: pointCloudUrl }, scene).then(
          function (model) {
            const statistics = model.statistics;
            expect(statistics.pointsLength).toEqual(2500);
          }
        );
      });

      it("gets memory usage for geometry and textures", function () {
        return loadAndZoomToModel(
          { gltf: boxTexturedGltfUrl, incrementallyLoadTextures: false },
          scene
        ).then(function (model) {
          const expectedGeometryMemory = 840;
          // Texture is 256*256 and then is mipmapped
          const expectedTextureMemory = Math.floor(256 * 256 * 4 * (4 / 3));

          const statistics = model.statistics;
          expect(statistics.geometryByteLength).toEqual(expectedGeometryMemory);
          expect(statistics.texturesByteLength).toEqual(expectedTextureMemory);
        });
      });

      it("gets memory usage for property tables", function () {
        return loadAndZoomToModel({ gltf: buildingsMetadata }, scene).then(
          function (model) {
            const expectedPropertyTableMemory = 110;

            const statistics = model.statistics;
            expect(statistics.propertyTablesByteLength).toEqual(
              expectedPropertyTableMemory
            );
          }
        );
      });
    });

    describe("AGI_articulations", function () {
      it("setArticulationStage throws when model is not ready", function () {
        const model = Model.fromGltf({
          url: boxArticulationsUrl,
        });

        expect(function () {
          model.setArticulationStage("SampleArticulation MoveX", 10.0);
        }).toThrowDeveloperError();
      });

      it("setArticulationStage throws with invalid value", function () {
        return loadAndZoomToModel(
          {
            gltf: boxArticulationsUrl,
          },
          scene
        ).then(function (model) {
          expect(function () {
            model.setArticulationStage("SampleArticulation MoveX", "bad");
          }).toThrowDeveloperError();
        });
      });

      it("applyArticulations throws when model is not ready", function () {
        const model = Model.fromGltf({
          url: boxArticulationsUrl,
        });

        expect(function () {
          model.applyArticulations();
        }).toThrowDeveloperError();
      });

      it("applies articulations", function () {
        return loadAndZoomToModel(
          {
            gltf: boxArticulationsUrl,
          },
          scene
        ).then(function (model) {
          verifyRender(model, true);

          model.setArticulationStage("SampleArticulation MoveX", 10.0);
          model.applyArticulations();
          verifyRender(model, false);

          model.setArticulationStage("SampleArticulation MoveX", 0.0);
          model.applyArticulations();
          verifyRender(model, true);

          model.setArticulationStage("SampleArticulation Size", 0.0);
          model.applyArticulations();
          verifyRender(model, false);

          model.setArticulationStage("SampleArticulation Size", 1.0);
          model.applyArticulations();
          verifyRender(model, true);
        });
      });
    });

    describe("getNode", function () {
      it("getNode throws when model is not ready", function () {
        const model = Model.fromGltf({
          url: boxArticulationsUrl,
        });

        expect(function () {
          model.getNode("Root");
        }).toThrowDeveloperError();
      });

      it("getNode throws when name is undefined", function () {
        return loadAndZoomToModel(
          {
            gltf: boxArticulationsUrl,
          },
          scene
        ).then(function (model) {
          expect(function () {
            model.getNode();
          }).toThrowDeveloperError();
        });
      });

      it("getNode returns undefined for nonexistent node", function () {
        return loadAndZoomToModel(
          {
            gltf: boxArticulationsUrl,
          },
          scene
        ).then(function (model) {
          const node = model.getNode("I don't exist");
          expect(node).toBeUndefined();
        });
      });

      it("getNode returns a node", function () {
        return loadAndZoomToModel(
          {
            gltf: boxArticulationsUrl,
          },
          scene
        ).then(function (model) {
          const node = model.getNode("Root");

          expect(node).toBeDefined();
          expect(node.name).toEqual("Root");
          expect(node.id).toEqual(0);
          expect(node.show).toEqual(true);
          expect(node.matrix).toEqual(boxArticulationsMatrix);
          expect(node.originalMatrix).toEqual(boxArticulationsMatrix);
        });
      });

      it("changing node.show works", function () {
        return loadAndZoomToModel(
          {
            gltf: boxArticulationsUrl,
          },
          scene
        ).then(function (model) {
          verifyRender(model, true);
          const node = model.getNode("Root");
          expect(node.show).toEqual(true);

          node.show = false;
          verifyRender(model, false);
        });
      });

      it("changing node.matrix works", function () {
        return loadAndZoomToModel(
          {
            gltf: boxArticulationsUrl,
          },
          scene
        ).then(function (model) {
          verifyRender(model, true);
          const node = model.getNode("Root");
          expect(node.matrix).toEqual(boxArticulationsMatrix);
          expect(node.originalMatrix).toEqual(boxArticulationsMatrix);

          node.matrix = Matrix4.fromTranslation(new Cartesian3(10, 0, 0));
          // The model's bounding sphere doesn't account for animations,
          // so the camera will not account for the node's new transform.
          verifyRender(model, false);
        });
      });
    });

    it("destroy works", function () {
      spyOn(ShaderProgram.prototype, "destroy").and.callThrough();
      return loadAndZoomToModel({ gltf: boxTexturedGlbUrl }, scene).then(
        function (model) {
          const resources = model._pipelineResources;
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
        }
      );
    });

    it("destroy doesn't destroy resources when they're in use", function () {
      return Promise.all([
        loadAndZoomToModel({ gltf: boxTexturedGlbUrl }, scene),
        loadAndZoomToModel({ gltf: boxTexturedGlbUrl }, scene),
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
