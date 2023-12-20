import Cartesian3 from "../Core/Cartesian3";
import DynamicAtmosphereLightingType from "./DynamicAtmosphereLightingType";

function Atmosphere() {
  /**
   * The intensity of the light that is used for computing the ground atmosphere color.
   *
   * @type {number}
   * @default 10.0
   */
  this.lightIntensity = 10.0;

  /**
   * The Rayleigh scattering coefficient used in the atmospheric scattering equations for the ground atmosphere.
   *
   * @type {Cartesian3}
   * @default Cartesian3(5.5e-6, 13.0e-6, 28.4e-6)
   */
  this.rayleighCoefficient = new Cartesian3(5.5e-6, 13.0e-6, 28.4e-6);

  /**
   * The Mie scattering coefficient used in the atmospheric scattering equations for the ground atmosphere.
   *
   * @type {Cartesian3}
   * @default Cartesian3(21e-6, 21e-6, 21e-6)
   */
  this.mieCoefficient = new Cartesian3(21e-6, 21e-6, 21e-6);

  /**
   * The Rayleigh scale height used in the atmospheric scattering equations for the ground atmosphere, in meters.
   *
   * @type {number}
   * @default 10000.0
   */
  this.rayleighScaleHeight = 10000.0;

  /**
   * The Mie scale height used in the atmospheric scattering equations for the ground atmosphere, in meters.
   *
   * @type {number}
   * @default 3200.0
   */
  this.mieScaleHeight = 3200.0;

  /**
   * The anisotropy of the medium to consider for Mie scattering.
   * <p>
   * Valid values are between -1.0 and 1.0.
   * </p>
   *
   * @type {number}
   * @default 0.9
   */
  this.mieAnisotropy = 0.9;

  /**
   * The hue shift to apply to the atmosphere. Defaults to 0.0 (no shift).
   * A hue shift of 1.0 indicates a complete rotation of the hues available.
   *
   * @type {number}
   * @default 0.0
   */
  this.hueShift = 0.0;

  /**
   * The saturation shift to apply to the atmosphere. Defaults to 0.0 (no shift).
   * A saturation shift of -1.0 is monochrome.
   *
   * @type {number}
   * @default 0.0
   */
  this.saturationShift = 0.0;

  /**
   * The brightness shift to apply to the atmosphere. Defaults to 0.0 (no shift).
   * A brightness shift of -1.0 is complete darkness, which will let space show through.
   *
   * @type {number}
   * @default 0.0
   */
  this.brightnessShift = 0.0;

  /**
   * When not DynamicAtmosphereLightingType.OFF, the selected light source will
   * be used for dynamically lighting all atmosphere-related rendering effects.
   *
   * @type {DynamicAtmosphereLightingType}
   * @default DynamicAtmosphereLightingType.OFF
   */
  this.dynamicLighting = DynamicAtmosphereLightingType.OFF;
}

Atmosphere.prototype.update = function (frameState) {
  const atmosphere = frameState.atmosphere;
  atmosphere.hsbShift.x = this.hueShift;
  atmosphere.hsbShift.y = this.saturationShift;
  atmosphere.hsbShift.z = this.brightnessShift;
  atmosphere.lightIntensity = this.lightIntensity;
  atmosphere.rayleighCoefficient = Cartesian3.clone(
    this.rayleighCoefficient,
    atmosphere.rayleighCoefficient
  );
  atmosphere.rayleighScaleHeight = this.rayleighScaleHeight;
  atmosphere.mieCoefficient = Cartesian3.clone(
    this.mieCoefficient,
    atmosphere.mieCoefficient
  );
  atmosphere.mieScaleHeight = this.mieScaleHeight;
  atmosphere.mieAnisotropy = this.mieAnisotropy;

  atmosphere.dynamicLighting = this.dynamicLighting;
};

export default Atmosphere;
