import {
  Cartesian3,
  Cartographic,
  Color,
  ContextLimits,
  CubeMap,
  DynamicAtmosphereLightingType,
  DynamicEnvironmentMapManager,
  Ellipsoid,
  JulianDate,
  Math as CesiumMath,
  TextureMinificationFilter,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";
import Atmosphere from "../../Source/Scene/Atmosphere.js";

describe("Scene/DynamicEnvironmentMapManager", function () {
  it("constructs with default values", function () {
    const manager = new DynamicEnvironmentMapManager();

    expect(manager.enabled).toBeTrue();
    expect(manager.shouldUpdate).toBeTrue();
    expect(manager.maximumSecondsDifference).toBe(3600);
    expect(manager.maximumPositionEpsilon).toBe(1000.0);
    expect(manager.atmosphereScatteringIntensity).toBe(2.0);
    expect(manager.gamma).toBe(1.0);
    expect(manager.brightness).toBe(1.0);
    expect(manager.saturation).toBe(1.0);
    expect(manager.groundColor).toEqual(
      DynamicEnvironmentMapManager.AVERAGE_EARTH_GROUND_COLOR,
    );
    expect(manager.groundAlbedo).toBe(0.31);
  });

  it("constructs with options", function () {
    const manager = new DynamicEnvironmentMapManager({
      enabled: false,
      maximumSecondsDifference: 0,
      maximumPositionEpsilon: 0,
      atmosphereScatteringIntensity: 0,
      gamma: 0,
      brightness: 0,
      saturation: 0,
      groundColor: Color.BLUE,
      groundAlbedo: 0,
    });

    expect(manager.enabled).toBeFalse();
    expect(manager.shouldUpdate).toBeTrue();
    expect(manager.maximumSecondsDifference).toBe(0);
    expect(manager.maximumPositionEpsilon).toBe(0);
    expect(manager.atmosphereScatteringIntensity).toBe(0);
    expect(manager.gamma).toBe(0);
    expect(manager.brightness).toBe(0);
    expect(manager.saturation).toBe(0);
    expect(manager.groundColor).toEqual(Color.BLUE);
    expect(manager.groundAlbedo).toBe(0);
  });

  it("uses default spherical harmonic coefficients", () => {
    const manager = new DynamicEnvironmentMapManager();

    expect(manager.sphericalHarmonicCoefficients.length).toBe(9);
    expect(manager.sphericalHarmonicCoefficients).toEqual(
      DynamicEnvironmentMapManager.DEFAULT_SPHERICAL_HARMONIC_COEFFICIENTS,
    );
  });

  it("uses at a minimum of 0 mipmap levels", () => {
    const manager = new DynamicEnvironmentMapManager({
      mipmapLevels: Number.NEGATIVE_INFINITY,
    });

    expect(manager._mipmapLevels).toBe(0);
  });

  describe(
    "render tests",
    () => {
      const time = JulianDate.fromIso8601("2024-08-30T10:45:00Z");

      let scene, originalMaximumCubeMapSize, manager;

      beforeAll(() => {
        scene = createScene({
          skyBox: false,
        });
        originalMaximumCubeMapSize = ContextLimits.maximumCubeMapSize;
        // To keep tests fast, don't throttle
        ContextLimits._maximumCubeMapSize = Number.POSITIVE_INFINITY;
      });

      afterAll(() => {
        scene.destroyForSpecs();
        ContextLimits._maximumCubeMapSize = originalMaximumCubeMapSize;
      });

      afterEach(() => {
        scene.primitives.removeAll();
        scene.atmosphere = new Atmosphere();
      });

      // A pared-down Primitive. Allows the compute commands to be added to the command list at the right point in the pipeline.
      function EnvironmentMockPrimitive(manager) {
        this.update = function (frameState) {
          manager.update(frameState);
        };
        this.destroy = function () {};
        this.isDestroyed = function () {
          return false;
        };
      }

      it("does not update if position is undefined", async function () {
        const manager = new DynamicEnvironmentMapManager();

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.renderForSpecs();
        scene.renderForSpecs();

        expect(manager.radianceCubeMap).toBeUndefined();

        scene.renderForSpecs();

        expect(manager.sphericalHarmonicCoefficients).toEqual(
          DynamicEnvironmentMapManager.DEFAULT_SPHERICAL_HARMONIC_COEFFICIENTS,
        );
      });

      it("does not update if enabled is false", async function () {
        const manager = new DynamicEnvironmentMapManager();

        const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
        manager.position =
          Ellipsoid.WGS84.cartographicToCartesian(cartographic);
        manager.enabled = false;

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.renderForSpecs();
        scene.renderForSpecs();

        expect(manager.radianceCubeMap).toBeUndefined();

        scene.renderForSpecs();

        expect(manager.sphericalHarmonicCoefficients).toEqual(
          DynamicEnvironmentMapManager.DEFAULT_SPHERICAL_HARMONIC_COEFFICIENTS,
        );
      });

      it("does not update if there are zero mipmap levels", async function () {
        const manager = new DynamicEnvironmentMapManager({
          mipmapLevels: 0,
        });

        const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
        manager.position =
          Ellipsoid.WGS84.cartographicToCartesian(cartographic);

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.renderForSpecs();
        scene.renderForSpecs();

        expect(manager.radianceCubeMap).toBeUndefined();

        scene.renderForSpecs();

        expect(manager.sphericalHarmonicCoefficients).toEqual(
          DynamicEnvironmentMapManager.DEFAULT_SPHERICAL_HARMONIC_COEFFICIENTS,
        );
      });

      it("does not update if requires extensions are not available", async function () {
        spyOn(
          DynamicEnvironmentMapManager,
          "isDynamicUpdateSupported",
        ).and.returnValue(false);

        const manager = new DynamicEnvironmentMapManager();

        const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
        manager.position =
          Ellipsoid.WGS84.cartographicToCartesian(cartographic);

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.renderForSpecs();
        scene.renderForSpecs();

        expect(manager.radianceCubeMap).toBeUndefined();

        scene.renderForSpecs();

        expect(manager.sphericalHarmonicCoefficients).toEqual(
          DynamicEnvironmentMapManager.DEFAULT_SPHERICAL_HARMONIC_COEFFICIENTS,
        );
      });

      function itCreatesEnvironmentMap() {
        it("creates environment cubemap with specular mipmaps", async function () {
          // Skip if required WebGL extensions are not supported
          if (!DynamicEnvironmentMapManager.isDynamicUpdateSupported(scene)) {
            return;
          }

          scene.renderForSpecs();
          scene.renderForSpecs();

          expect(manager.radianceCubeMap).toBeInstanceOf(CubeMap);

          scene.renderForSpecs();

          expect(manager.radianceCubeMap.sampler.minificationFilter).toEqual(
            TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
          );
        });
      }

      // Ratio of strongest directional light to average light
      function computeDirectionality(L0, L1_1, L10, L11) {
        const L0Magnitude = Cartesian3.magnitude(L0);
        const L1_1Magnitude = Cartesian3.magnitude(L1_1);
        const L10Magnitude = Cartesian3.magnitude(L10);
        const L11Magnitude = Cartesian3.magnitude(L11);
        const L1AverageMagnitude =
          (L0Magnitude + L1_1Magnitude + L10Magnitude + L11Magnitude) / 4.0;

        const L1_1Directionality = L1_1Magnitude / L1AverageMagnitude;
        const L10Directionality = L10Magnitude / L1AverageMagnitude;
        const L11Directionality = L11Magnitude / L1AverageMagnitude;

        return Math.max(
          L1_1Directionality,
          L10Directionality,
          L11Directionality,
        );
      }

      function itCreatesSphericalHarmonics() {
        it("computes spherical harmonic coefficients", async function () {
          // Skip if required WebGL extensions are not supported
          if (!DynamicEnvironmentMapManager.isDynamicUpdateSupported(scene)) {
            return;
          }

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          expect(manager.sphericalHarmonicCoefficients).not.toEqual(
            DynamicEnvironmentMapManager.DEFAULT_SPHERICAL_HARMONIC_COEFFICIENTS,
          );

          expect(manager.sphericalHarmonicCoefficients[0]).toEqual(
            jasmine.objectContaining({
              x: jasmine.any(Number),
              y: jasmine.any(Number),
              z: jasmine.any(Number),
            }),
          );

          expect(manager.sphericalHarmonicCoefficients[1]).toEqual(
            jasmine.objectContaining({
              x: jasmine.any(Number),
              y: jasmine.any(Number),
              z: jasmine.any(Number),
            }),
          );

          expect(manager.sphericalHarmonicCoefficients[2]).toEqual(
            jasmine.objectContaining({
              x: jasmine.any(Number),
              y: jasmine.any(Number),
              z: jasmine.any(Number),
            }),
          );

          expect(manager.sphericalHarmonicCoefficients[3]).toEqual(
            jasmine.objectContaining({
              x: jasmine.any(Number),
              y: jasmine.any(Number),
              z: jasmine.any(Number),
            }),
          );

          expect(manager.sphericalHarmonicCoefficients[4]).toEqual(
            jasmine.objectContaining({
              x: jasmine.any(Number),
              y: jasmine.any(Number),
              z: jasmine.any(Number),
            }),
          );

          expect(manager.sphericalHarmonicCoefficients[5]).toEqual(
            jasmine.objectContaining({
              x: jasmine.any(Number),
              y: jasmine.any(Number),
              z: jasmine.any(Number),
            }),
          );

          expect(manager.sphericalHarmonicCoefficients[6]).toEqual(
            jasmine.objectContaining({
              x: jasmine.any(Number),
              y: jasmine.any(Number),
              z: jasmine.any(Number),
            }),
          );

          expect(manager.sphericalHarmonicCoefficients[7]).toEqual(
            jasmine.objectContaining({
              x: jasmine.any(Number),
              y: jasmine.any(Number),
              z: jasmine.any(Number),
            }),
          );

          expect(manager.sphericalHarmonicCoefficients[8]).toEqual(
            jasmine.objectContaining({
              x: jasmine.any(Number),
              y: jasmine.any(Number),
              z: jasmine.any(Number),
            }),
          );
        });
      }

      describe("with only one mipmap level", function () {
        beforeEach(async function () {
          manager = new DynamicEnvironmentMapManager({
            mipmapLevels: 1,
          });

          const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
          manager.position =
            Ellipsoid.WGS84.cartographicToCartesian(cartographic);

          const primitive = new EnvironmentMockPrimitive(manager);
          scene.primitives.add(primitive);
        });

        it("creates environment cubemap", async function () {
          // Skip if required WebGL extensions are not supported
          if (!DynamicEnvironmentMapManager.isDynamicUpdateSupported(scene)) {
            return;
          }

          scene.renderForSpecs();
          scene.renderForSpecs();

          expect(manager.radianceCubeMap).toBeInstanceOf(CubeMap);

          scene.renderForSpecs();

          expect(
            manager.radianceCubeMap.sampler.minificationFilter,
          ).not.toEqual(TextureMinificationFilter.LINEAR_MIPMAP_LINEAR);
        });

        itCreatesSphericalHarmonics();
      });

      describe("with static lighting at surface", function () {
        beforeEach(async function () {
          manager = new DynamicEnvironmentMapManager();

          const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
          manager.position =
            Ellipsoid.WGS84.cartographicToCartesian(cartographic);

          const primitive = new EnvironmentMockPrimitive(manager);
          scene.primitives.add(primitive);
        });

        itCreatesEnvironmentMap();
        itCreatesSphericalHarmonics();

        it("produces radiance values with mainly blue direct light", async function () {
          // Skip if required WebGL extensions are not supported
          if (!DynamicEnvironmentMapManager.isDynamicUpdateSupported(scene)) {
            return;
          }

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          const L0 = manager.sphericalHarmonicCoefficients[0];
          const L1_1 = manager.sphericalHarmonicCoefficients[1];
          const L10 = manager.sphericalHarmonicCoefficients[2];
          const L11 = manager.sphericalHarmonicCoefficients[3];

          expect(L0).toBeGreaterThan(L1_1);
          expect(L0).toBeGreaterThan(L10);
          expect(L0).toBeGreaterThan(L11);

          const blueness = L0.z / (L0.x + L0.y + L0.z);
          expect(blueness).toBeGreaterThan(1.0 / 3.0);

          const directionality = computeDirectionality(L0, L1_1, L10, L11);
          expect(directionality).toBeGreaterThan(1.0);
        });
      });

      describe("with static lighting at altitude", function () {
        beforeEach(async function () {
          manager = new DynamicEnvironmentMapManager();

          const cartographic = Cartographic.fromDegrees(
            -75.165222,
            39.952583,
            20000.0,
          );
          manager.position =
            Ellipsoid.WGS84.cartographicToCartesian(cartographic);

          const primitive = new EnvironmentMockPrimitive(manager);
          scene.primitives.add(primitive);
        });

        itCreatesEnvironmentMap();
        itCreatesSphericalHarmonics();

        it("produces radiance values with mainly blue ambient light", async function () {
          // Skip if required WebGL extensions are not supported
          if (!DynamicEnvironmentMapManager.isDynamicUpdateSupported(scene)) {
            return;
          }

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          const L0 = manager.sphericalHarmonicCoefficients[0];
          const L1_1 = manager.sphericalHarmonicCoefficients[1];
          const L10 = manager.sphericalHarmonicCoefficients[2];
          const L11 = manager.sphericalHarmonicCoefficients[3];

          expect(L0).toBeGreaterThan(L1_1);
          expect(L0).toBeGreaterThan(L10);
          expect(L0).toBeGreaterThan(L11);

          const blueness = L0.z / (L0.x + L0.y + L0.z);
          expect(blueness).toBeGreaterThan(1.0 / 3.0);

          const directionality = computeDirectionality(L0, L1_1, L10, L11);
          expect(directionality).toBeLessThan(1.0);
        });
      });

      describe("with static lighting above the atmopshere ", function () {
        beforeEach(async function () {
          manager = new DynamicEnvironmentMapManager();

          const cartographic = Cartographic.fromDegrees(
            -75.165222,
            39.952583,
            1000000.0,
          );
          manager.position =
            Ellipsoid.WGS84.cartographicToCartesian(cartographic);

          const primitive = new EnvironmentMockPrimitive(manager);
          scene.primitives.add(primitive);
        });

        itCreatesEnvironmentMap();
        itCreatesSphericalHarmonics();

        it("produces radiance values with mainly neutral ambient light", async function () {
          // Skip if required WebGL extensions are not supported
          if (!DynamicEnvironmentMapManager.isDynamicUpdateSupported(scene)) {
            return;
          }

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          const L0 = manager.sphericalHarmonicCoefficients[0];
          const L1_1 = manager.sphericalHarmonicCoefficients[1];
          const L10 = manager.sphericalHarmonicCoefficients[2];
          const L11 = manager.sphericalHarmonicCoefficients[3];

          expect(L0).toBeGreaterThan(L1_1);
          expect(L0).toBeGreaterThan(L10);
          expect(L0).toBeGreaterThan(L11);

          const blueness = L0.z / (L0.x + L0.y + L0.z);
          expect(blueness).toEqualEpsilon(1.0 / 3.0, CesiumMath.EPSILON1);
        });
      });

      describe("with dynamic lighting in philadelphia", function () {
        beforeEach(async function () {
          scene.atmosphere.dynamicLighting =
            DynamicAtmosphereLightingType.SUNLIGHT;

          manager = new DynamicEnvironmentMapManager();

          const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
          manager.position =
            Ellipsoid.WGS84.cartographicToCartesian(cartographic);

          const primitive = new EnvironmentMockPrimitive(manager);
          scene.primitives.add(primitive);
        });

        itCreatesEnvironmentMap();
        itCreatesSphericalHarmonics();

        it("produces radiance values with mainly blue direct light", async function () {
          // Skip if required WebGL extensions are not supported
          if (!DynamicEnvironmentMapManager.isDynamicUpdateSupported(scene)) {
            return;
          }

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          const L0 = manager.sphericalHarmonicCoefficients[0];
          const L1_1 = manager.sphericalHarmonicCoefficients[1];
          const L10 = manager.sphericalHarmonicCoefficients[2];
          const L11 = manager.sphericalHarmonicCoefficients[3];

          expect(L0).toBeGreaterThan(L1_1);
          expect(L0).toBeGreaterThan(L10);
          expect(L0).toBeGreaterThan(L11);

          const blueness = L0.z / (L0.x + L0.y + L0.z);
          expect(blueness).toBeGreaterThan(1.0 / 3.0);

          const directionality = computeDirectionality(L0, L1_1, L10, L11);
          expect(directionality).toBeGreaterThan(1.0);
        });
      });

      describe("with dynamic lighting in sydney", function () {
        beforeEach(async function () {
          scene.atmosphere.dynamicLighting =
            DynamicAtmosphereLightingType.SUNLIGHT;

          manager = new DynamicEnvironmentMapManager();

          const cartographic = Cartographic.fromDegrees(151.2099, -33.865143);
          manager.position =
            Ellipsoid.WGS84.cartographicToCartesian(cartographic);

          const primitive = new EnvironmentMockPrimitive(manager);
          scene.primitives.add(primitive);
        });

        itCreatesEnvironmentMap();
        itCreatesSphericalHarmonics();

        it("produces radiance values with mainly neutral direct light", async function () {
          // Skip if required WebGL extensions are not supported
          if (!DynamicEnvironmentMapManager.isDynamicUpdateSupported(scene)) {
            return;
          }

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          const L0 = manager.sphericalHarmonicCoefficients[0];
          const L1_1 = manager.sphericalHarmonicCoefficients[1];
          const L10 = manager.sphericalHarmonicCoefficients[2];
          const L11 = manager.sphericalHarmonicCoefficients[3];

          expect(L0).toBeGreaterThan(L1_1);
          expect(L0).toBeGreaterThan(L10);
          expect(L0).toBeGreaterThan(L11);

          const blueness = L0.z / (L0.x + L0.y + L0.z);
          expect(blueness).toEqualEpsilon(1.0 / 3.0, CesiumMath.EPSILON1);

          const directionality = computeDirectionality(L0, L1_1, L10, L11);
          expect(directionality).toBeGreaterThan(1.0);
        });
      });

      describe("with brightness property", function () {
        beforeEach(async function () {
          manager = new DynamicEnvironmentMapManager();
          manager.brightness = 2.0;

          const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
          manager.position =
            Ellipsoid.WGS84.cartographicToCartesian(cartographic);

          const primitive = new EnvironmentMockPrimitive(manager);
          scene.primitives.add(primitive);
        });

        itCreatesEnvironmentMap();
        itCreatesSphericalHarmonics();

        it("produces brighter radiance values with higher values", async function () {
          // Skip if required WebGL extensions are not supported
          if (!DynamicEnvironmentMapManager.isDynamicUpdateSupported(scene)) {
            return;
          }

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          const L0 = manager.sphericalHarmonicCoefficients[0];

          manager.brightness = 1.0;
          manager.reset();

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          expect(L0).toBeGreaterThan(manager.sphericalHarmonicCoefficients[0]);
        });
      });

      describe("with atmosphereScatteringIntensity property", function () {
        beforeEach(async function () {
          manager = new DynamicEnvironmentMapManager();
          manager.atmosphereScatteringIntensity = 8.0;

          const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
          manager.position =
            Ellipsoid.WGS84.cartographicToCartesian(cartographic);

          const primitive = new EnvironmentMockPrimitive(manager);
          scene.primitives.add(primitive);
        });

        itCreatesEnvironmentMap();
        itCreatesSphericalHarmonics();

        it("produces brighter radiance values with higher values", async function () {
          // Skip if required WebGL extensions are not supported
          if (!DynamicEnvironmentMapManager.isDynamicUpdateSupported(scene)) {
            return;
          }

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          const L0 = manager.sphericalHarmonicCoefficients[0];

          manager.atmosphereScatteringIntensity = 1.0;
          manager.reset();

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          expect(L0).toBeGreaterThan(manager.sphericalHarmonicCoefficients[0]);
        });
      });

      describe("with gamma property", function () {
        beforeEach(async function () {
          manager = new DynamicEnvironmentMapManager();
          manager.gamma = 2.0;

          const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
          manager.position =
            Ellipsoid.WGS84.cartographicToCartesian(cartographic);

          const primitive = new EnvironmentMockPrimitive(manager);
          scene.primitives.add(primitive);
        });

        itCreatesEnvironmentMap();
        itCreatesSphericalHarmonics();

        it("produces wider range of radiance values with higher values", async function () {
          // Skip if required WebGL extensions are not supported
          if (!DynamicEnvironmentMapManager.isDynamicUpdateSupported(scene)) {
            return;
          }

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          const L0 = manager.sphericalHarmonicCoefficients[0];

          manager.gamma = 1.0;
          manager.reset();

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          expect(L0).toBeLessThan(manager.sphericalHarmonicCoefficients[0]);
        });
      });

      describe("with saturation property", function () {
        beforeEach(async function () {
          manager = new DynamicEnvironmentMapManager();
          manager.saturation = 0.0;

          const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
          manager.position =
            Ellipsoid.WGS84.cartographicToCartesian(cartographic);

          const primitive = new EnvironmentMockPrimitive(manager);
          scene.primitives.add(primitive);
        });

        itCreatesEnvironmentMap();
        itCreatesSphericalHarmonics();

        it("produces less saturated colors with lower values", async function () {
          // Skip if required WebGL extensions are not supported
          if (!DynamicEnvironmentMapManager.isDynamicUpdateSupported(scene)) {
            return;
          }

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          const L0 = manager.sphericalHarmonicCoefficients[0];

          const maxChannel = Math.max(L0.x, L0.y, L0.z);
          expect(L0).toEqualEpsilon(
            new Cartesian3(maxChannel, maxChannel, maxChannel),
            CesiumMath.EPSILON5,
          );
        });
      });

      describe("with groundColor property", function () {
        beforeEach(async function () {
          manager = new DynamicEnvironmentMapManager();
          manager.groundColor = Color.RED;

          const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
          manager.position =
            Ellipsoid.WGS84.cartographicToCartesian(cartographic);

          const primitive = new EnvironmentMockPrimitive(manager);
          scene.primitives.add(primitive);
        });

        itCreatesEnvironmentMap();
        itCreatesSphericalHarmonics();

        it("produces radiance values with the reflected color", async function () {
          // Skip if required WebGL extensions are not supported
          if (!DynamicEnvironmentMapManager.isDynamicUpdateSupported(scene)) {
            return;
          }

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          const L0 = manager.sphericalHarmonicCoefficients[0];

          manager.groundColor = Color.BLUE;
          manager.reset();

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          expect(L0.x).toBeGreaterThan(
            manager.sphericalHarmonicCoefficients[0].x,
          );
          expect(L0.y).toEqualEpsilon(
            manager.sphericalHarmonicCoefficients[0].y,
            CesiumMath.EPSILON2,
          );
          expect(L0.z).toBeLessThan(manager.sphericalHarmonicCoefficients[0].z);
        });
      });

      describe("with groundAlbedo property", function () {
        beforeEach(async function () {
          manager = new DynamicEnvironmentMapManager();
          manager.groundAlbedo = 2.0;

          const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
          manager.position =
            Ellipsoid.WGS84.cartographicToCartesian(cartographic);

          const primitive = new EnvironmentMockPrimitive(manager);
          scene.primitives.add(primitive);
        });

        itCreatesEnvironmentMap();
        itCreatesSphericalHarmonics();

        it("produces radiance values with more light reflected from the ground", async function () {
          // Skip if required WebGL extensions are not supported
          if (!DynamicEnvironmentMapManager.isDynamicUpdateSupported(scene)) {
            return;
          }

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          const L0 = manager.sphericalHarmonicCoefficients[0];
          const L1_1 = manager.sphericalHarmonicCoefficients[1];
          const L10 = manager.sphericalHarmonicCoefficients[2];
          const L11 = manager.sphericalHarmonicCoefficients[3];

          manager.groundAlbedo = 0.0;
          manager.reset();

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          expect(L0).toBeGreaterThan(manager.sphericalHarmonicCoefficients[0]);
          expect(L1_1).toBeLessThan(manager.sphericalHarmonicCoefficients[1]);
          expect(L10).toBeGreaterThan(manager.sphericalHarmonicCoefficients[2]);
          expect(L11).toBeLessThan(manager.sphericalHarmonicCoefficients[3]);
        });
      });

      describe("with scene atmosphere properties", function () {
        beforeEach(async function () {
          manager = new DynamicEnvironmentMapManager();

          const cartographic = Cartographic.fromDegrees(
            -75.165222,
            39.952583,
            20000.0,
          );
          manager.position =
            Ellipsoid.WGS84.cartographicToCartesian(cartographic);

          scene.atmosphere.hueShift = 0.5;

          const primitive = new EnvironmentMockPrimitive(manager);
          scene.primitives.add(primitive);
        });

        itCreatesEnvironmentMap();
        itCreatesSphericalHarmonics();

        it("produces radiance values with hues corresponding to the atmopshere", async function () {
          // Skip if required WebGL extensions are not supported
          if (!DynamicEnvironmentMapManager.isDynamicUpdateSupported(scene)) {
            return;
          }

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          const L0 = manager.sphericalHarmonicCoefficients[0];

          scene.atmosphere.hueShift = 0.0;
          manager.reset();

          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);
          scene.renderForSpecs(time);

          expect(L0.x).toBeGreaterThan(
            manager.sphericalHarmonicCoefficients[0].x,
          );
          expect(L0.y).toEqualEpsilon(
            manager.sphericalHarmonicCoefficients[0].y,
            CesiumMath.EPSILON2,
          );
          expect(L0.z).toBeLessThan(manager.sphericalHarmonicCoefficients[0].z);
        });
      });

      it("destroys", function () {
        const manager = new DynamicEnvironmentMapManager();
        const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
        manager.position =
          Ellipsoid.WGS84.cartographicToCartesian(cartographic);

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.renderForSpecs();
        scene.renderForSpecs();
        scene.renderForSpecs();
        scene.renderForSpecs();

        manager.destroy();

        expect(manager.isDestroyed()).toBe(true);
      });
    },
    "WebGL",
  );
});
