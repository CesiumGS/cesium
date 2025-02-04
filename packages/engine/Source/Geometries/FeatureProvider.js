// Generic interface for loading feature data
// TODO: Implement a GeoJSON feature provider

import FeatureLayer from "./FeatureLayer";

class FeatureProvider {
  // TODO
  createLayer({ name }) {
    return new FeatureLayer({ name });
  }
}

export default FeatureProvider;
