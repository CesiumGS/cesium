import { defaultValue, Ellipsoid, Event } from "@cesium/engine";

function createGlobe(ellipsoid) {
  ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

  const globe = {
    callback: undefined,
    removedCallback: false,
    ellipsoid: ellipsoid,
    beginFrame: function () {},
    endFrame: function () {},
    update: function () {},
    render: function () {},
    getHeight: function () {
      return 0.0;
    },
    _surface: {},
    imageryLayersUpdatedEvent: new Event(),
    _terrainProvider: undefined,
    terrainProviderChanged: new Event(),
    destroy: function () {},
  };

  globe._surface.updateHeight = function (position, callback) {
    globe.callback = callback;
    return function () {
      globe.removedCallback = true;
      globe.callback = undefined;
    };
  };

  globe.terrainProviderChanged = new Event();
  Object.defineProperties(globe, {
    terrainProvider: {
      get: function () {
        return this._terrainProvider;
      },
      set: function (value) {
        this._terrainProvider = value;
        this.terrainProviderChanged.raiseEvent(value);
      },
    },
  });

  return globe;
}
export default createGlobe;
