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

  // TODO: Mipmap/resolution

  // TODO: OWnership

  describe("render tests", () => {
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
      const manager = new DynamicEnvironmentMapManager();

      const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
      manager.position = Ellipsoid.WGS84.cartographicToCartesian(cartographic);

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
          0.053100451827049255,
          0.04867539182305336,
          0.044250354170799255,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
        new Cartesian3(
          -0.000003905613084498327,
          -0.0000035801476769847795,
          -0.000003254721377743408,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
        new Cartesian3(
          0.00017963179561775178,
          0.00016466582019347697,
          0.0001496950426371768,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
        new Cartesian3(
          8.134770723700058e-7,
          7.457201718352735e-7,
          6.778961960662855e-7,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[4]).toEqualEpsilon(
        new Cartesian3(
          4.6561240196751896e-7,
          4.2675026179495035e-7,
          3.8801061919002677e-7,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[5]).toEqualEpsilon(
        new Cartesian3(
          0.000003929037120542489,
          0.0000036015753721585497,
          0.000003274168193456717,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[6]).toEqualEpsilon(
        new Cartesian3(
          4.5649358071386814e-7,
          4.125613486394286e-7,
          3.8555299397557974e-7,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[7]).toEqualEpsilon(
        new Cartesian3(
          0.000018523491235100664,
          0.00001697988591331523,
          0.000015436209650943056,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[8]).toEqualEpsilon(
        new Cartesian3(
          0.000001001867417471658,
          9.18394675863965e-7,
          8.348785058842623e-7,
        ),
        CesiumMath.EPSILON8,
      );
    });

    it("creates environment map and spherical harmonics at altitude in Philadelphia with static lighting", async function () {
      const manager = new DynamicEnvironmentMapManager();

      const cartographic = Cartographic.fromDegrees(
        -75.165222,
        39.952583,
        20000.0,
      );
      manager.position = Ellipsoid.WGS84.cartographicToCartesian(cartographic);

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
          0.1009233146905899,
          0.10943963378667831,
          0.12368400394916534,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
        new Cartesian3(
          0.05498318374156952,
          0.044787511229515076,
          0.026188815012574196,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
        new Cartesian3(
          0.000607481284532696,
          0.00047677505062893033,
          0.0003103993949480355,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
        new Cartesian3(
          -0.00002178461909352336,
          -0.00000523854259881773,
          0.000022690264813718386,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[4]).toEqualEpsilon(
        new Cartesian3(
          -0.00001488747147959657,
          -0.000008339899068232626,
          -0.0000022421534140448784,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[5]).toEqualEpsilon(
        new Cartesian3(
          -0.000022197265934664756,
          0.000015122794138733298,
          0.000003064520569751039,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[6]).toEqualEpsilon(
        new Cartesian3(
          0.0006848506745882332,
          -0.0006184031954035163,
          -0.0032658539712429047,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[7]).toEqualEpsilon(
        new Cartesian3(
          0.00004173172055743635,
          -0.0002229579840786755,
          -0.00031301588751375675,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[8]).toEqualEpsilon(
        new Cartesian3(
          -0.001145384507253766,
          0.0002962825819849968,
          0.0040063755586743355,
        ),
        CesiumMath.EPSILON8,
      );
    });

    it("creates environment map and spherical harmonics above Earth's atmosphere with static lighting", async function () {
      const manager = new DynamicEnvironmentMapManager();

      const cartographic = Cartographic.fromDegrees(
        -75.165222,
        39.952583,
        1000000.0,
      );
      manager.position = Ellipsoid.WGS84.cartographicToCartesian(cartographic);

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
          0.20291849970817566,
          0.21098950505256653,
          0.2223447859287262,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
        new Cartesian3(
          0.03659752011299133,
          0.02856328710913658,
          0.01719149760901928,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
        new Cartesian3(
          0.0009044585167430341,
          0.0010656686499714851,
          0.0012444753665477037,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
        new Cartesian3(
          -0.0011628743959590793,
          -0.0011680441675707698,
          -0.0011507802410051227,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[4]).toEqualEpsilon(
        new Cartesian3(
          -0.00019400268502067775,
          -0.0002006645518122241,
          -0.00017666186613496393,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[5]).toEqualEpsilon(
        new Cartesian3(
          -0.00040162945515476167,
          -0.0005506023298949003,
          -0.0007173771737143397,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[6]).toEqualEpsilon(
        new Cartesian3(
          0.031479597091674805,
          0.02691546082496643,
          0.020333565771579742,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[7]).toEqualEpsilon(
        new Cartesian3(
          -0.0002572553639765829,
          -0.0002495200315024704,
          -0.0002257294545415789,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[8]).toEqualEpsilon(
        new Cartesian3(
          -0.03815876692533493,
          -0.032493289560079575,
          -0.024339288473129272,
        ),
        CesiumMath.EPSILON8,
      );
    });

    it("creates environment map and spherical harmonics at surface in Philadelphia with dynamic lighting", async function () {
      const manager = new DynamicEnvironmentMapManager();

      const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
      manager.position = Ellipsoid.WGS84.cartographicToCartesian(cartographic);

      const primitive = new EnvironmentMockPrimitive(manager);
      scene.primitives.add(primitive);

      scene.frameState.time = JulianDate.fromIso8601("2024-08-30T10:45:00Z");
      scene.atmosphere.dynamicLighting = DynamicAtmosphereLightingType.SUNLIGHT;

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
          0.03429396450519562,
          0.032081544399261475,
          0.028762752190232277,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
        new Cartesian3(
          -0.0000025223789634765126,
          -0.0000023597081053594593,
          -0.0000021155233298486564,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
        new Cartesian3(
          0.00011601427104324102,
          0.0001085287585738115,
          0.00009730226884130388,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
        new Cartesian3(
          5.25413724972168e-7,
          4.91490709464415e-7,
          4.4070020521758124e-7,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[4]).toEqualEpsilon(
        new Cartesian3(
          3.0070265211179503e-7,
          2.81280051694921e-7,
          2.522050408515497e-7,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[5]).toEqualEpsilon(
        new Cartesian3(
          0.0000025374474716954865,
          0.000002373756615270395,
          0.0000021282285160850734,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[6]).toEqualEpsilon(
        new Cartesian3(
          2.865272108465433e-7,
          2.738524926826358e-7,
          2.469751052558422e-7,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[7]).toEqualEpsilon(
        new Cartesian3(
          0.00001196307857753709,
          0.000011191226803930476,
          0.000010033609214588068,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[8]).toEqualEpsilon(
        new Cartesian3(
          6.47090530492278e-7,
          6.05321702096262e-7,
          5.426667257779627e-7,
        ),
        CesiumMath.EPSILON8,
      );
    });

    it("creates environment map and spherical harmonics at surface in Sydney with dynamic lighting", async function () {
      const manager = new DynamicEnvironmentMapManager();

      const cartographic = Cartographic.fromDegrees(151.2099, -33.865143);
      manager.position = Ellipsoid.WGS84.cartographicToCartesian(cartographic);

      const primitive = new EnvironmentMockPrimitive(manager);
      scene.primitives.add(primitive);

      scene.frameState.time = JulianDate.fromIso8601("2024-08-30T10:45:00Z");
      scene.atmosphere.dynamicLighting = DynamicAtmosphereLightingType.SUNLIGHT;

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
          0.009373737499117851,
          0.009373737499117851,
          0.008282523602247238,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
        new Cartesian3(
          0.001393672777339816,
          0.001393672777339816,
          0.0014051483012735844,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
        new Cartesian3(
          -0.0005047473823651671,
          -0.0005047473823651671,
          -0.0005102163995616138,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
        new Cartesian3(
          -0.00009009439963847399,
          -0.00009009439963847399,
          -0.00009034635149873793,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[4]).toEqualEpsilon(
        new Cartesian3(
          0.00015939869626890868,
          0.00015939869626890868,
          0.00016029566177166998,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[5]).toEqualEpsilon(
        new Cartesian3(
          -0.000621203682385385,
          -0.000621203682385385,
          -0.0006253988831304014,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[6]).toEqualEpsilon(
        new Cartesian3(
          -0.0005390251171775162,
          -0.0005390251171775162,
          -0.0005395518383011222,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[7]).toEqualEpsilon(
        new Cartesian3(
          0.00032644663588143885,
          0.00032644663588143885,
          0.0003294381021987647,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[8]).toEqualEpsilon(
        new Cartesian3(
          0.0007399972528219223,
          0.0007399972528219223,
          0.0007447657408192754,
        ),
        CesiumMath.EPSILON8,
      );
    });

    it("reflects atmosphere changes", async function () {
      const manager = new DynamicEnvironmentMapManager();

      const cartographic = Cartographic.fromDegrees(
        -75.165222,
        39.952583,
        20000.0,
      );
      manager.position = Ellipsoid.WGS84.cartographicToCartesian(cartographic);

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
          0.10372506082057953,
          0.11203387379646301,
          0.12661541998386383,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
        new Cartesian3(
          0.05498318374156952,
          0.044787511229515076,
          0.026188815012574196,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
        new Cartesian3(
          0.000607481284532696,
          0.00047677505062893033,
          0.0003103993949480355,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
        new Cartesian3(
          -0.00002178461909352336,
          -0.00000523854259881773,
          0.000022690264813718386,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[4]).toEqualEpsilon(
        new Cartesian3(
          -0.00001488747147959657,
          -0.000008339899068232626,
          -0.0000022421534140448784,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[5]).toEqualEpsilon(
        new Cartesian3(
          -0.000022197265934664756,
          0.000015122794138733298,
          0.000003064520569751039,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[6]).toEqualEpsilon(
        new Cartesian3(
          0.0006848506745882332,
          -0.0006184031954035163,
          -0.0032658539712429047,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[7]).toEqualEpsilon(
        new Cartesian3(
          0.00004173172055743635,
          -0.0002229579840786755,
          -0.00031301588751375675,
        ),
        CesiumMath.EPSILON8,
      );
      expect(manager.sphericalHarmonicCoefficients[8]).toEqualEpsilon(
        new Cartesian3(
          -0.001145384507253766,
          0.0002962825819849968,
          0.0040063755586743355,
        ),
        CesiumMath.EPSILON8,
      );
    });

    // TODO: Ground color

    // TODO: atmosphereScatteringIntensity

    // TODO: gamma

    // TODO: brightness

    // TODO: satursation

    // TODO: Cancelled in progress updates

    it("destroys", function () {
      const manager = new DynamicEnvironmentMapManager();
      const cartographic = Cartographic.fromDegrees(-75.165222, 39.952583);
      manager.position = Ellipsoid.WGS84.cartographicToCartesian(cartographic);

      const primitive = new EnvironmentMockPrimitive(manager);
      scene.primitives.add(primitive);

      scene.renderForSpecs();
      scene.renderForSpecs();
      scene.renderForSpecs();
      scene.renderForSpecs();

      manager.destroy();

      expect(manager.isDestroyed()).toBe(true);
    });
  });
});
