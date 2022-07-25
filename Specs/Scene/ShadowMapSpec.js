import {
  BoundingSphere,
  BoxGeometry,
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  ComponentDatatype,
  EllipsoidTerrainProvider,
  GeometryInstance,
  HeadingPitchRange,
  HeadingPitchRoll,
  HeightmapTerrainData,
  JulianDate,
  Matrix4,
  OrthographicOffCenterFrustum,
  PixelFormat,
  Transforms,
  WebGLConstants,
  Context,
  Framebuffer,
  PixelDatatype,
  Texture,
  Camera,
  DirectionalLight,
  Globe,
  Model,
  ModelExperimental,
  PerInstanceColorAppearance,
  Primitive,
  ShadowMap,
  ShadowMode,
} from "../../../Source/Cesium.js";

import { Math as CesiumMath } from "../../Source/Cesium.js";

import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "Scene/ShadowMap",
  function () {
    let scene;
    let sunShadowMap;
    const backgroundColor = [0, 0, 0, 255];

    const longitude = -1.31968;
    const latitude = 0.4101524;
    const height = 0.0;
    const boxHeight = 4.0;
    const floorHeight = -1.0;

    const boxUrl = "./Data/Models/Shadows/Box.gltf";
    const boxExperimentalUrl =
      "./Data/Models/GltfLoader/BoxInterleaved/glTF/BoxInterleaved.gltf";
    const boxTranslucentUrl =
      "./Data/Models/GltfLoader/BoxInterleavedTranslucent/glTF/BoxInterleavedTranslucent.gltf";
    const boxNoNormalsUrl =
      "./Data/Models/GltfLoader/BoxNoNormals/glTF/BoxNoNormals.gltf";
    const boxCutoutUrl = "./Data/Models/Shadows/BoxCutout.gltf";
    const boxInvertedUrl = "./Data/Models/Shadows/BoxInverted.gltf";

    let box;
    let boxTranslucent;
    let boxCutout;

    let boxExperimental;
    let boxTranslucentExperimental;
    let boxNoNormalsExperimental;

    let room;
    let floor;
    let floorTranslucent;

    let primitiveBox;
    let primitiveBoxRTC;
    let primitiveBoxTranslucent;
    let primitiveFloor;
    let primitiveFloorRTC;

    beforeAll(function () {
      scene = createScene();
      scene.frameState.scene3DOnly = true;
      Color.unpack(backgroundColor, 0, scene.backgroundColor);

      sunShadowMap = scene.shadowMap;

      const boxOrigin = new Cartesian3.fromRadians(
        longitude,
        latitude,
        boxHeight
      );
      const boxTransform = Transforms.headingPitchRollToFixedFrame(
        boxOrigin,
        new HeadingPitchRoll()
      );

      const boxScale = 0.5;
      const boxScaleCartesian = new Cartesian3(boxScale, boxScale, boxScale);
      const boxTransformExperimental = new Matrix4();
      Matrix4.setScale(
        boxTransform,
        boxScaleCartesian,
        boxTransformExperimental
      );

      const floorOrigin = new Cartesian3.fromRadians(
        longitude,
        latitude,
        floorHeight
      );
      const floorTransform = Transforms.headingPitchRollToFixedFrame(
        floorOrigin,
        new HeadingPitchRoll()
      );

      const roomOrigin = new Cartesian3.fromRadians(
        longitude,
        latitude,
        height
      );
      const roomTransform = Transforms.headingPitchRollToFixedFrame(
        roomOrigin,
        new HeadingPitchRoll()
      );

      const modelPromises = [];
      modelPromises.push(
        loadModel({
          url: boxUrl,
          modelMatrix: boxTransform,
          scale: boxScale,
          show: false,
        }).then(function (model) {
          box = model;
        })
      );
      modelPromises.push(
        loadModel({
          url: boxTranslucentUrl,
          modelMatrix: boxTransform,
          scale: boxScale,
          show: false,
        }).then(function (model) {
          boxTranslucent = model;
        })
      );
      modelPromises.push(
        loadModel({
          url: boxCutoutUrl,
          modelMatrix: boxTransform,
          scale: boxScale,
          incrementallyLoadTextures: false,
          show: false,
        }).then(function (model) {
          boxCutout = model;
        })
      );
      modelPromises.push(
        loadModelExperimental({
          gltf: boxExperimentalUrl,
          modelMatrix: boxTransformExperimental,
          show: false,
        }).then(function (model) {
          boxExperimental = model;
        })
      );
      modelPromises.push(
        loadModelExperimental({
          gltf: boxTranslucentUrl,
          modelMatrix: boxTransformExperimental,
          show: false,
        }).then(function (model) {
          boxTranslucentExperimental = model;
        })
      );
      modelPromises.push(
        loadModelExperimental({
          gltf: boxNoNormalsUrl,
          modelMatrix: boxTransformExperimental,
          show: false,
        }).then(function (model) {
          boxNoNormalsExperimental = model;
        })
      );
      modelPromises.push(
        loadModel({
          url: boxUrl,
          modelMatrix: floorTransform,
          scale: 2.0,
          show: false,
        }).then(function (model) {
          floor = model;
        })
      );
      modelPromises.push(
        loadModel({
          url: boxTranslucentUrl,
          modelMatrix: floorTransform,
          scale: 2.0,
          show: false,
        }).then(function (model) {
          floorTranslucent = model;
        })
      );
      modelPromises.push(
        loadModel({
          url: boxInvertedUrl,
          modelMatrix: roomTransform,
          scale: 8.0,
          show: false,
        }).then(function (model) {
          room = model;
        })
      );

      primitiveBox = createPrimitive(boxTransform, 0.5, Color.RED);
      primitiveBoxRTC = createPrimitiveRTC(boxTransform, 0.5, Color.RED);
      primitiveBoxTranslucent = createPrimitive(
        boxTransform,
        0.5,
        Color.RED.withAlpha(0.5)
      );
      primitiveFloor = createPrimitive(floorTransform, 2.0, Color.RED);
      primitiveFloorRTC = createPrimitiveRTC(floorTransform, 2.0, Color.RED);

      return Promise.all(modelPromises);
    });

    function createPrimitive(transform, size, color) {
      return scene.primitives.add(
        new Primitive({
          geometryInstances: new GeometryInstance({
            geometry: BoxGeometry.fromDimensions({
              dimensions: new Cartesian3(size, size, size),
              vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
            }),
            modelMatrix: transform,
            attributes: {
              color: ColorGeometryInstanceAttribute.fromColor(color),
            },
          }),
          appearance: new PerInstanceColorAppearance({
            translucent: false,
            closed: true,
          }),
          asynchronous: false,
          show: false,
          shadows: ShadowMode.ENABLED,
        })
      );
    }

    function createPrimitiveRTC(transform, size, color) {
      const boxGeometry = BoxGeometry.createGeometry(
        BoxGeometry.fromDimensions({
          vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
          dimensions: new Cartesian3(size, size, size),
        })
      );

      const positions = boxGeometry.attributes.position.values;
      const newPositions = new Float32Array(positions.length);
      for (let i = 0; i < positions.length; ++i) {
        newPositions[i] = positions[i];
      }
      boxGeometry.attributes.position.values = newPositions;
      boxGeometry.attributes.position.componentDatatype =
        ComponentDatatype.FLOAT;

      BoundingSphere.transform(
        boxGeometry.boundingSphere,
        transform,
        boxGeometry.boundingSphere
      );

      const boxGeometryInstance = new GeometryInstance({
        geometry: boxGeometry,
        attributes: {
          color: ColorGeometryInstanceAttribute.fromColor(color),
        },
      });

      return scene.primitives.add(
        new Primitive({
          geometryInstances: boxGeometryInstance,
          appearance: new PerInstanceColorAppearance({
            translucent: false,
            closed: true,
          }),
          asynchronous: false,
          rtcCenter: boxGeometry.boundingSphere.center,
          show: false,
          shadows: ShadowMode.ENABLED,
        })
      );
    }

    function loadModel(options) {
      const model = scene.primitives.add(Model.fromGltf(options));
      return pollToPromise(
        function () {
          // Render scene to progressively load the model
          scene.render();
          return model.ready;
        },
        { timeout: 10000 }
      ).then(function () {
        return model;
      });
    }

    function loadModelExperimental(options) {
      const model = scene.primitives.add(ModelExperimental.fromGltf(options));
      return pollToPromise(
        function () {
          // Render scene to progressively load the model
          scene.render();
          return model.ready;
        },
        { timeout: 10000 }
      ).then(function () {
        return model;
      });
    }

    /**
     * Repeatedly calls render until the load queue is empty. Returns a promise that resolves
     * when the load queue is empty.
     */
    function loadGlobe() {
      return pollToPromise(function () {
        scene.render();
        const globe = scene.globe;
        return (
          globe._surface.tileProvider.ready &&
          globe._surface._tileLoadQueueHigh.length === 0 &&
          globe._surface._tileLoadQueueMedium.length === 0 &&
          globe._surface._tileLoadQueueLow.length === 0 &&
          globe._surface._debug.tilesWaitingForChildren === 0
        );
      });
    }

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      const length = scene.primitives.length;
      for (let i = 0; i < length; ++i) {
        scene.primitives.get(i).show = false;
      }

      scene.globe = undefined;
      scene.shadowMap = scene.shadowMap && scene.shadowMap.destroy();
    });

    function createCascadedShadowMap() {
      const center = new Cartesian3.fromRadians(longitude, latitude, height);
      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, CesiumMath.toRadians(-70.0), 5.0)
      );

      // Create light camera pointing straight down
      const lightCamera = new Camera(scene);
      lightCamera.lookAt(center, new Cartesian3(0.0, 0.0, 1.0));

      scene.shadowMap = new ShadowMap({
        context: scene.context,
        lightCamera: lightCamera,
      });
    }

    function createSingleCascadeShadowMap() {
      const center = new Cartesian3.fromRadians(longitude, latitude, height);
      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, CesiumMath.toRadians(-70.0), 5.0)
      );

      // Create light camera pointing straight down
      const lightCamera = new Camera(scene);
      lightCamera.lookAt(center, new Cartesian3(0.0, 0.0, 1.0));

      scene.shadowMap = new ShadowMap({
        context: scene.context,
        lightCamera: lightCamera,
        numberOfCascades: 1,
      });
    }

    function createShadowMapForDirectionalLight() {
      const center = new Cartesian3.fromRadians(longitude, latitude, height);
      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, CesiumMath.toRadians(-70.0), 5.0)
      );

      const frustum = new OrthographicOffCenterFrustum();
      frustum.left = -50.0;
      frustum.right = 50.0;
      frustum.bottom = -50.0;
      frustum.top = 50.0;
      frustum.near = 1.0;
      frustum.far = 1000;

      // Create light camera pointing straight down
      const lightCamera = new Camera(scene);
      lightCamera.frustum = frustum;
      lightCamera.lookAt(center, new Cartesian3(0.0, 0.0, 20.0));

      scene.shadowMap = new ShadowMap({
        context: scene.context,
        lightCamera: lightCamera,
        cascadesEnabled: false,
      });
    }

    function createShadowMapForSpotLight() {
      const center = new Cartesian3.fromRadians(longitude, latitude, height);
      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, CesiumMath.toRadians(-70.0), 5.0)
      );

      const lightCamera = new Camera(scene);
      lightCamera.frustum.fov = CesiumMath.PI_OVER_TWO;
      lightCamera.frustum.aspectRatio = 1.0;
      lightCamera.frustum.near = 1.0;
      lightCamera.frustum.far = 1000.0;
      lightCamera.lookAt(center, new Cartesian3(0.0, 0.0, 20.0));

      scene.shadowMap = new ShadowMap({
        context: scene.context,
        lightCamera: lightCamera,
        cascadesEnabled: false,
      });
    }

    function createShadowMapForPointLight() {
      const center = new Cartesian3.fromRadians(longitude, latitude, height);
      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, CesiumMath.toRadians(-70.0), 5.0)
      );

      const lightCamera = new Camera(scene);
      lightCamera.position = center;

      scene.shadowMap = new ShadowMap({
        context: scene.context,
        lightCamera: lightCamera,
        isPointLight: true,
      });
    }

    function renderAndExpect(rgba, time) {
      expect({
        scene: scene,
        time: time,
        primeShadowMap: true,
      }).toRender(rgba);
    }

    function renderAndReadPixels() {
      let color;

      expect({
        scene: scene,
        primeShadowMap: true,
      }).toRenderAndCall(function (rgba) {
        color = rgba;
      });

      return color;
    }

    function renderAndCall(expectationCallback, time) {
      expect({
        scene: scene,
        time: time,
        primeShadowMap: true,
      }).toRenderAndCall(function (rgba) {
        expectationCallback(rgba);
      });
    }

    function verifyShadows(caster, receiver) {
      caster.shadows = ShadowMode.ENABLED;
      receiver.shadows = ShadowMode.ENABLED;

      // Render without shadows
      scene.shadowMap.enabled = false;
      let unshadowedColor;
      renderAndCall(function (rgba) {
        unshadowedColor = rgba;
        expect(unshadowedColor).not.toEqual(backgroundColor);
      });

      // Render with shadows
      scene.shadowMap.enabled = true;
      let shadowedColor;
      renderAndCall(function (rgba) {
        shadowedColor = rgba;
        expect(rgba).not.toEqual(backgroundColor);
        expect(rgba).not.toEqual(unshadowedColor);
      });

      // Turn shadow casting off/on
      caster.shadows = ShadowMode.DISABLED;
      renderAndExpect(unshadowedColor);
      caster.shadows = ShadowMode.ENABLED;
      renderAndExpect(shadowedColor);

      // Turn shadow receiving off/on
      receiver.shadows = ShadowMode.DISABLED;
      renderAndExpect(unshadowedColor);
      receiver.shadows = ShadowMode.ENABLED;
      renderAndExpect(shadowedColor);

      // Move the camera away from the shadow
      scene.camera.moveRight(0.5);
      renderAndExpect(unshadowedColor);
    }

    it("sets default shadow map properties", function () {
      scene.shadowMap = new ShadowMap({
        context: scene.context,
        lightCamera: new Camera(scene),
      });

      expect(scene.shadowMap.enabled).toBe(true);
      expect(scene.shadowMap.softShadows).toBe(false);
      expect(scene.shadowMap.isPointLight).toBe(false);
      expect(scene.shadowMap._isSpotLight).toBe(false);
      expect(scene.shadowMap._cascadesEnabled).toBe(true);
      expect(scene.shadowMap._numberOfCascades).toBe(4);
      expect(scene.shadowMap._normalOffset).toBe(true);
    });

    it("throws without options.context", function () {
      expect(function () {
        scene.shadowMap = new ShadowMap({
          lightCamera: new Camera(scene),
        });
      }).toThrowDeveloperError();
    });

    it("throws without options.lightCamera", function () {
      expect(function () {
        scene.shadowMap = new ShadowMap({
          context: scene.context,
        });
      }).toThrowDeveloperError();
    });

    it("throws when options.numberOfCascades is not one or four", function () {
      expect(function () {
        scene.shadowMap = new ShadowMap({
          context: scene.context,
          lightCamera: new Camera(scene),
          numberOfCascades: 3,
        });
      }).toThrowDeveloperError();
    });

    it("model casts shadows onto another model", function () {
      box.show = true;
      floor.show = true;
      createCascadedShadowMap();
      verifyShadows(box, floor);
    });

    it("model experimental casts shadows onto another model", function () {
      boxExperimental.show = true;
      floor.show = true;
      createCascadedShadowMap();
      verifyShadows(boxExperimental, floor);
    });

    it("translucent model casts shadows onto another model", function () {
      boxTranslucent.show = true;
      floor.show = true;
      createCascadedShadowMap();
      verifyShadows(boxTranslucent, floor);
    });

    it("translucent model experimental casts shadows onto another model", function () {
      boxTranslucentExperimental.show = true;
      floor.show = true;
      createCascadedShadowMap();
      verifyShadows(boxTranslucentExperimental, floor);
    });

    it("model without normals casts shadows onto another model", function () {
      boxNoNormalsExperimental.show = true;
      floor.show = true;
      createCascadedShadowMap();
      verifyShadows(boxNoNormalsExperimental, floor);
    });

    it("model with cutout texture casts shadows onto another model", function () {
      boxCutout.show = true;
      floor.show = true;
      createCascadedShadowMap();

      // Render without shadows
      scene.shadowMap.enabled = false;

      let unshadowedColor;
      renderAndCall(function (rgba) {
        unshadowedColor = rgba;
        expect(rgba).not.toEqual(backgroundColor);
      });

      // Render with shadows. The area should not be shadowed because the box's texture is transparent in the center.
      scene.shadowMap.enabled = true;
      renderAndExpect(unshadowedColor);

      // Move the camera into the shadowed area
      scene.camera.moveRight(0.2);

      renderAndCall(function (rgba) {
        expect(rgba).not.toEqual(backgroundColor);
        expect(rgba).not.toEqual(unshadowedColor);
      });

      // Move the camera away from the shadow
      scene.camera.moveRight(0.3);
      renderAndExpect(unshadowedColor);
    });

    it("primitive casts shadows onto another primitive", function () {
      primitiveBox.show = true;
      primitiveFloor.show = true;
      createCascadedShadowMap();
      verifyShadows(primitiveBox, primitiveFloor);
    });

    it("RTC primitive casts shadows onto another RTC primitive", function () {
      primitiveBoxRTC.show = true;
      primitiveFloorRTC.show = true;
      createCascadedShadowMap();
      verifyShadows(primitiveBoxRTC, primitiveFloorRTC);
    });

    it("translucent primitive casts shadows onto another primitive", function () {
      primitiveBoxTranslucent.show = true;
      primitiveFloor.show = true;
      createCascadedShadowMap();
      verifyShadows(primitiveBoxTranslucent, primitiveFloor);
    });

    it("model casts shadow onto globe", function () {
      box.show = true;
      scene.globe = new Globe();
      scene.camera.frustum._sseDenominator = 0.005;
      createCascadedShadowMap();

      return loadGlobe().then(function () {
        verifyShadows(box, scene.globe);
      });
    });

    it("globe casts shadow onto globe", function () {
      scene.globe = new Globe();
      scene.camera.frustum._sseDenominator = 0.01;

      const center = new Cartesian3.fromRadians(longitude, latitude, height);
      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, CesiumMath.toRadians(-70.0), 5.0)
      );

      // Create light camera that is angled horizontally
      const lightCamera = new Camera(scene);
      lightCamera.lookAt(center, new Cartesian3(1.0, 0.0, 0.1));

      scene.shadowMap = new ShadowMap({
        context: scene.context,
        lightCamera: lightCamera,
      });

      // Instead of the default flat tile, add a ridge that will cast shadows
      spyOn(
        EllipsoidTerrainProvider.prototype,
        "requestTileGeometry"
      ).and.callFake(function () {
        const width = 16;
        const height = 16;
        const buffer = new Uint8Array(width * height);
        for (let i = 0; i < buffer.length; ++i) {
          const row = i % width;
          if (row > 6 && row < 10) {
            buffer[i] = 1;
          }
        }
        return new HeightmapTerrainData({
          buffer: buffer,
          width: width,
          height: height,
        });
      });

      return loadGlobe().then(function () {
        // Render without shadows
        scene.shadowMap.enabled = false;

        let unshadowedColor;
        renderAndCall(function (rgba) {
          unshadowedColor = rgba;
          expect(rgba).not.toEqual(backgroundColor);
        });

        // Render with globe casting off
        scene.shadowMap.enabled = true;
        scene.globe.shadows = ShadowMode.DISABLED;
        renderAndExpect(unshadowedColor);

        // Render with globe casting on
        scene.globe.shadows = ShadowMode.ENABLED;
        renderAndCall(function (rgba) {
          expect(rgba).not.toEqual(backgroundColor);
          expect(rgba).not.toEqual(unshadowedColor);
        });
      });
    });

    it("changes light direction", function () {
      box.show = true;
      floor.show = true;

      const center = new Cartesian3.fromRadians(longitude, latitude, height);
      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, CesiumMath.toRadians(-70.0), 5.0)
      );

      // Create light camera pointing straight down
      const lightCamera = new Camera(scene);
      lightCamera.lookAt(center, new Cartesian3(0.0, 0.0, 1.0));

      scene.shadowMap = new ShadowMap({
        context: scene.context,
        lightCamera: lightCamera,
      });

      // Render with shadows
      const shadowedColor = renderAndReadPixels();

      // Move the camera away from the shadow
      scene.camera.moveLeft(0.5);
      renderAndCall(function (rgba) {
        expect(rgba).not.toEqual(backgroundColor);
        expect(rgba).not.toEqual(shadowedColor);
      });

      // Change the light direction so the unshadowed area is now shadowed
      lightCamera.lookAt(center, new Cartesian3(0.1, 0.0, 1.0));
      renderAndExpect(shadowedColor);
    });

    it("sun shadow map works", function () {
      box.show = true;
      floor.show = true;

      const startTime = new JulianDate(2457561.211806); // Sun pointing straight above
      const endTime = new JulianDate(2457561.276389); // Sun at an angle

      const center = new Cartesian3.fromRadians(longitude, latitude, height);
      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, CesiumMath.toRadians(-70.0), 5.0)
      );

      // Use the default shadow map which uses the sun as a light source
      scene.shadowMap = sunShadowMap;

      // Render without shadows
      scene.shadowMap.enabled = false;

      let unshadowedColor;
      renderAndCall(function (rgba) {
        unshadowedColor = rgba;
        expect(rgba).not.toEqual(backgroundColor);
      });

      // Render with shadows
      scene.shadowMap.enabled = true;
      renderAndCall(function (rgba) {
        expect(rgba).not.toEqual(backgroundColor);
        expect(rgba).not.toEqual(unshadowedColor);
      }, startTime);

      // Change the time so that the shadows are no longer pointing straight down
      renderAndExpect(unshadowedColor, endTime);

      scene.shadowMap = undefined;
    });

    it("uses scene's light source", function () {
      const originalLight = scene.light;

      box.show = true;
      floor.show = true;

      const lightDirectionAbove = new Cartesian3(
        -0.22562675028973597,
        0.8893549458095356,
        -0.3976686433675793
      ); // Light pointing straight above
      const lightDirectionAngle = new Cartesian3(
        0.14370705890272903,
        0.9062077731227641,
        -0.3976628636840613
      ); // Light at an angle

      const center = new Cartesian3.fromRadians(longitude, latitude, height);
      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, CesiumMath.toRadians(-70.0), 5.0)
      );

      // Use the default shadow map which uses the scene's light source
      scene.light = new DirectionalLight({
        direction: lightDirectionAbove,
      });
      scene.shadowMap = sunShadowMap;

      // Render without shadows
      scene.shadowMap.enabled = false;

      let unshadowedColor;
      renderAndCall(function (rgba) {
        unshadowedColor = rgba;
        expect(rgba).not.toEqual(backgroundColor);
      });

      // Render with shadows
      scene.shadowMap.enabled = true;
      renderAndCall(function (rgba) {
        expect(rgba).not.toEqual(backgroundColor);
        expect(rgba).not.toEqual(unshadowedColor);
      });

      // Change the light so that the shadows are no longer pointing straight down
      scene.light = new DirectionalLight({
        direction: lightDirectionAngle,
      });
      renderAndExpect(unshadowedColor);

      scene.shadowMap = undefined;
      scene.light = originalLight;
    });

    it("single cascade shadow map", function () {
      box.show = true;
      floor.show = true;
      createSingleCascadeShadowMap();
      verifyShadows(box, floor);
    });

    it("directional shadow map", function () {
      box.show = true;
      floor.show = true;
      createShadowMapForDirectionalLight();
      verifyShadows(box, floor);
    });

    it("spot light shadow map", function () {
      box.show = true;
      floor.show = true;
      createShadowMapForSpotLight();
      verifyShadows(box, floor);
    });

    it("point light shadows", function () {
      // Check that shadows are cast from all directions.
      // Place the point light in the middle of an enclosed area and place a box on each side.
      room.show = true;
      createShadowMapForPointLight();

      const longitudeSpacing = 0.0000003419296208325038;
      const latitudeSpacing = 0.000000315782;
      const heightSpacing = 2.0;

      const origins = [
        Cartesian3.fromRadians(longitude, latitude + latitudeSpacing, height),
        Cartesian3.fromRadians(longitude, latitude - latitudeSpacing, height),
        Cartesian3.fromRadians(longitude + longitudeSpacing, latitude, height),
        Cartesian3.fromRadians(longitude - longitudeSpacing, latitude, height),
        Cartesian3.fromRadians(longitude, latitude, height - heightSpacing),
        Cartesian3.fromRadians(longitude, latitude, height + heightSpacing),
      ];

      const offsets = [
        new HeadingPitchRange(0.0, 0.0, 0.1),
        new HeadingPitchRange(CesiumMath.PI, 0.0, 0.1),
        new HeadingPitchRange(CesiumMath.PI_OVER_TWO, 0.0, 0.1),
        new HeadingPitchRange(CesiumMath.THREE_PI_OVER_TWO, 0.0, 0.1),
        new HeadingPitchRange(0, -CesiumMath.PI_OVER_TWO, 0.1),
        new HeadingPitchRange(0, CesiumMath.PI_OVER_TWO, 0.1),
      ];

      for (let i = 0; i < 6; ++i) {
        const box = scene.primitives.add(
          Model.fromGltf({
            url: boxUrl,
            modelMatrix: Transforms.headingPitchRollToFixedFrame(
              origins[i],
              new HeadingPitchRoll()
            ),
            scale: 0.2,
          })
        );
        scene.render(); // Model is pre-loaded, render one frame to make it ready

        scene.camera.lookAt(origins[i], offsets[i]);
        scene.camera.moveForward(0.5);

        // Render without shadows
        scene.shadowMap.enabled = false;
        let unshadowedColor;
        //eslint-disable-next-line no-loop-func
        renderAndCall(function (rgba) {
          unshadowedColor = rgba;
          expect(rgba).not.toEqual(backgroundColor);
        });

        // Render with shadows
        scene.shadowMap.enabled = true;
        //eslint-disable-next-line no-loop-func
        renderAndCall(function (rgba) {
          expect(rgba).not.toEqual(backgroundColor);
          expect(rgba).not.toEqual(unshadowedColor);
        });

        // Check that setting a smaller radius works
        const radius = scene.shadowMap._pointLightRadius;
        scene.shadowMap._pointLightRadius = 3.0;
        renderAndExpect(unshadowedColor);
        scene.shadowMap._pointLightRadius = radius;

        // Move the camera away from the shadow
        scene.camera.moveRight(0.5);
        renderAndExpect(unshadowedColor);

        scene.primitives.remove(box);
      }
    });

    it("changes size", function () {
      box.show = true;
      floor.show = true;
      createCascadedShadowMap();

      // Render with shadows
      const shadowedColor = renderAndReadPixels();

      // Change size
      scene.shadowMap.size = 256;
      renderAndExpect(shadowedColor);

      // Cascaded shadows combine four maps into one texture
      expect(scene.shadowMap._shadowMapTexture.width).toBe(512);
      expect(scene.shadowMap._shadowMapTexture.height).toBe(512);
      expect(scene.shadowMap.size).toBe(256);
    });

    it("enable debugCascadeColors", function () {
      box.show = true;
      floor.show = true;
      createCascadedShadowMap();

      // Render with shadows
      const shadowedColor = renderAndReadPixels();

      // Render cascade colors
      scene.shadowMap.debugCascadeColors = true;
      expect(scene.shadowMap.dirty).toBe(true);
      renderAndCall(function (rgba) {
        expect(rgba).not.toEqual(backgroundColor);
        expect(rgba).not.toEqual(shadowedColor);
      });
    });

    it("enable soft shadows", function () {
      box.show = true;
      floor.show = true;
      createCascadedShadowMap();

      // Render without shadows
      scene.shadowMap.enabled = false;
      const unshadowedColor = renderAndReadPixels();

      // Render with shadows
      scene.shadowMap.enabled = true;
      expect(scene.shadowMap.dirty).toBe(true);
      const shadowedColor = renderAndReadPixels();

      // Render with soft shadows
      scene.shadowMap.softShadows = true;
      scene.shadowMap.size = 256; // Make resolution smaller to more easily verify soft edges
      scene.camera.moveRight(0.25);
      renderAndCall(function (rgba) {
        expect(rgba).not.toEqual(backgroundColor);
        expect(rgba).not.toEqual(unshadowedColor);
        expect(rgba).not.toEqual(shadowedColor);
      });
    });

    it("changes darkness", function () {
      box.show = true;
      floor.show = true;
      createCascadedShadowMap();

      // Render without shadows
      scene.shadowMap.enabled = false;
      const unshadowedColor = renderAndReadPixels();

      // Render with shadows
      scene.shadowMap.enabled = true;
      const shadowedColor = renderAndReadPixels();

      scene.shadowMap.darkness = 0.5;
      renderAndCall(function (rgba) {
        expect(rgba).not.toEqual(backgroundColor);
        expect(rgba).not.toEqual(unshadowedColor);
        expect(rgba).not.toEqual(shadowedColor);
      });
    });

    it("disables shadow fading", function () {
      box.show = true;
      floor.show = true;

      const center = new Cartesian3.fromRadians(longitude, latitude, height);
      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, CesiumMath.toRadians(-70.0), 5.0)
      );

      // Create light camera pointing straight down
      const lightCamera = new Camera(scene);
      lightCamera.lookAt(center, new Cartesian3(0.0, 0.0, 1.0));

      scene.shadowMap = new ShadowMap({
        context: scene.context,
        lightCamera: lightCamera,
      });

      // Render with light looking straight down
      const shadowedColor = renderAndReadPixels();

      // Move the light close to the horizon
      lightCamera.lookAt(center, new Cartesian3(1.0, 0.0, 0.01));

      // Render with faded shadows
      const horizonShadowedColor = renderAndReadPixels();

      // Render with unfaded shadows
      scene.shadowMap.fadingEnabled = false;
      renderAndCall(function (rgba) {
        expect(horizonShadowedColor).not.toEqual(shadowedColor);
        expect(rgba).not.toEqual(horizonShadowedColor);
      });
    });

    function depthFramebufferSupported() {
      const framebuffer = new Framebuffer({
        context: scene.context,
        depthStencilTexture: new Texture({
          context: scene.context,
          width: 1,
          height: 1,
          pixelFormat: PixelFormat.DEPTH_STENCIL,
          pixelDatatype: PixelDatatype.UNSIGNED_INT_24_8,
        }),
      });

      return framebuffer.status === WebGLConstants.FRAMEBUFFER_COMPLETE;
    }

    it("defaults to color texture if depth texture extension is not supported", function () {
      box.show = true;
      floor.show = true;

      createCascadedShadowMap();

      renderAndCall(function (rgba) {
        if (scene.context.depthTexture) {
          if (depthFramebufferSupported()) {
            expect(scene.shadowMap._usesDepthTexture).toBe(true);
            expect(scene.shadowMap._shadowMapTexture.pixelFormat).toEqual(
              PixelFormat.DEPTH_STENCIL
            );
          } else {
            // Depth texture extension is supported, but it fails to create create a depth-only FBO
            expect(scene.shadowMap._usesDepthTexture).toBe(false);
            expect(scene.shadowMap._shadowMapTexture.pixelFormat).toEqual(
              PixelFormat.RGBA
            );
          }
        }
      });

      scene.shadowMap = scene.shadowMap && scene.shadowMap.destroy();

      // Disable extension
      const depthTexture = scene.context._depthTexture;
      scene.context._depthTexture = false;
      createCascadedShadowMap();

      renderAndCall(function (rgba) {
        expect(scene.shadowMap._usesDepthTexture).toBe(false);
        expect(scene.shadowMap._shadowMapTexture.pixelFormat).toEqual(
          PixelFormat.RGBA
        );
      });

      // Re-enable extension
      scene.context._depthTexture = depthTexture;
    });

    it("does not render shadows when the camera is far away from any shadow receivers", function () {
      box.show = true;
      floor.show = true;
      createCascadedShadowMap();

      renderAndCall(function (rgba) {
        expect(scene.shadowMap.outOfView).toBe(false);
      });

      const center = new Cartesian3.fromRadians(longitude, latitude, 200000);
      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, CesiumMath.toRadians(-70.0), 5.0)
      );

      renderAndCall(function (rgba) {
        expect(scene.shadowMap.outOfView).toBe(true);
      });
    });

    it("does not render shadows when the light direction is below the horizon", function () {
      box.show = true;
      floor.show = true;

      const center = new Cartesian3.fromRadians(longitude, latitude, height);
      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, CesiumMath.toRadians(-70.0), 5.0)
      );

      // Create light camera pointing straight down
      const lightCamera = new Camera(scene);
      lightCamera.lookAt(center, new Cartesian3(0.0, 0.0, 1.0));

      scene.shadowMap = new ShadowMap({
        context: scene.context,
        lightCamera: lightCamera,
      });

      renderAndCall(function (rgba) {
        expect(scene.shadowMap.outOfView).toBe(false);
      });

      // Change light direction
      lightCamera.lookAt(center, new Cartesian3(0.0, 0.0, -1.0));
      renderAndCall(function (rgba) {
        expect(scene.shadowMap.outOfView).toBe(true);
      });
    });

    it("enable debugShow for cascaded shadow map", function () {
      createCascadedShadowMap();

      // Shadow overlay command, shadow volume outline, camera outline, four cascade outlines, four cascade planes
      scene.shadowMap.debugShow = true;
      scene.shadowMap.debugFreezeFrame = true;
      renderAndCall(function (rgba) {
        expect(scene.frameState.commandList.length).toBe(13);
      });

      scene.shadowMap.debugShow = false;
      renderAndCall(function (rgba) {
        expect(scene.frameState.commandList.length).toBe(0);
      });
    });

    it("enable debugShow for fixed shadow map", function () {
      createShadowMapForDirectionalLight();

      // Overlay command, shadow volume outline, shadow volume planes
      scene.shadowMap.debugShow = true;
      renderAndCall(function (rgba) {
        expect(scene.frameState.commandList.length).toBe(3);
      });

      scene.shadowMap.debugShow = false;
      renderAndCall(function (rgba) {
        expect(scene.frameState.commandList.length).toBe(0);
      });
    });

    it("enable debugShow for point light shadow map", function () {
      createShadowMapForPointLight();

      // Overlay command and shadow volume outline
      scene.shadowMap.debugShow = true;
      renderAndCall(function (rgba) {
        expect(scene.frameState.commandList.length).toBe(2);
      });

      scene.shadowMap.debugShow = false;
      renderAndCall(function (rgba) {
        expect(scene.frameState.commandList.length).toBe(0);
      });
    });

    it("enable fitNearFar", function () {
      box.show = true;
      floor.show = true;
      createShadowMapForDirectionalLight();
      scene.shadowMap._fitNearFar = true; // True by default

      let shadowNearFit;
      let shadowFarFit;
      renderAndCall(function (rgba) {
        shadowNearFit = scene.shadowMap._sceneCamera.frustum.near;
        shadowFarFit = scene.shadowMap._sceneCamera.frustum.far;
      });

      scene.shadowMap._fitNearFar = false;
      renderAndCall(function (rgba) {
        const shadowNear = scene.shadowMap._sceneCamera.frustum.near;
        const shadowFar = scene.shadowMap._sceneCamera.frustum.far;

        // When fitNearFar is true the shadowed region is smaller
        expect(shadowNear).toBeLessThan(shadowNearFit);
        expect(shadowFar).toBeGreaterThan(shadowFarFit);
      });
    });

    it("set normalOffset", function () {
      createCascadedShadowMap();
      scene.shadowMap.normalOffset = false;

      expect(scene.shadowMap._normalOffset, false);
      expect(scene.shadowMap._terrainBias, false);
      expect(scene.shadowMap._primitiveBias, false);
      expect(scene.shadowMap._pointBias, false);
    });

    it("set maximumDistance", function () {
      box.show = true;
      floor.show = true;
      createCascadedShadowMap();

      // Render without shadows
      scene.shadowMap.enabled = false;
      let unshadowedColor;
      renderAndCall(function (rgba) {
        expect(rgba).not.toEqual(backgroundColor);
        unshadowedColor = rgba;
      });

      // Render with shadows
      scene.shadowMap.enabled = true;
      let shadowedColor;
      renderAndCall(function (rgba) {
        expect(rgba).not.toEqual(backgroundColor);
        expect(rgba).not.toEqual(unshadowedColor);
      });

      // Set a maximum distance where the shadows start to fade out
      scene.shadowMap.maximumDistance = 6.0;
      renderAndCall(function (rgba) {
        expect(rgba).not.toEqual(backgroundColor);
        expect(rgba).not.toEqual(unshadowedColor);
        expect(rgba).not.toEqual(shadowedColor);
      });

      // Set a maximimum distance where the shadows are not visible
      scene.shadowMap.maximumDistance = 3.0;
      renderAndExpect(unshadowedColor);
    });

    it("shadows are disabled during the pick pass", function () {
      const spy = spyOn(Context.prototype, "draw").and.callThrough();

      boxTranslucent.show = true;
      floorTranslucent.show = true;

      createCascadedShadowMap();

      // Render normally and expect every model shader program to be shadow related.
      renderAndCall(function (rgba) {
        const count = spy.calls.count();
        for (let i = 0; i < count; ++i) {
          const drawCommand = spy.calls.argsFor(i)[0];
          if (drawCommand.owner.primitive instanceof Model) {
            expect(
              drawCommand.shaderProgram._fragmentShaderText.indexOf(
                "czm_shadow"
              ) !== -1
            ).toBe(true);
          }
        }
      });

      // Do the pick pass and expect every model shader program to not be shadow related. This also checks
      // that there are no shadow cast commands.
      spy.calls.reset();
      expect(scene).toPickAndCall(function (result) {
        const count = spy.calls.count();
        for (let i = 0; i < count; ++i) {
          const drawCommand = spy.calls.argsFor(i)[0];
          if (drawCommand.owner.primitive instanceof Model) {
            expect(
              drawCommand.shaderProgram._fragmentShaderText.indexOf(
                "czm_shadow"
              ) !== -1
            ).toBe(false);
          }
        }
      });
    });

    it("model updates derived commands when the shadow map is dirty", function () {
      const spy1 = spyOn(
        ShadowMap,
        "createReceiveDerivedCommand"
      ).and.callThrough();
      const spy2 = spyOn(
        ShadowMap,
        "createCastDerivedCommand"
      ).and.callThrough();

      box.show = true;
      floor.show = true;
      createCascadedShadowMap();

      // Render without shadows
      scene.shadowMap.enabled = false;
      let unshadowedColor;
      renderAndCall(function (rgba) {
        unshadowedColor = rgba;
        expect(rgba).not.toEqual(backgroundColor);
      });

      // Render with shadows
      scene.shadowMap.enabled = true;
      let shadowedColor;
      renderAndCall(function (rgba) {
        shadowedColor = rgba;
        expect(rgba).not.toEqual(backgroundColor);
        expect(rgba).not.toEqual(unshadowedColor);
      });

      // Hide floor temporarily and change the shadow map
      floor.show = false;
      scene.shadowMap.debugCascadeColors = true;

      // Render a few frames
      let i;
      for (i = 0; i < 6; ++i) {
        scene.render();
      }

      // Show the floor and render. The receive shadows shader should now be up-to-date.
      floor.show = true;
      renderAndCall(function (rgba) {
        expect(rgba).not.toEqual(backgroundColor);
        expect(rgba).not.toEqual(unshadowedColor);
        expect(rgba).not.toEqual(shadowedColor);
      });

      // Render a few more frames
      for (i = 0; i < 6; ++i) {
        scene.render();
      }

      // When using WebGL, this value is 8. When using the stub, this value is 4.
      expect(spy1.calls.count()).toBeLessThanOrEqual(8);
      expect(spy2.calls.count()).toEqual(4);

      box.show = false;
      floor.show = false;
    });

    it("does not receive shadows if fromLightSource is false", function () {
      box.show = true;
      floorTranslucent.show = true;
      createCascadedShadowMap();
      scene.shadowMap.fromLightSource = false;

      // Render without shadows
      scene.shadowMap.enabled = false;
      let unshadowedColor;
      renderAndCall(function (rgba) {
        unshadowedColor = rgba;
        expect(rgba).not.toEqual(backgroundColor);
      });

      // Render with shadows
      scene.shadowMap.enabled = true;
      renderAndCall(function (rgba) {
        expect(rgba).not.toEqual(backgroundColor);
        expect(rgba).toEqual(unshadowedColor);
      });
    });

    it("tweaking shadow bias parameters works", function () {
      box.show = true;
      floor.show = true;
      createCascadedShadowMap();

      // Render without shadows
      scene.shadowMap.enabled = false;
      let unshadowedColor;
      renderAndCall(function (rgba) {
        unshadowedColor = rgba;
        expect(rgba).not.toEqual(backgroundColor);
      });

      // Render with shadows
      scene.shadowMap.enabled = true;
      let shadowedColor;
      renderAndCall(function (rgba) {
        shadowedColor = rgba;
        expect(rgba).not.toEqual(backgroundColor);
        expect(rgba).not.toEqual(unshadowedColor);
      });

      scene.shadowMap._primitiveBias.polygonOffsetFactor = 1.2;
      scene.shadowMap._primitiveBias.polygonOffsetFactor = 4.1;
      scene.shadowMap._primitiveBias.normalOffsetScale = 2.1;
      scene.shadowMap._primitiveBias.normalShadingSmooth = 0.4;
      scene.shadowMap.debugCreateRenderStates();
      scene.shadowMap.dirty = true;
      renderAndExpect(shadowedColor);

      scene.shadowMap._primitiveBias.normalOffset = false;
      scene.shadowMap._primitiveBias.normalShading = false;
      scene.shadowMap._primitiveBias.polygonOffset = false;
      scene.shadowMap.debugCreateRenderStates();
      scene.shadowMap.dirty = true;
      renderAndExpect(shadowedColor);
    });

    it("destroys", function () {
      box.show = true;
      floor.show = true;
      createCascadedShadowMap();

      expect(scene.shadowMap.isDestroyed()).toEqual(false);
      scene.shadowMap.destroy();
      expect(scene.shadowMap.isDestroyed()).toEqual(true);
      scene.shadowMap = undefined;
    });
  },
  "WebGL"
);
