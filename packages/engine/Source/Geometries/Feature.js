import createGuid from "../Core/createGuid";

class Feature {
  constructor({ id, geometry }) {
    this._id = id ?? createGuid();
    this._geometry = geometry;
    this._metadata = {};

    // TODO: Does styling live here?
  }

  // TODO
  get id() {
    return this._id;
  }

  /**
   * Gets the geometry for this feature
   * @type {FeatureGeometry}
   * @readonly
   */
  get geometry() {
    return this._geometry;
  }

  // TODO
  get metadata() {
    return this._metadata;
  }
}

export default Feature;
