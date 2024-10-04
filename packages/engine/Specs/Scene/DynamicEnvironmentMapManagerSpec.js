import {
  Cartesian3,
  Cartographic,
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
  });

  describe(
    "render tests",
    () => {
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
            0.06523053348064423,
            0.05979466438293457,
            0.0529998354613781,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.04532695189118385,
            0.041549697518348694,
            0.03682814538478851,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            -0.00008799877105047926,
            -0.00008066735608736053,
            -0.0000714993875590153,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            0.00010202873090747744,
            0.0000935271818889305,
            0.00008289740071631968,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[4]).toEqualEpsilon(
          new Cartesian3(
            -0.00009219595813192427,
            -0.00008451438043266535,
            -0.0000749136961530894,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[5]).toEqualEpsilon(
          new Cartesian3(
            0.0001692128716968,
            0.00015510580851696432,
            0.00013748645142186433,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[6]).toEqualEpsilon(
          new Cartesian3(
            -0.0015704948455095291,
            -0.0014396164333447814,
            -0.001276025315746665,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[7]).toEqualEpsilon(
          new Cartesian3(
            0.00016435267752967775,
            0.0001506530970800668,
            0.00013354058319237083,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[8]).toEqualEpsilon(
          new Cartesian3(
            -0.0033728459384292364,
            -0.003091774880886078,
            -0.002740437164902687,
          ),
          CesiumMath.EPSILON8,
        );
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
            0.1913730502128601,
            0.18856880068778992,
            0.1829148381948471,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.18569333851337433,
            0.17468932271003723,
            0.15392939746379852,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            0.0002647266665007919,
            0.0005324345547705889,
            0.00041429162956774235,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            0.00006349492468871176,
            0.0001139615778811276,
            0.0005512645002454519,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[4]).toEqualEpsilon(
          new Cartesian3(
            0.0000029016664484515786,
            -0.00009063538163900375,
            -0.0002427138388156891,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[5]).toEqualEpsilon(
          new Cartesian3(
            0.000034130134736187756,
            0.00010999073856510222,
            0.0003878184943459928,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[6]).toEqualEpsilon(
          new Cartesian3(
            -0.02402506396174431,
            -0.02285926602780819,
            -0.01901424303650856,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[7]).toEqualEpsilon(
          new Cartesian3(
            0.0002873279445338994,
            -0.00041351933032274246,
            -0.00081426597898826,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[8]).toEqualEpsilon(
          new Cartesian3(
            -0.041111089289188385,
            -0.039878252893686295,
            -0.03758561238646507,
          ),
          CesiumMath.EPSILON8,
        );
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
            0.28904151916503906,
            0.29026007652282715,
            0.2918507754802704,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.19173532724380493,
            0.1902499794960022,
            0.18829959630966187,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            -0.0001033861844916828,
            -0.0003187881375197321,
            -0.0006105873035266995,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            -0.001120894681662321,
            -0.001286124810576439,
            -0.0014888234436511993,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[4]).toEqualEpsilon(
          new Cartesian3(
            0.001963122747838497,
            0.002203801181167364,
            0.0025080712512135506,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[5]).toEqualEpsilon(
          new Cartesian3(
            -0.0009169516852125525,
            -0.0005937402020208538,
            -0.00015243042435031384,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[6]).toEqualEpsilon(
          new Cartesian3(
            0.011854927986860275,
            0.01167533453553915,
            0.011397579684853554,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[7]).toEqualEpsilon(
          new Cartesian3(
            -0.00027637870516628027,
            0.000005846607564308215,
            0.0003436918486841023,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[8]).toEqualEpsilon(
          new Cartesian3(
            0.0206129290163517,
            0.01992574892938137,
            0.019017385318875313,
          ),
          CesiumMath.EPSILON8,
        );
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

        scene.frameState.time = JulianDate.fromIso8601("2024-08-30T10:45:00Z");
        scene.atmosphere.dynamicLighting =
          DynamicAtmosphereLightingType.SUNLIGHT;

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
            0.02853837050497532,
            0.02582043968141079,
            0.02310248650610447,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.01983053795993328,
            0.017941925674676895,
            0.016053294762969017,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            -0.000038495705666719005,
            -0.00003483447653707117,
            -0.00003116951120318845,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            0.000044636341044679284,
            0.00004038625047542155,
            0.00003613377339206636,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[4]).toEqualEpsilon(
          new Cartesian3(
            -0.0000403355952585116,
            -0.0000364964798791334,
            -0.00003265368286520243,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[5]).toEqualEpsilon(
          new Cartesian3(
            0.00007403152267215773,
            0.00006698021024931222,
            0.00005992865771986544,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[6]).toEqualEpsilon(
          new Cartesian3(
            -0.0006870909128338099,
            -0.0006216531037352979,
            -0.0005562155856750906,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[7]).toEqualEpsilon(
          new Cartesian3(
            0.00007190571341197938,
            0.00006505812052637339,
            0.00005820797377964482,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[8]).toEqualEpsilon(
          new Cartesian3(
            -0.0014756197342649102,
            -0.0013350857188925147,
            -0.00119454984087497,
          ),
          CesiumMath.EPSILON8,
        );
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

        scene.frameState.time = JulianDate.fromIso8601("2024-08-30T10:45:00Z");
        scene.atmosphere.dynamicLighting =
          DynamicAtmosphereLightingType.SUNLIGHT;

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
            0.013825771398842335,
            0.013825771398842335,
            0.01250702515244484,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.012059101834893227,
            0.012059101834893227,
            0.011159422807395458,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            -0.0006122011691331863,
            -0.0006122011691331863,
            -0.0006179579650051892,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            0.000951102701947093,
            0.000951102701947093,
            0.000956061645410955,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[4]).toEqualEpsilon(
          new Cartesian3(
            0.0014495440991595387,
            0.0014495440991595387,
            0.0014628276694566011,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[5]).toEqualEpsilon(
          new Cartesian3(
            -0.0004664847510866821,
            -0.0004664847510866821,
            -0.00047628479660488665,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[6]).toEqualEpsilon(
          new Cartesian3(
            -0.001982730580493808,
            -0.001982730580493808,
            -0.0019600142259150743,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[7]).toEqualEpsilon(
          new Cartesian3(
            0.0015038320561870933,
            0.0015038320561870933,
            0.0015071174129843712,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[8]).toEqualEpsilon(
          new Cartesian3(
            -0.0037360803689807653,
            -0.0037360803689807653,
            -0.0036830452736467123,
          ),
          CesiumMath.EPSILON8,
        );
      });

      it("reflects atmosphere changes", async function () {
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
            0.18242301046848297,
            0.18328580260276794,
            0.19168707728385925,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
          new Cartesian3(
            0.1543591022491455,
            0.16545593738555908,
            0.18549180030822754,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
          new Cartesian3(
            0.00041435391176491976,
            0.0001588515006005764,
            0.0002772088337223977,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
          new Cartesian3(
            0.0005418174550868571,
            0.00013090351421851665,
            0.00007370326056843624,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[4]).toEqualEpsilon(
          new Cartesian3(
            -0.00023424089886248112,
            -0.00013176826178096235,
            -0.000010025119081547018,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[5]).toEqualEpsilon(
          new Cartesian3(
            0.0003725608694367111,
            0.0002618637809064239,
            0.00002000652239075862,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[6]).toEqualEpsilon(
          new Cartesian3(
            -0.01906941831111908,
            -0.022032426670193672,
            -0.023882020264863968,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[7]).toEqualEpsilon(
          new Cartesian3(
            -0.0008425177657045424,
            -0.000518305110745132,
            0.000291515258140862,
          ),
          CesiumMath.EPSILON8,
        );
        expect(manager.sphericalHarmonicCoefficients[8]).toEqualEpsilon(
          new Cartesian3(
            -0.0376509353518486,
            -0.04041081294417381,
            -0.04093915969133377,
          ),
          CesiumMath.EPSILON8,
        );
      });

      // TODO: Ground color

      // TODO: atmosphereScatteringIntensity

      // TODO: gamma

      // TODO: brightness

      // TODO: saturation

      // TODO: Cancelled in progress updates

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
