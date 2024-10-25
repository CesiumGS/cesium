import {
  Cartesian3,
  Cartographic,
  Color,
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

  describe(
    "render tests",
    () => {
      const time = JulianDate.fromIso8601("2024-08-30T10:45:00Z");

      let scene;

      beforeAll(() => {
        scene = createScene({
          skyBox: false,
        });
      });

      afterAll(() => {
        scene.destroyForSpecs();
      });

      afterEach(() => {
        scene.primitives.removeAll();
        scene.atmosphere = new Atmosphere();
      });

      // Allows the compute commands to be added to the command list at the right point in the pipeline
      function EnvironmentMockPrimitive(manager) {
        this.update = function (frameState) {
          manager.update(frameState);
        };
        this.destroy = function () {};
        this.isDestroyed = function () {
          return false;
        };
      }

      it("creates environment map and spherical harmonics at surface in Philadelphia with static lighting", async function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }

        const manager = new DynamicEnvironmentMapManager();

        const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
        manager.position =
          Ellipsoid.WGS84.cartographicToCartesian(cartographic);

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap).toBeInstanceOf(CubeMap);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap.sampler.minificationFilter).toEqual(
          TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
        ); // Has mipmaps for specular maps

        scene.renderForSpecs();
        scene.renderForSpecs();

        expect(manager.sphericalHarmonicCoefficients[0]).toEqualEpsilon(
          new Cartesian3(
            0.11017649620771408,
            0.13869766891002655,
            0.17165547609329224,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.08705271780490875,
            0.11016352474689484,
            0.15077166259288788,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            -0.0014497060328722,
            -0.0013909616973251104,
            -0.00141593546140939,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            0.00010713530355133116,
            0.00016706169117242098,
            0.00006681153899990022,
          ),
          CesiumMath.EPSILON4,
        );

        expect(manager.sphericalHarmonicCoefficients[4].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[5].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[6].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[7].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[8].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].z).toBeLessThan(0.0);
      });

      it("creates environment map and spherical harmonics at altitude in Philadelphia with static lighting", async function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }

        const manager = new DynamicEnvironmentMapManager();

        const cartographic = Cartographic.fromDegrees(
          -75.165222,
          39.952583,
          20000.0,
        );
        manager.position =
          Ellipsoid.WGS84.cartographicToCartesian(cartographic);

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap).toBeInstanceOf(CubeMap);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap.sampler.minificationFilter).toEqual(
          TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
        ); // Has mipmaps for specular maps

        scene.renderForSpecs();
        scene.renderForSpecs();

        expect(manager.sphericalHarmonicCoefficients[0]).toEqualEpsilon(
          new Cartesian3(
            0.028324954211711884,
            0.03880387544631958,
            0.050429586321115494,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            -0.0048759132623672485,
            -0.00047372994595207274,
            0.011921915225684643,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            -0.00038596082595176995,
            -0.0005534383235499263,
            -0.001172146643511951,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            0.0005309119587764144,
            0.00010014028521254659,
            -0.0005452318582683802,
          ),
          CesiumMath.EPSILON4,
        );

        expect(manager.sphericalHarmonicCoefficients[4].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[5].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[6].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[7].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[8].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].z).toBeGreaterThan(0.0);
      });

      it("creates environment map and spherical harmonics above Earth's atmosphere with static lighting", async function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }

        const manager = new DynamicEnvironmentMapManager();

        const cartographic = Cartographic.fromDegrees(
          -75.165222,
          39.952583,
          1000000.0,
        );
        manager.position =
          Ellipsoid.WGS84.cartographicToCartesian(cartographic);

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap).toBeInstanceOf(CubeMap);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap.sampler.minificationFilter).toEqual(
          TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
        ); // Has mipmaps for specular maps

        scene.renderForSpecs();
        scene.renderForSpecs();

        expect(manager.sphericalHarmonicCoefficients[0]).toEqualEpsilon(
          new Cartesian3(
            0.33580833673477173,
            0.3365404009819031,
            0.3376566469669342,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.2528926134109497,
            0.25208908319473267,
            0.25084879994392395,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            0.001018671551719308,
            0.0009837104007601738,
            0.0008832928724586964,
          ),
          CesiumMath.EPSILON4,
        );

        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            -0.0017577273538336158,
            -0.0015308377332985401,
            -0.0012394117657095194,
          ),
          CesiumMath.EPSILON4,
        );

        expect(manager.sphericalHarmonicCoefficients[4].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[5].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[6].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[7].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[8].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].z).toBeLessThan(0.0);
      });

      it("creates environment map and spherical harmonics at surface in Philadelphia with dynamic lighting", async function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }

        const manager = new DynamicEnvironmentMapManager();

        const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
        manager.position =
          Ellipsoid.WGS84.cartographicToCartesian(cartographic);

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.atmosphere.dynamicLighting =
          DynamicAtmosphereLightingType.SUNLIGHT;

        scene.renderForSpecs(time);

        expect(manager.radianceCubeMap).toBeInstanceOf(CubeMap);

        scene.renderForSpecs(time);

        expect(manager.radianceCubeMap.sampler.minificationFilter).toEqual(
          TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
        ); // Has mipmaps for specular maps

        scene.renderForSpecs(time);
        scene.renderForSpecs(time);

        expect(manager.sphericalHarmonicCoefficients[0]).toEqualEpsilon(
          new Cartesian3(
            0.034476835280656815,
            0.04265068098902702,
            0.04163559526205063,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.01569328084588051,
            0.023243442177772522,
            0.025639381259679794,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            -0.003795207943767309,
            -0.0033528741914778948,
            -0.0031588575802743435,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            0.008755888789892197,
            0.007121194154024124,
            0.005899451207369566,
          ),
          CesiumMath.EPSILON4,
        );

        expect(manager.sphericalHarmonicCoefficients[4].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[5].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[6].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[7].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[8].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].z).toBeGreaterThan(0.0);
      });

      it("creates environment map and spherical harmonics at surface in Sydney with dynamic lighting", async function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }

        const manager = new DynamicEnvironmentMapManager();

        const cartographic = Cartographic.fromDegrees(151.2099, -33.865143);
        manager.position =
          Ellipsoid.WGS84.cartographicToCartesian(cartographic);

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.atmosphere.dynamicLighting =
          DynamicAtmosphereLightingType.SUNLIGHT;

        scene.renderForSpecs(time);

        expect(manager.radianceCubeMap).toBeInstanceOf(CubeMap);

        scene.renderForSpecs(time);

        expect(manager.radianceCubeMap.sampler.minificationFilter).toEqual(
          TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
        ); // Has mipmaps for specular maps

        scene.renderForSpecs(time);
        scene.renderForSpecs(time);

        expect(manager.sphericalHarmonicCoefficients[0]).toEqualEpsilon(
          new Cartesian3(
            0.0054358793422579765,
            0.0054358793422579765,
            0.0027179396711289883,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.0037772462237626314,
            0.0037772462237626314,
            0.0018886231118813157,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            -0.000007333524990826845,
            -0.000007333524990826845,
            -0.0000036667624954134226,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            0.000008501945558236912,
            0.000008501945558236912,
            0.000004250972779118456,
          ),
          CesiumMath.EPSILON4,
        );

        expect(manager.sphericalHarmonicCoefficients[4].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[5].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[6].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[7].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[8].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].z).toBeLessThan(0.0);
      });

      it("lighting uses atmosphere properties", async function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }

        const manager = new DynamicEnvironmentMapManager();

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

        scene.renderForSpecs();

        expect(manager.radianceCubeMap).toBeInstanceOf(CubeMap);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap.sampler.minificationFilter).toEqual(
          TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
        ); // Has mipmaps for specular maps

        scene.renderForSpecs();
        scene.renderForSpecs();

        expect(manager.sphericalHarmonicCoefficients[0]).toEqualEpsilon(
          new Cartesian3(
            0.05602460727095604,
            0.04545757919549942,
            0.02313476987183094,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.008652083575725555,
            0.004114487674087286,
            -0.0017214358085766435,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            -0.00099410570692271,
            -0.0008244783966802061,
            -0.00026270488160662353,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            -0.000446554331574589,
            -0.000012375472579151392,
            0.0005265426589176059,
          ),
          CesiumMath.EPSILON4,
        );

        expect(manager.sphericalHarmonicCoefficients[4].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[5].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[6].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[7].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[8].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].z).toBeGreaterThan(0.0);
      });

      it("lighting uses atmosphereScatteringIntensity value", async function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }

        const manager = new DynamicEnvironmentMapManager();
        manager.atmosphereScatteringIntensity = 1.0;

        const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
        manager.position =
          Ellipsoid.WGS84.cartographicToCartesian(cartographic);

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap).toBeInstanceOf(CubeMap);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap.sampler.minificationFilter).toEqual(
          TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
        ); // Has mipmaps for specular maps

        scene.renderForSpecs();
        scene.renderForSpecs();

        expect(manager.sphericalHarmonicCoefficients[0]).toEqualEpsilon(
          new Cartesian3(
            0.0322723351418972,
            0.039464931935071945,
            0.047749463468790054,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.025989927351474762,
            0.031872138381004333,
            0.04223670810461044,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            -0.0008744273218326271,
            -0.0008044499554671347,
            -0.0008345510577782989,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            -0.0000013118115020915866,
            -0.000017321406630799174,
            -0.000006108442903496325,
          ),
          CesiumMath.EPSILON4,
        );

        expect(manager.sphericalHarmonicCoefficients[4].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[5].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[6].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[7].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[8].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].z).toBeLessThan(0.0);
      });

      it("lighting uses gamma value", async function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }

        const manager = new DynamicEnvironmentMapManager();
        manager.gamma = 0.5;

        const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
        manager.position =
          Ellipsoid.WGS84.cartographicToCartesian(cartographic);

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap).toBeInstanceOf(CubeMap);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap.sampler.minificationFilter).toEqual(
          TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
        ); // Has mipmaps for specular maps

        scene.renderForSpecs();
        scene.renderForSpecs();

        expect(manager.sphericalHarmonicCoefficients[0]).toEqualEpsilon(
          new Cartesian3(
            0.18712928891181946,
            0.21367456018924713,
            0.23666927218437195,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.13568174839019775,
            0.15787045657634735,
            0.19085952639579773,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            -0.0011452456237748265,
            -0.0010327763156965375,
            -0.001100384397432208,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            0.00025430042296648026,
            0.00028964842204004526,
            0.00021805899450555444,
          ),
          CesiumMath.EPSILON4,
        );

        expect(manager.sphericalHarmonicCoefficients[4].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[5].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[6].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[7].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[8].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].z).toBeLessThan(0.0);
      });

      it("lighting uses brightness value", async function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }

        const manager = new DynamicEnvironmentMapManager();
        manager.brightness = 0.5;

        const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
        manager.position =
          Ellipsoid.WGS84.cartographicToCartesian(cartographic);

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap).toBeInstanceOf(CubeMap);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap.sampler.minificationFilter).toEqual(
          TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
        ); // Has mipmaps for specular maps

        scene.renderForSpecs();
        scene.renderForSpecs();

        expect(manager.sphericalHarmonicCoefficients[0]).toEqualEpsilon(
          new Cartesian3(
            0.05981340631842613,
            0.07419705390930176,
            0.09077795594930649,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.051604993641376495,
            0.06336799263954163,
            0.08409948647022247,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            -0.000745132565498352,
            -0.0006284310948103666,
            -0.000669674074742943,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            0.00004796023131348193,
            0.000024254957679659128,
            0.00004792874096892774,
          ),
          CesiumMath.EPSILON4,
        );

        expect(manager.sphericalHarmonicCoefficients[4].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[5].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[6].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[7].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[8].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].z).toBeLessThan(0.0);
      });

      it("lighting uses saturation value", async function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }

        const manager = new DynamicEnvironmentMapManager();
        manager.saturation = 0.0;

        const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
        manager.position =
          Ellipsoid.WGS84.cartographicToCartesian(cartographic);

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap).toBeInstanceOf(CubeMap);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap.sampler.minificationFilter).toEqual(
          TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
        ); // Has mipmaps for specular maps

        scene.renderForSpecs();
        scene.renderForSpecs();

        expect(manager.sphericalHarmonicCoefficients[0]).toEqualEpsilon(
          new Cartesian3(
            0.13499368727207184,
            0.13499368727207184,
            0.13499368727207184,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.1081928238272667,
            0.1081928238272667,
            0.1081928238272667,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            -0.0014497060328722,
            -0.0013909616973251104,
            -0.00141593546140939,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            0.00010713530355133116,
            0.00016706169117242098,
            0.00006681153899990022,
          ),
          CesiumMath.EPSILON4,
        );

        expect(manager.sphericalHarmonicCoefficients[4].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[5].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[6].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[7].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[8].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].z).toBeLessThan(0.0);
      });

      it("lighting uses ground color value", async function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }

        const manager = new DynamicEnvironmentMapManager();
        manager.groundColor = Color.RED;

        const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
        manager.position =
          Ellipsoid.WGS84.cartographicToCartesian(cartographic);

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap).toBeInstanceOf(CubeMap);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap.sampler.minificationFilter).toEqual(
          TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
        ); // Has mipmaps for specular maps

        scene.renderForSpecs();
        scene.renderForSpecs();

        expect(manager.sphericalHarmonicCoefficients[0]).toEqualEpsilon(
          new Cartesian3(
            0.1342056840658188,
            0.11958353966474533,
            0.15991388261318207,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.07575193047523499,
            0.11915278434753418,
            0.15629366040229797,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            -0.0011700564064085484,
            -0.0016134318429976702,
            -0.0015525781782343984,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            0.0002928615431301296,
            0.000019326049368828535,
            -0.000023931264877319336,
          ),
          CesiumMath.EPSILON4,
        );

        expect(manager.sphericalHarmonicCoefficients[4].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[5].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[6].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[7].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[8].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].z).toBeLessThan(0.0);
      });

      it("lighting uses ground albedo value", async function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }

        const manager = new DynamicEnvironmentMapManager();
        manager.groundAlbedo = 1.0;

        const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
        manager.position =
          Ellipsoid.WGS84.cartographicToCartesian(cartographic);

        const primitive = new EnvironmentMockPrimitive(manager);
        scene.primitives.add(primitive);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap).toBeInstanceOf(CubeMap);

        scene.renderForSpecs();

        expect(manager.radianceCubeMap.sampler.minificationFilter).toEqual(
          TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
        ); // Has mipmaps for specular maps

        scene.renderForSpecs();
        scene.renderForSpecs();

        expect(manager.sphericalHarmonicCoefficients[0]).toEqualEpsilon(
          new Cartesian3(
            0.15277373790740967,
            0.1812949925661087,
            0.19759616255760193,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.0670194923877716,
            0.09013032913208008,
            0.13857196271419525,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            -0.000953961513005197,
            -0.000895244418643415,
            -0.0011140345595777035,
          ),
          CesiumMath.EPSILON4,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            0.00043638586066663265,
            0.0004962628008797765,
            0.0002673182752914727,
          ),
          CesiumMath.EPSILON4,
        );

        expect(manager.sphericalHarmonicCoefficients[4].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[4].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[5].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[5].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[6].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[6].z).toBeLessThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[7].x).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].y).toBeGreaterThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[7].z).toBeGreaterThan(0.0);

        expect(manager.sphericalHarmonicCoefficients[8].x).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].y).toBeLessThan(0.0);
        expect(manager.sphericalHarmonicCoefficients[8].z).toBeLessThan(0.0);
      });

      it("destroys", function () {
        if (!scene.highDynamicRangeSupported) {
          const manager = new DynamicEnvironmentMapManager();
          const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
          manager.position =
            Ellipsoid.WGS84.cartographicToCartesian(cartographic);

          manager.destroy();

          expect(manager.isDestroyed()).toBe(true);
          return;
        }

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
