/**
 * Local Generic Point-cloud Model information about a glTF primitive.
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 */
function MeshPrimitiveGpmLocal(options) {
  this._ppeTextures = options.ppeTextures;
}

Object.defineProperties(MeshPrimitiveGpmLocal.prototype, {
  /**
   * An array of ppe textures.
   *
   * @memberof MeshPrimitiveGpmLocal.prototype
   * @type {PpeTexture[]|undefined}
   * @readonly
   */
  ppeTextures: {
    get: function () {
      return this._ppeTextures;
    },
  },
});

export default MeshPrimitiveGpmLocal;
