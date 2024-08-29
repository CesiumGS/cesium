import {
  Cartesian3,
  Cartographic,
  CubeMap,
  DynamicEnvironmentMapManager,
  Ellipsoid,
  Math as CesiumMath,
  TextureMinificationFilter,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

describe("Scene/DynamicEnvironmentMapManager", function () {
  it("constructs with default values", function () {
    const manager = new DynamicEnvironmentMapManager();

    expect(manager.enabled).toBeTrue();
    expect(manager.shouldUpdate).toBeTrue();
    expect(manager.maximumSecondsDifference).toBe(1800);
    expect(manager.maximumPositionEpsilon).toBe(1.0);
    expect(manager.intensity).toBe(2.0);
    expect(manager.gamma).toBe(1.0);
    expect(manager.brightness).toBe(1.0);
    expect(manager.saturation).toBe(0.8);
    expect(manager.groundColor).toEqual(
      DynamicEnvironmentMapManager.AVERAGE_EARTH_GROUND_COLOR
    );
  });

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
        TextureMinificationFilter.LINEAR_MIPMAP_LINEAR
      ); // Has mipmaps for specular maps

      scene.renderForSpecs();
      scene.renderForSpecs();

      expect(manager.sphericalHarmonicCoefficients[0]).toEqualEpsilon(
        new Cartesian3(
          0.053100451827049255,
          0.04867539182305336,
          0.044250354170799255
        ),
        CesiumMath.EPSILON10
      );
      expect(manager.sphericalHarmonicCoefficients[1]).toEqualEpsilon(
        new Cartesian3(
          -0.000003905613084498327,
          -0.0000035801476769847795,
          -0.000003254721377743408
        ),
        CesiumMath.EPSILON10
      );
      expect(manager.sphericalHarmonicCoefficients[2]).toEqualEpsilon(
        new Cartesian3(
          0.00017963179561775178,
          0.00016466582019347697,
          0.0001496950426371768
        ),
        CesiumMath.EPSILON10
      );
      expect(manager.sphericalHarmonicCoefficients[3]).toEqualEpsilon(
        new Cartesian3(
          8.134770723700058e-7,
          7.457201718352735e-7,
          6.778961960662855e-7
        ),
        CesiumMath.EPSILON10
      );
      expect(manager.sphericalHarmonicCoefficients[4]).toEqualEpsilon(
        new Cartesian3(
          4.6561240196751896e-7,
          4.2675026179495035e-7,
          3.8801061919002677e-7
        ),
        CesiumMath.EPSILON10
      );
      expect(manager.sphericalHarmonicCoefficients[5]).toEqualEpsilon(
        new Cartesian3(
          0.000003929037120542489,
          0.0000036015753721585497,
          0.000003274168193456717
        ),
        CesiumMath.EPSILON10
      );
      expect(manager.sphericalHarmonicCoefficients[6]).toEqualEpsilon(
        new Cartesian3(
          4.5649358071386814e-7,
          4.125613486394286e-7,
          3.8555299397557974e-7
        ),
        CesiumMath.EPSILON10
      );
      expect(manager.sphericalHarmonicCoefficients[7]).toEqualEpsilon(
        new Cartesian3(
          0.000018523491235100664,
          0.00001697988591331523,
          0.000015436209650943056
        ),
        CesiumMath.EPSILON10
      );
      expect(manager.sphericalHarmonicCoefficients[8]).toEqualEpsilon(
        new Cartesian3(
          0.000001001867417471658,
          9.18394675863965e-7,
          8.348785058842623e-7
        ),
        CesiumMath.EPSILON10
      );
    });

    // TODO: elevations

    // TODO: Dynamic light

    // TODO: Sydney

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
